import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { verifyAccessToken } from './route-auth.tsx';
import * as db from './db.tsx';

const migrationRoutes = new Hono();

const getUserIdFromToken = async (accessToken: string | null): Promise<string | null> => {
  return verifyAccessToken(accessToken);
};

// POST /admin/migrate-kv-to-postgres
// Migrates all KV bookings and payments to Postgres. Safe to run multiple times (upsert).
migrationRoutes.post('/admin/migrate-kv-to-postgres', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const userId = await getUserIdFromToken(accessToken);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const adminUser = await kv.get(`user:${userId}`);
  if (!adminUser || adminUser.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const results = { bookingsMigrated: 0, bookingsSkipped: 0, paymentsMigrated: 0, paymentsSkipped: 0, errors: [] as string[] };

  // --- Migrate bookings ---
  try {
    const kvBookings = await kv.getByPrefix('booking:');
    for (const b of kvBookings) {
      try {
        if (!b.id) continue;
        // Try to create — if it already exists (duplicate key), skip.
        // bookingsMigrated only increments on genuine success — it used to
        // run unconditionally right after this await, double-counting rows
        // that were actually skipped (duplicate) or errored.
        let created = false;
        await db.createBooking({
          id: b.id,
          paymentId: b.paymentId || b.payment_id || '',
          planType: b.planType || b.plan_type || 'single',
          sessionNumber: b.sessionNumber || 1,
          totalSessions: b.totalSessions || 1,
          tutorId: b.tutorId || b.tutor_id || '',
          studentId: b.studentId || b.student_id || b.userId || '',
          userId: b.userId || b.parentId || '',
          date: b.date || b.sessionDate || '',
          startTime: b.startTime || b.time || '00:00',
          endTime: b.endTime || '00:00',
          duration: b.duration || 60,
          subject: b.subject || null,
          status: b.status || 'scheduled',
          paymentStatus: b.paymentStatus || b.payment_status || 'pending',
          meetLink: b.googleMeetLink || b.meetLink || undefined,
        }).then(() => {
          created = true;
        }).catch((e: any) => {
          // Duplicate — already migrated
          if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
            results.bookingsSkipped++;
          } else {
            results.errors.push(`booking ${b.id}: ${e.message}`);
          }
        });
        if (created) results.bookingsMigrated++;
      } catch (e: any) {
        results.errors.push(`booking ${b.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`KV bookings scan: ${e.message}`);
  }

  // --- Migrate payments ---
  try {
    const kvPayments = await kv.getByPrefix('payment:');
    for (const p of kvPayments) {
      try {
        if (!p.id || !p.reference) continue;
        let created = false;
        await db.createPayment({
          id: p.id,
          userId: p.userId || p.user_id || '',
          tutorId: p.tutorId || p.tutor_id || '',
          studentId: p.studentId || p.student_id || '',
          planType: p.planType || p.plan_type || 'single',
          amount: Number(p.amount) || 0,
          reference: p.reference,
          startDate: p.startDate || p.date || new Date().toISOString().slice(0, 10),
          startTime: p.startTime || p.time || '00:00',
          subject: p.subject || null,
          status: p.status || 'pending',
        }).then(() => {
          created = true;
        }).catch((e: any) => {
          if (e.message?.includes('duplicate') || e.message?.includes('unique')) {
            results.paymentsSkipped++;
          } else {
            results.errors.push(`payment ${p.id}: ${e.message}`);
          }
        });
        if (created) results.paymentsMigrated++;
      } catch (e: any) {
        results.errors.push(`payment ${p.id}: ${e.message}`);
      }
    }
  } catch (e: any) {
    results.errors.push(`KV payments scan: ${e.message}`);
  }

  return c.json({ success: true, results });
});

// POST /admin/backfill-conversation-indices
// One-time backfill for the conv-index:<userId> / conv-messages-index:<conversationId>
// secondary indices added to conversations-routes.tsx to replace its full
// kv.getByPrefix('conversation:')/kv.getByPrefix('conv-message:') scans (see
// that file's comment for why — those scans ran on every 8s/30s Chatroom
// poll, platform-wide, regardless of any one user's actual conversation
// count). Every conversation/message created AFTER that fix maintains its
// own index automatically; this backfills everything created before it.
// Safe to run more than once — fully recomputes each conversation's
// lastMessage/unreadCounts/indices from its actual message set rather than
// incrementally adjusting anything.
migrationRoutes.post('/admin/backfill-conversation-indices', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const userId = await getUserIdFromToken(accessToken);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const adminUser = await kv.get(`user:${userId}`);
  if (!adminUser || adminUser.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const results = { conversationsProcessed: 0, messagesProcessed: 0, participantIndexEntries: 0, errors: [] as string[] };

  try {
    const [allConversations, allMessages] = await Promise.all([
      kv.getByPrefix('conversation:'),
      kv.getByPrefix('conv-message:'),
    ]);

    const messagesByConversation = new Map<string, any[]>();
    for (const msg of allMessages as any[]) {
      const list = messagesByConversation.get(msg.conversationId) ?? [];
      list.push(msg);
      messagesByConversation.set(msg.conversationId, list);
    }

    const participantIndex = new Map<string, Set<string>>();
    const conversationWrites: { key: string; value: any }[] = [];
    const messageIndexWrites: { key: string; value: string[] }[] = [];

    for (const conv of allConversations as any[]) {
      const convId = conv.id as string;
      const messages = (messagesByConversation.get(convId) ?? []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      const unreadCounts: Record<string, number> = {};
      for (const msg of messages) {
        if (!msg.read && msg.receiverId) {
          unreadCounts[msg.receiverId] = (unreadCounts[msg.receiverId] ?? 0) + 1;
        }
      }
      const last = messages[messages.length - 1];

      conversationWrites.push({
        key: convId,
        value: {
          ...conv,
          lastMessage: last
            ? { id: last.id, senderId: last.senderId, content: last.content, createdAt: last.createdAt, read: last.read }
            : conv.lastMessage ?? null,
          unreadCounts,
        },
      });

      if (messages.length) {
        messageIndexWrites.push({ key: `conv-messages-index:${convId}`, value: messages.map((m) => m.id) });
      }

      for (const pid of (conv.participants as string[] | undefined) ?? []) {
        if (!participantIndex.has(pid)) participantIndex.set(pid, new Set());
        participantIndex.get(pid)!.add(convId);
      }

      results.conversationsProcessed++;
      results.messagesProcessed += messages.length;
    }

    // Merge with any conv-index entries already written since the fix went
    // live (e.g. a brand-new conversation created between deploy and this
    // backfill running) rather than overwriting them.
    const participantIds = [...participantIndex.keys()];
    const existingParticipantIndices = participantIds.length ? await kv.mget(participantIds.map((id) => `conv-index:${id}`)) : [];
    const participantIndexWrites = participantIds.map((pid, i) => {
      const existing = (existingParticipantIndices[i] as string[] | undefined) ?? [];
      const merged = new Set([...existing, ...(participantIndex.get(pid) ?? [])]);
      return { key: `conv-index:${pid}`, value: [...merged] };
    });
    results.participantIndexEntries = participantIndexWrites.length;

    const allWrites = [...conversationWrites, ...messageIndexWrites, ...participantIndexWrites];
    // Batch in chunks — mset's upsert is one statement per call, but a single
    // call with thousands of rows is its own kind of risk; keep each call
    // to a reasonable size.
    const CHUNK = 200;
    for (let i = 0; i < allWrites.length; i += CHUNK) {
      const chunk = allWrites.slice(i, i + CHUNK);
      await kv.mset(chunk.map((w) => w.key), chunk.map((w) => w.value));
    }
  } catch (e: any) {
    results.errors.push(e.message);
  }

  return c.json({ success: true, results });
});

// POST /admin/backfill-booking-index
// One-time backfill for booking-index:<personId>, replacing
// notifications-routes.tsx's kv.getByPrefix('booking:') full scan (used to
// build upcoming-session reminders) with a targeted per-person lookup.
// Safe/idempotent to run more than once. No live write path creates a new
// kv-native booking any more (POST /bookings is a disabled stub — real
// bookings go through db.createBooking via confirmPlanPayment, already
// indexed on the Postgres side), so unlike conversations/notifications this
// index never needs incremental maintenance after this one backfill —
// existing KV bookings are a fixed legacy set, not a growing one.
migrationRoutes.post('/admin/backfill-booking-index', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const userId = await getUserIdFromToken(accessToken);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const adminUser = await kv.get(`user:${userId}`);
  if (!adminUser || adminUser.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const results = { bookingsProcessed: 0, personIndexEntries: 0, errors: [] as string[] };

  try {
    const allBookings = await kv.getByPrefix('booking:');
    const personIndex = new Map<string, Set<string>>();

    for (const booking of allBookings as any[]) {
      if (!booking?.id) continue;
      for (const personId of [booking.tutorId, booking.studentId, booking.parentId, booking.userId]) {
        if (!personId) continue;
        if (!personIndex.has(personId)) personIndex.set(personId, new Set());
        personIndex.get(personId)!.add(booking.id);
      }
      results.bookingsProcessed++;
    }

    const personIds = [...personIndex.keys()];
    const existingIndices = personIds.length ? await kv.mget(personIds.map((id) => `booking-index:${id}`)) : [];
    const writes = personIds.map((pid, i) => {
      const existing = (existingIndices[i] as string[] | undefined) ?? [];
      const merged = new Set([...existing, ...(personIndex.get(pid) ?? [])]);
      return { key: `booking-index:${pid}`, value: [...merged] };
    });
    results.personIndexEntries = writes.length;

    const CHUNK = 200;
    for (let i = 0; i < writes.length; i += CHUNK) {
      const chunk = writes.slice(i, i + CHUNK);
      await kv.mset(chunk.map((w) => w.key), chunk.map((w) => w.value));
    }
  } catch (e: any) {
    results.errors.push(e.message);
  }

  return c.json({ success: true, results });
});

// POST /admin/backfill-notification-index
// One-time backfill for user_notifications:<userId>, notification-broker.tsx's
// index that GET /notifications/:userId and POST /notifications/:userId/
// read-all now read from instead of kv.getByPrefix('notification:') across
// the whole platform (that endpoint is polled every 30 seconds from every
// dashboard). Every notification-creation call site in the codebase (14 of
// them, across 9 files, as of 2026-09-10) now goes through
// notification-broker.tsx's createNotification, which already maintains
// this index going forward — this backfill only needs to cover
// notifications created before that migration. Safe/idempotent to run more
// than once; merges with anything already indexed rather than overwriting.
migrationRoutes.post('/admin/backfill-notification-index', async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const userId = await getUserIdFromToken(accessToken);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const adminUser = await kv.get(`user:${userId}`);
  if (!adminUser || adminUser.role !== 'admin') return c.json({ error: 'Admin only' }, 403);

  const results = { notificationsProcessed: 0, userIndexEntries: 0, errors: [] as string[] };

  try {
    const allNotifications = await kv.getByPrefix('notification:');
    const userIndex = new Map<string, Set<string>>();

    for (const n of allNotifications as any[]) {
      if (!n?.id || !n?.userId) continue;
      if (!userIndex.has(n.userId)) userIndex.set(n.userId, new Set());
      userIndex.get(n.userId)!.add(n.id);
      results.notificationsProcessed++;
    }

    const userIds = [...userIndex.keys()];
    const existingIndices = userIds.length ? await kv.mget(userIds.map((id) => `user_notifications:${id}`)) : [];
    const writes = userIds.map((uid, i) => {
      const existing = (existingIndices[i] as string[] | undefined) ?? [];
      const merged = new Set([...existing, ...(userIndex.get(uid) ?? [])]);
      return { key: `user_notifications:${uid}`, value: [...merged] };
    });
    results.userIndexEntries = writes.length;

    const CHUNK = 200;
    for (let i = 0; i < writes.length; i += CHUNK) {
      const chunk = writes.slice(i, i + CHUNK);
      await kv.mset(chunk.map((w) => w.key), chunk.map((w) => w.value));
    }
  } catch (e: any) {
    results.errors.push(e.message);
  }

  return c.json({ success: true, results });
});

export default migrationRoutes;
