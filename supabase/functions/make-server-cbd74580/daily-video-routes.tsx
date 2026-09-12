/**
 * Daily.co video rooms + cloud recording — replaces the Google Meet/Jitsi
 * link. One room per plan (all weekly sessions reuse it, same as before);
 * each session a participant joins produces its own separate recording.
 *
 * Recording is triggered by the TUTOR's join token (start_cloud_recording),
 * not by anyone clicking a button — matching how MyTutor/Tutorful record by
 * default rather than opt-in per session (see the safeguarding research this
 * was built from). Parents/students get a plain, non-recording-triggering
 * token to the same room.
 */
import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { logAuditEvent } from './activity-log.tsx';

const app = new Hono();

const DAILY_API_BASE = 'https://api.daily.co/v1';

// How long a finished recording stays available before an admin has to act.
// Not indefinite by design — NDPA/GDPR both treat indefinite retention of a
// minor's data as a red flag. Enforced lazily (no cron here) whenever the
// admin recordings list is fetched, same pattern as releaseMaturedEarnings
// in payment-routes.tsx.
const RECORDING_RETENTION_DAYS = 365;

function dailyHeaders(): Record<string, string> {
  const key = Deno.env.get('DAILY_API_KEY') ?? '';
  return { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

/**
 * Creates one Daily room for an entire plan (mirrors the old "one Jitsi link
 * shared across all sessions" behaviour). Private — every participant needs
 * a meeting token to join, not just anyone who guesses the URL. Returns the
 * room's join URL, stored on bookings exactly like the old meetLink was.
 */
export async function createDailyRoom(paymentId: string, expiresAt: Date): Promise<string | null> {
  const apiKey = Deno.env.get('DAILY_API_KEY');
  if (!apiKey) {
    console.warn('DAILY_API_KEY not set — cannot create Daily room');
    return null;
  }

  // paymentId (a crypto.randomUUID()) is already globally unique on its own —
  // no need to also append a timestamp for uniqueness.
  const name = `kfa-${paymentId}`.toLowerCase();

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: 'POST',
    headers: dailyHeaders(),
    body: JSON.stringify({
      name,
      privacy: 'private',
      properties: {
        enable_recording: 'cloud',
        exp: Math.floor(expiresAt.getTime() / 1000),
        eject_at_room_exp: true,
      },
    }),
  });

  if (!res.ok) {
    console.error('Daily room creation failed:', await res.text());
    return null;
  }
  const data = await res.json() as any;
  if (!data.url) return null;

  // Explicit mapping, not something the webhook has to parse back out of the
  // room name string later — see the webhook handler below.
  await kv.set(`daily_room:${name}`, { paymentId, createdAt: new Date().toISOString() });

  return data.url;
}

function extractRoomName(meetLink: string): string | null {
  // https://<domain>.daily.co/<room-name>[?...]
  const match = meetLink.match(/daily\.co\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * A short-lived, per-join credential — not a long-lived password. The tutor's
 * token is the one that actually starts recording; everyone else just joins.
 */
async function createMeetingToken(
  roomName: string,
  opts: { userName: string; isOwner: boolean; startRecording: boolean },
): Promise<string | null> {
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: 'POST',
    headers: dailyHeaders(),
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: opts.userName,
        is_owner: opts.isOwner,
        enable_recording: opts.startRecording ? 'cloud' : undefined,
        start_cloud_recording: opts.startRecording,
        exp: Math.floor(Date.now() / 1000) + 2 * 60 * 60, // 2 hours — one session's worth
      },
    }),
  });
  if (!res.ok) {
    console.error('Daily meeting token creation failed:', await res.text());
    return null;
  }
  const data = await res.json() as any;
  return data.token ?? null;
}

