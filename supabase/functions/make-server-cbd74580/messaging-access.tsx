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

/** Merge DB + KV bookings involving this user (deduped by id). */
export async function collectBookingsForUser(userId: string): Promise<Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>>();

  try {
    const rows = await db.getBookingsByUserId(userId);
    for (const r of rows) {
      map.set(r.id, r as unknown as Record<string, unknown>);
    }
  } catch {
    /* DB optional in some environments */
  }

  try {
    const kvRows = await kv.getByPrefix('booking:');
    for (const raw of kvRows) {
      const b = raw as Record<string, unknown>;
      const tid = (b.tutorId ?? b.tutor_id) as string | undefined;
      const sid = (b.studentId ?? b.student_id) as string | undefined;
      const pid = (b.parentId ?? b.userId ?? b.user_id) as string | undefined;
      if (tid === userId || sid === userId || pid === userId) {
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

export function conversationMatchesPersona(conv: { channel?: string }, persona: string): boolean {
  if (!conv.channel) return true; // legacy: show everywhere so nothing is lost
  const p = persona.toLowerCase();
  if (p === 'all' || !p) return true;
  if (p === 'parent') return conv.channel === 'parent-tutor';
  if (p === 'tutor') return conv.channel === 'tutor-parent' || conv.channel === 'tutor-student';
  if (p === 'student') return conv.channel === 'tutor-student';
  return true;
}
