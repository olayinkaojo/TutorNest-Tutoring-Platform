/**
 * Who may share documents with whom (booking + parent–child links).
 */
import * as kv from './kv_store.tsx';
import {
  bookingIdentityIdsForUser,
  collectBookingsForUser,
  MESSAGING_BOOKING_STATUSES,
} from './messaging-access.tsx';

export type ShareRecipientType = 'tutor' | 'parent' | 'student' | 'child';

/** Role context for docs this user uploaded (dual parent/tutor accounts share one auth id). */
function docUploaderPersona(doc: Record<string, unknown>): string {
  const r = String(doc.uploadedByRole || '').toLowerCase();
  if (r) return r;
  return String(doc.relatedToType || '').toLowerCase();
}

function normBooking(b: Record<string, unknown>) {
  return {
    tutorId: (b.tutorId ?? b.tutor_id) as string | undefined,
    studentId: (b.studentId ?? b.student_id) as string | undefined,
    parentId: (b.parentId ?? b.userId ?? b.user_id) as string | undefined,
    status: String(b.status || '').toLowerCase(),
  };
}

async function parentOwnsChild(parentId: string, childId: string): Promise<boolean> {
  const ids = ((await kv.get(`parent_children:${parentId}`)) as string[] | null) || [];
  if (ids.includes(childId)) return true;
  const child = (await kv.get(`child:${childId}`)) as { parentId?: string } | null;
  return child?.parentId === parentId;
}

/** Empty sharedWithId = private document (uploader only). */
export async function assertDocumentShareAllowed(
  uploaderId: string,
  uploaderRole: string,
  sharedWithId: string | undefined | null,
  sharedWithType: string | undefined | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = (uploaderRole || '').toLowerCase();
  const swId = (sharedWithId || '').trim();
  const swType = (sharedWithType || '').toLowerCase() as ShareRecipientType | '';

  if (!swId) return { ok: true };

  if (!['tutor', 'parent', 'student', 'child'].includes(swType)) {
    return { ok: false, error: 'Invalid recipient type' };
  }

  const bookings = await collectBookingsForUser(uploaderId);
  const active = bookings.filter((raw) => MESSAGING_BOOKING_STATUSES.has(normBooking(raw as Record<string, unknown>).status));

  if (role === 'student') {
    const studentIds = await bookingIdentityIdsForUser(uploaderId);
    const studentIdSet = new Set(studentIds);
    for (const raw of active) {
      const b = normBooking(raw as Record<string, unknown>);
      const studentMatches = !!(b.studentId && studentIdSet.has(b.studentId));
      if (!studentMatches) continue;
      if (swType === 'tutor' && b.tutorId === swId) return { ok: true };
      if (swType === 'parent' && b.parentId === swId) return { ok: true };
    }
    return { ok: false, error: 'You can only share with a tutor or parent linked to your bookings.' };
  }

  if (role === 'parent') {
    if (swType === 'child') {
      if (await parentOwnsChild(uploaderId, swId)) return { ok: true };
      return { ok: false, error: 'That child is not on your account.' };
    }
    if (swType === 'tutor') {
      for (const raw of active) {
        const b = normBooking(raw as Record<string, unknown>);
        const payer = b.parentId ?? (raw as Record<string, unknown>).userId;
        if (String(payer) === uploaderId && b.tutorId === swId) return { ok: true };
      }
      return { ok: false, error: 'You can only share with tutors you have sessions with.' };
    }
    if (swType === 'student') {
      for (const raw of active) {
        const b = normBooking(raw as Record<string, unknown>);
        const payer = b.parentId ?? (raw as Record<string, unknown>).userId;
        if (String(payer) === uploaderId && b.studentId === swId) return { ok: true };
      }
      return { ok: false, error: 'You can only share with students on your bookings.' };
    }
    return { ok: false, error: 'Invalid recipient for a parent upload.' };
  }

  if (role === 'tutor') {
    if (swType === 'student') {
      const recipientIds = await bookingIdentityIdsForUser(swId);
      const recipientSet = new Set(recipientIds);
      for (const raw of active) {
        const b = normBooking(raw as Record<string, unknown>);
        if (b.tutorId !== uploaderId || !b.studentId) continue;
        if (b.studentId === swId || recipientSet.has(b.studentId)) return { ok: true };
      }
      return { ok: false, error: 'You can only share with students on your roster.' };
    }
    if (swType === 'parent') {
      for (const raw of active) {
        const b = normBooking(raw as Record<string, unknown>);
        const pid = b.parentId;
        if (b.tutorId === uploaderId && pid === swId) return { ok: true };
      }
      return { ok: false, error: 'You can only share with parents of your booked students.' };
    }
    return { ok: false, error: 'Invalid recipient for a tutor upload.' };
  }

  return { ok: false, error: 'Role cannot share documents to that recipient.' };
}

