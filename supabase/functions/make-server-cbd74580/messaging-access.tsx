/**
 * Booking-based rules for who may message whom (parent / tutor / student personas).
 */
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

export const MESSAGING_BOOKING_STATUSES = new Set(['confirmed', 'completed', 'scheduled']);

export type MessagingChannel = 'parent-tutor' | 'tutor-parent' | 'tutor-student';

function normalizeBooking(raw: Record<string, unknown>) {
  const b = raw as Record<string, unknown>;
  const parentId = (b.parentId ?? b.userId ?? b.user_id) as string | undefined;
  return {
    id: b.id as string,
    tutorId: (b.tutorId ?? b.tutor_id) as string | undefined,
    studentId: (b.studentId ?? b.student_id) as string | undefined,
    parentId,
    userId: (b.userId ?? b.user_id) as string | undefined,
    status: String(b.status || '').toLowerCase(),
  };
}

/** DB + KV user ids to include (auth id plus dependent student’s linked child profile id). */
export async function bookingIdentityIdsForUser(userId: string): Promise<string[]> {
  const ids = new Set<string>([userId]);
  try {
    const prof = (await kv.get(`user:${userId}`)) as { linkedChildId?: string } | null;
    if (prof?.linkedChildId && prof.linkedChildId !== userId) ids.add(prof.linkedChildId);
  } catch {
    /* non-fatal */
  }
  return [...ids];
}

/** Merge DB + KV bookings involving this user (deduped by id). */
export async function collectBookingsForUser(userId: string): Promise<Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>>();
  const entityIds = await bookingIdentityIdsForUser(userId);

  for (const uid of entityIds) {
    try {
      const rows = await db.getBookingsByUserId(uid);
      for (const r of rows) {
        map.set(r.id, r as unknown as Record<string, unknown>);
      }
    } catch {
      /* DB optional in some environments */
    }
  }

  try {
    const kvRows = await kv.getByPrefix('booking:');
    for (const raw of kvRows) {
      const b = raw as Record<string, unknown>;
      const tid = (b.tutorId ?? b.tutor_id) as string | undefined;
      const sid = (b.studentId ?? b.student_id) as string | undefined;
      const pid = (b.parentId ?? b.userId ?? b.user_id) as string | undefined;
      const touches = entityIds.some((uid) => uid === tid || uid === sid || uid === pid);
      if (touches) {
        const id = b.id as string;
        if (id && !map.has(id)) map.set(id, b);
      }
    }
  } catch {
    /* non-fatal */
  }

  return [...map.values()];
}

export function isEligibleMessagingPair(
  bookings: Record<string, unknown>[],
  userId: string,
  peerId: string,
  channel: MessagingChannel,
): boolean {
  for (const raw of bookings) {
    const b = normalizeBooking(raw);
    if (!b.tutorId || !MESSAGING_BOOKING_STATUSES.has(b.status)) continue;

    const parentId = b.parentId || b.userId;
    const tutorId = b.tutorId;
    const studentId = b.studentId;

    if (channel === 'parent-tutor') {
      if (parentId === userId && tutorId === peerId) return true;
    } else if (channel === 'tutor-parent') {
      if (tutorId === userId && parentId === peerId) return true;
    } else if (channel === 'tutor-student') {
      if (tutorId === userId && studentId === peerId) return true;
      if (studentId === userId && tutorId === peerId) return true;
    }
  }
  return false;
}

export function buildConversationId(userId: string, peerId: string, channel: MessagingChannel): string {
  const [a, b] = [userId, peerId].sort();
  return `conversation:${a}:${b}:${channel}`;
}

/** Derive API channel from dashboard role + contact role (client may send this). */
export function inferChannelFromRoles(
  dashboardRole: string,
  contactRole: string,
): MessagingChannel | null {
  const d = dashboardRole.toLowerCase();
  const c = contactRole.toLowerCase();
  if (d === 'parent' && c === 'tutor') return 'parent-tutor';
  if (d === 'tutor' && c === 'parent') return 'tutor-parent';
  if (d === 'tutor' && c === 'student') return 'tutor-student';
  if (d === 'student' && c === 'tutor') return 'tutor-student';
  return null;
}

/**
 * Whether a conversation belongs in the list for the current dashboard role.
 * `userId` is used when `channel` is missing (legacy) — we match `participantRoles[userId]` to the persona.
 */
export function conversationMatchesPersona(
  conv: { channel?: string; participantRoles?: Record<string, string> },
  persona: string,
  userId: string,
): boolean {
  const p = (persona || 'all').toLowerCase();
  if (p === 'all' || !p) return true;

  const ch = conv.channel;
  if (ch) {
    if (p === 'parent') return ch === 'parent-tutor';
    if (p === 'tutor') return ch === 'tutor-parent' || ch === 'tutor-student';
    if (p === 'student') return ch === 'tutor-student';
    return true;
  }

  const label = (conv.participantRoles?.[userId] || '').toLowerCase();
  if (label === 'parent' && p === 'parent') return true;
  if (label === 'tutor' && p === 'tutor') return true;
  if (label === 'student' && p === 'student') return true;
  return false;
}