export default function dailyVideoRoutes(mainApp: Hono, getUserId: (token: string | null) => Promise<string | null>) {
  // ── Join a session: returns a fresh, short-lived room URL for this user ───
  app.post('/make-server-cbd74580/sessions/:bookingId/join-token', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);

      const bookingId = c.req.param('bookingId');
      const booking = await db.getBooking(bookingId);
      if (!booking) return c.json({ error: 'Booking not found' }, 404);

      const isTutor = booking.tutorId === userId;
      const isStudent = booking.studentId === userId;
      const isParent = booking.userId === userId;
      if (!isTutor && !isStudent && !isParent) {
        return c.json({ error: 'You are not part of this session' }, 403);
      }

      if (!booking.meetLink) return c.json({ error: 'No video room set up for this session yet' }, 400);
      const roomName = extractRoomName(booking.meetLink);
      if (!roomName) return c.json({ error: 'Invalid room link on this booking' }, 500);

      const profile = (await kv.get(`user:${userId}`) as any) ?? (await db.getProfile(userId));
      const userName =
        profile?.fullName || profile?.full_name || profile?.name ||
        (profile?.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : null) ||
        'Participant';

      const token = await createMeetingToken(roomName, {
        userName,
        isOwner: isTutor,
        // Recording is tied to the tutor's join, not a button anyone has to
        // remember to press — see the module comment above.
        startRecording: isTutor,
      });
      if (!token) return c.json({ error: 'Could not create a join link. Please try again.' }, 502);

      return c.json({ roomUrl: `${booking.meetLink}?t=${token}`, recorded: true });
    } catch (error: any) {
      console.error('Error creating session join token:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // ── Webhook: Daily tells us when a recording has finished processing ──────
  app.post('/make-server-cbd74580/daily/webhook', async (c) => {
    try {
      const rawBody = await c.req.text();
      const timestamp = c.req.header('X-Webhook-Timestamp');
      const signature = c.req.header('X-Webhook-Signature');
      const hmacSecret = (await kv.get('daily_webhook_hmac')) as string | null;

      if (hmacSecret && timestamp && signature) {
        const keyBytes = Uint8Array.from(atob(hmacSecret), (ch) => ch.charCodeAt(0));
        const key = await crypto.subtle.importKey(
          'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
        );
        const signed = await crypto.subtle.sign(
          'HMAC', key, new TextEncoder().encode(`${timestamp}.${rawBody}`),
        );
        const computed = btoa(String.fromCharCode(...new Uint8Array(signed)));
        if (computed !== signature) {
          console.warn('Daily webhook: signature mismatch, rejecting');
          return c.json({ error: 'Invalid signature' }, 401);
        }
      } else {
        // No secret on file yet (webhook not fully set up) — accept but log,
        // rather than silently losing recordings while that's sorted out.
        console.warn('Daily webhook: no HMAC secret on file, accepting unverified');
      }

      const event = JSON.parse(rawBody) as any;
      if (event.type !== 'recording.ready-to-download') {
        return c.json({ received: true });
      }

      // Daily's own GET /recordings/:id response doesn't reliably include
      // room_name (confirmed against their docs) — but the webhook payload
      // for this exact event always does, so use that directly rather than
      // a follow-up fetch that would silently come back incomplete.
      const recordingId: string | undefined = event.payload?.recording_id;
      const roomName: string | undefined = event.payload?.room_name;
      const startTs: number | undefined = event.payload?.start_ts;
      const duration: number | undefined = event.payload?.duration;

      if (!recordingId || !roomName || !startTs) {
        console.warn('Daily webhook: recording.ready-to-download missing expected fields', rawBody.slice(0, 300));
        return c.json({ received: true });
      }

      // Which booking is this? One room is reused for a whole plan (many
      // weekly bookings), so look up the payment this room belongs to via
      // the explicit mapping saved at room-creation time, then pick whichever
      // of that payment's bookings is scheduled closest to when this
      // recording actually started.
      let matchedBookingId: string | null = null;
      let matchedTutorId: string | null = null;
      let matchedStudentId: string | null = null;
      try {
        const roomMapping = (await kv.get(`daily_room:${roomName}`)) as { paymentId: string } | null;
        if (roomMapping?.paymentId) {
          const payment = await db.getPaymentById(roomMapping.paymentId).catch(() => null);
          if (payment?.bookingIds?.length) {
            let best: any = null;
            let bestDiff = Infinity;
            for (const bId of payment.bookingIds) {
              const b = await db.getBooking(bId).catch(() => null);
              if (!b) continue;
              const bDate = new Date(`${b.date}T${b.startTime}:00+01:00`).getTime() / 1000;
              const diff = Math.abs(bDate - startTs);
              if (diff < bestDiff) { bestDiff = diff; best = { ...b, id: bId }; }
            }
            if (best) {
              matchedBookingId = best.id;
              matchedTutorId = best.tutorId;
              matchedStudentId = best.studentId;
            }
          }
        }
      } catch (matchErr: any) {
        console.warn('Daily webhook: booking match failed (non-fatal):', matchErr.message);
      }

      await kv.set(`recording:${recordingId}`, {
        id: recordingId,
        roomName,
        bookingId: matchedBookingId,
        tutorId: matchedTutorId,
        studentId: matchedStudentId,
        startTs,
        duration: duration ?? null,
        status: 'available',
        createdAt: new Date().toISOString(),
      });

      return c.json({ received: true });
    } catch (error: any) {
      console.error('Error handling Daily webhook:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // ── One-time setup: register the webhook with Daily (idempotent) ─────────
  async function ensureWebhookRegistered(): Promise<void> {
    const already = await kv.get('daily_webhook_registered');
    if (already) return;

    const apiKey = Deno.env.get('DAILY_API_KEY');
    if (!apiKey) return;

    const base = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
    const webhookUrl = `${base}/functions/v1/make-server-cbd74580/daily/webhook`;

    try {
      const res = await fetch(`${DAILY_API_BASE}/webhooks`, {
        method: 'POST',
        headers: dailyHeaders(),
        body: JSON.stringify({ url: webhookUrl, eventTypes: ['recording.ready-to-download'] }),
      });
      if (!res.ok) {
        console.error('Daily webhook registration failed:', await res.text());
        return;
      }
      const data = await res.json() as any;
      if (data.hmac) await kv.set('daily_webhook_hmac', data.hmac);
      await kv.set('daily_webhook_registered', true);
    } catch (err: any) {
      console.warn('Daily webhook registration error (non-fatal):', err.message);
    }
  }

  // ── Admin: retained recordings ────────────────────────────────────────────
  async function requireAdmin(userId: string): Promise<any | null> {
    const profile = ((await kv.get(`user:${userId}`)) as any) ?? (await db.getProfile(userId));
    if (!profile || profile.role !== 'admin') return null;
    return profile;
  }

  app.get('/make-server-cbd74580/admin/recordings', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);
      const admin = await requireAdmin(userId);
      if (!admin) return c.json({ error: 'Admin access required' }, 403);

      await ensureWebhookRegistered();

      const all = (await kv.getByPrefix('recording:')) as any[];
      const now = Date.now();
      const retentionMs = RECORDING_RETENTION_DAYS * 24 * 60 * 60 * 1000;

      const nameCache = new Map<string, string>();
      const resolveName = async (id: string | null): Promise<string> => {
        if (!id) return 'Unknown';
        if (nameCache.has(id)) return nameCache.get(id)!;
        const p = ((await kv.get(`user:${id}`)) as any) ?? (await db.getProfile(id).catch(() => null));
        const name = p?.fullName || p?.full_name || p?.name ||
          (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) || 'Unknown';
        nameCache.set(id, name);
        return name;
      };

      const rows = await Promise.all(all.map(async (rec: any) => {
        const ageMs = now - new Date(rec.createdAt).getTime();
        if (rec.status === 'available' && ageMs > retentionMs) {
          // Past the retention window — delete for real, not just hide.
          try {
            await fetch(`${DAILY_API_BASE}/recordings/${rec.id}`, { method: 'DELETE', headers: dailyHeaders() });
          } catch (delErr: any) {
            console.warn(`Failed to delete expired recording ${rec.id} from Daily (non-fatal):`, delErr.message);
          }
          rec.status = 'expired';
          rec.deletedAt = new Date().toISOString();
          rec.deletedReason = `Retention period (${RECORDING_RETENTION_DAYS} days) elapsed`;
          await kv.set(`recording:${rec.id}`, rec);
        }
        return {
          id: rec.id,
          bookingId: rec.bookingId,
          tutorName: await resolveName(rec.tutorId),
          studentName: await resolveName(rec.studentId),
          startTs: rec.startTs,
          duration: rec.duration,
          status: rec.status,
          createdAt: rec.createdAt,
          deletedAt: rec.deletedAt ?? null,
        };
      }));

      rows.sort((a, b) => (b.startTs ?? 0) - (a.startTs ?? 0));
      return c.json({ recordings: rows, retentionDays: RECORDING_RETENTION_DAYS });
    } catch (error: any) {
      console.error('Error listing recordings:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Fresh, time-limited playback/download link — fetched on demand, never
  // stored, since Daily's own access links expire. Every fetch is logged
  // against the tutor/student on the recording (same pattern as the chat
  // safeguarding viewer): proof of when the platform looked, not just that
  // it could.
  app.get('/make-server-cbd74580/admin/recordings/:id/access-link', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);
      const admin = await requireAdmin(userId);
      if (!admin) return c.json({ error: 'Admin access required' }, 403);

      const recordingId = c.req.param('id');
      const rec = (await kv.get(`recording:${recordingId}`)) as any;
      if (!rec || rec.status !== 'available') {
        return c.json({ error: 'Recording not found or no longer available' }, 404);
      }

      const linkRes = await fetch(`${DAILY_API_BASE}/recordings/${recordingId}/access-link`, { headers: dailyHeaders() });
      if (!linkRes.ok) {
        return c.json({ error: 'Failed to get access link from Daily' }, 502);
      }
      const linkData = await linkRes.json() as any;

      const subjects = [rec.tutorId, rec.studentId].filter(Boolean);
      await Promise.all(subjects.map((subjectId: string) =>
        logAuditEvent({
          userId: subjectId,
          adminId: userId,
          action: 'admin_viewed_session_recording',
          category: 'moderation',
          description: `Admin accessed the session recording for a booking this user is part of — safeguarding/investigation access.`,
          severity: 'warning',
          metadata: { recordingId, bookingId: rec.bookingId },
        })
      ));

      return c.json({ accessLink: linkData.download_link ?? linkData.link ?? null });
    } catch (error: any) {
      console.error('Error getting recording access link:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Deliberate admin deletion — the other way a recording's life can end
  // besides the retention sweep.
  app.delete('/make-server-cbd74580/admin/recordings/:id', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);
      const admin = await requireAdmin(userId);
      if (!admin) return c.json({ error: 'Admin access required' }, 403);

      const recordingId = c.req.param('id');
      const rec = (await kv.get(`recording:${recordingId}`)) as any;
      if (!rec) return c.json({ error: 'Recording not found' }, 404);

      await fetch(`${DAILY_API_BASE}/recordings/${recordingId}`, { method: 'DELETE', headers: dailyHeaders() }).catch(() => {});

      rec.status = 'deleted';
      rec.deletedAt = new Date().toISOString();
      rec.deletedBy = userId;
      rec.deletedReason = 'Deleted by admin';
      await kv.set(`recording:${recordingId}`, rec);

      await logAuditEvent({
        userId: rec.tutorId ?? userId,
        adminId: userId,
        action: 'admin_deleted_session_recording',
        category: 'moderation',
        description: `Admin permanently deleted a session recording.`,
        severity: 'warning',
        metadata: { recordingId, bookingId: rec.bookingId },
      });

      db.createAdminAuditLog({
        actorId: userId,
        action: 'recording_deleted',
        targetType: 'recording',
        targetId: recordingId,
        details: { bookingId: rec.bookingId },
      }).catch(() => {});

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting recording:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  mainApp.route('/', app);
}