/**
 * Filters client-supplied child ids down to the ones this parent actually owns.
 *
 * userCanAccessDocument() treats a document shared with any id in `childIds` as
 * readable, so an unfiltered list from the query string would let a parent read
 * documents shared with another family's child.
 */
export async function verifyChildIds(parentId: string, childIds: string[]): Promise<string[]> {
  if (childIds.length === 0) return [];
  const checked = await Promise.all(
    childIds.map(async (id) => ((await parentOwnsChild(parentId, id)) ? id : null)),
  );
  return checked.filter((id): id is string => id !== null);
}

export function parseChildIdsQuery(q: string | undefined): string[] {
  if (!q?.trim()) return [];
  return q.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function usersLinkedInActiveBookings(a: string, b: string): Promise<boolean> {
  const setA = new Set(await bookingIdentityIdsForUser(a));
  const setB = new Set(await bookingIdentityIdsForUser(b));
  const rows = await collectBookingsForUser(a);
  for (const raw of rows) {
    const bk = normBooking(raw as Record<string, unknown>);
    if (!MESSAGING_BOOKING_STATUSES.has(bk.status)) continue;
    const parties = new Set([bk.tutorId, bk.studentId, bk.parentId].filter(Boolean) as string[]);
    const touchesA = [...setA].some((id) => parties.has(id));
    const touchesB = [...setB].some((id) => parties.has(id));
    if (touchesA && touchesB) return true;
  }
  return false;
}

/**
 * Whether `userId` acting as `userRole` may list/open this document.
 * `childIds` — parent's linked child profile IDs (from client query when role is parent).
 */
export async function userCanAccessDocument(
  doc: Record<string, unknown>,
  userId: string,
  userRole: string,
  childIds: string[],
): Promise<boolean> {
  const role = (userRole || '').toLowerCase();
  const uploadedBy = String(doc.uploadedBy || '');
  const uploadedByRole = String(doc.uploadedByRole || '').toLowerCase();
  const sharedWithId = String(doc.sharedWithId || '').trim();
  const sharedWithType = String(doc.sharedWithType || '').toLowerCase();

  if (role === 'student') {
    if (uploadedBy === userId && docUploaderPersona(doc) === 'student') return true;
    const studentIds = await bookingIdentityIdsForUser(userId);
    const recipientMatch = sharedWithId && studentIds.includes(sharedWithId);
    if (recipientMatch) {
      return usersLinkedInActiveBookings(userId, uploadedBy);
    }
    return false;
  }

  if (role === 'parent') {
    if (uploadedBy === userId && docUploaderPersona(doc) === 'parent') return true;
    if (sharedWithId === userId && sharedWithType === 'tutor') return false;
    if (sharedWithId === userId && sharedWithType === 'parent') return true;
    if (sharedWithId && childIds.length > 0 && childIds.includes(sharedWithId)) {
      if (['child', 'student'].includes(sharedWithType)) return true;
    }
    if (uploadedByRole === 'tutor' && sharedWithId === userId && sharedWithType === 'parent') return true;
    if (uploadedByRole === 'tutor' && sharedWithId && childIds.includes(sharedWithId)) {
      if (!sharedWithType || ['child', 'student'].includes(sharedWithType)) return true;
    }
    if (uploadedByRole === 'student' && sharedWithId === userId && sharedWithType === 'parent') {
      return usersLinkedInActiveBookings(userId, uploadedBy);
    }
    // Legacy rows: tutor doc "for parent" with wrong sharedWithType — still require booking link
    if (uploadedByRole === 'tutor' && sharedWithId === userId) {
      return usersLinkedInActiveBookings(userId, uploadedBy);
    }
    return false;
  }

  if (role === 'tutor') {
    if (uploadedBy === userId && docUploaderPersona(doc) === 'tutor') return true;
    if (sharedWithId === userId) {
      if (sharedWithType === 'parent' || sharedWithType === 'student' || sharedWithType === 'child') {
        return false;
      }
      const inboxAsTutor =
        sharedWithType === 'tutor' || sharedWithType === '' || sharedWithType === 'user';
      if (!inboxAsTutor) return false;
      if (uploadedByRole === 'parent' || uploadedByRole === 'student') {
        return usersLinkedInActiveBookings(userId, uploadedBy);
      }
      if (!uploadedByRole || uploadedByRole === 'tutor') {
        return usersLinkedInActiveBookings(userId, uploadedBy);
      }
    }
    return false;
  }

  if (role === 'admin') {
    return true;
  }

  return false;
}
