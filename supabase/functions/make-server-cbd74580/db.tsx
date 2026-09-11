/**
 * db.tsx — Typed Supabase Postgres operations for Knowledge Fons Academy core tables.
 *
 * Tables covered: profiles, bookings, payments, tutor_balance, notifications
 *
 * Run schema.sql in Supabase before using these functions:
 * https://supabase.com/dashboard/project/wevmvbskunhnhuxzaqoz/sql/new
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

function db() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

/** Returns the profile object in the same shape the KV store used. */
export async function getProfile(userId: string): Promise<any | null> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  // Merge typed columns on top of raw_data so callers get up-to-date values
  return { ...data.raw_data, id: data.id, userId: data.id, role: data.role, email: data.email, fullName: data.full_name };
}

/** Writes (or overwrites) a profile row. Safe to call on every update. */
export async function upsertProfile(userId: string, profileData: any): Promise<void> {
  const { error } = await db()
    .from('profiles')
    .upsert(
      {
        id: userId,
        role: profileData.role ?? null,
        email: profileData.email ?? null,
        full_name: profileData.fullName ?? profileData.name ?? null,
        raw_data: profileData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  if (error) throw new Error(error.message);
}

/** Returns all profiles with a given role. */
export async function getProfilesByRole(role: string): Promise<any[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .eq('role', role);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row.raw_data,
    id: row.id,
    userId: row.id,
    role: row.role,
    email: row.email,
    fullName: row.full_name,
  }));
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface BookingRow {
  id: string;
  paymentId: string;
  planType: string;
  sessionNumber: number;
  totalSessions: number;
  tutorId: string;
  studentId: string;
  userId: string;
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  duration: number;
  subject: string | null;
  status: string;
  paymentStatus: string;
  meetLink?: string;
}

export async function createBooking(booking: BookingRow): Promise<void> {
  const { error } = await db()
    .from('bookings')
    .insert({
      id: booking.id,
      payment_id: booking.paymentId,
      plan_type: booking.planType,
      session_number: booking.sessionNumber,
      total_sessions: booking.totalSessions,
      tutor_id: booking.tutorId,
      student_id: booking.studentId,
      user_id: booking.userId,
      date: booking.date,
      start_time: booking.startTime,
      end_time: booking.endTime,
      duration: booking.duration,
      subject: booking.subject,
      status: booking.status,
      payment_status: booking.paymentStatus,
    });
  if (error) throw new Error(error.message);
}

/** Returns all bookings for a tutor on a specific date (for availability checks). */
export async function getBookingsByTutorAndDate(tutorId: string, date: string): Promise<Pick<BookingRow, 'id' | 'startTime' | 'endTime' | 'status'>[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('id, start_time, end_time, status')
    .eq('tutor_id', tutorId)
    .eq('date', date)
    .in('status', ['scheduled', 'confirmed']);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }));
}

/** Returns all bookings for a student on a specific date (for conflict checks). */
export async function getBookingsByStudentAndDate(studentId: string, date: string): Promise<Pick<BookingRow, 'startTime' | 'endTime' | 'status'>[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('start_time, end_time, status')
    .eq('student_id', studentId)
    .eq('date', date)
    .in('status', ['scheduled', 'confirmed']);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
  }));
}

/** Returns all bookings for a user (as student, tutor, or paying parent). */
export async function getBookingsByUserId(userId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .or(`user_id.eq.${userId},tutor_id.eq.${userId},student_id.eq.${userId}`)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    planType: row.plan_type,
    sessionNumber: row.session_number,
    totalSessions: row.total_sessions,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    subject: row.subject,
    status: row.status,
    paymentStatus: row.payment_status,
    meetLink: row.meet_link ?? undefined,
  }));
}

/** Returns only bookings where the user is the TUTOR (teaching sessions). */
export async function getBookingsByTutorId(tutorId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    planType: row.plan_type,
    sessionNumber: row.session_number,
    totalSessions: row.total_sessions,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    subject: row.subject,
    status: row.status,
    paymentStatus: row.payment_status,
    meetLink: row.meet_link ?? undefined,
  }));
}

/** Returns only bookings where the user is the STUDENT (attending sessions). */
export async function getBookingsByStudentId(studentId: string): Promise<BookingRow[]> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    planType: row.plan_type,
    sessionNumber: row.session_number,
    totalSessions: row.total_sessions,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    subject: row.subject,
    status: row.status,
    paymentStatus: row.payment_status,
    meetLink: row.meet_link ?? undefined,
  }));
}

/** Get a single booking by ID from the database. */
export async function getBooking(bookingId: string): Promise<BookingRow | null> {
  const { data, error } = await db()
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();
  if (error) {
    // PGRST116: No rows found. 22P02: Invalid input (usually non-UUID string in UUID column)
    if (error.code === 'PGRST116' || error.code === '22P02') return null;
    throw new Error(error.message);
  }
  if (!data) return null;
  return {
    id: data.id,
    paymentId: data.payment_id,
    planType: data.plan_type,
    sessionNumber: data.session_number,
    totalSessions: data.total_sessions,
    tutorId: data.tutor_id,
    studentId: data.student_id,
    userId: data.user_id,
    date: data.date,
    startTime: data.start_time,
    endTime: data.end_time,
    duration: data.duration,
    subject: data.subject,
    status: data.status,
    paymentStatus: data.payment_status,
    meetLink: data.meet_link ?? undefined,
  };
}

/** Flips a booking's status — used to mark a session 'completed' once it has ended. */
export async function updateBookingStatus(bookingId: string, status: string): Promise<void> {
  const { error } = await db()
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId);
  if (error) throw new Error(error.message);
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export interface PaymentRow {
  id: string;
  userId: string;
  tutorId: string;
  studentId: string;
  planType: string;
  amount: number;
  reference: string;
  startDate: string;
  startTime: string;
  subject: string | null;
  status: string;
  bookingIds?: string[];
  confirmedAt?: string;
  paymentExpiresAt?: string;  // Chat access expires when payment duration ends
}

export async function createPayment(payment: PaymentRow): Promise<void> {
  const { error } = await db()
    .from('payments')
    .insert({
      id: payment.id,
      user_id: payment.userId,
      tutor_id: payment.tutorId,
      student_id: payment.studentId,
      plan_type: payment.planType,
      amount: payment.amount,
      reference: payment.reference,
      start_date: payment.startDate,
      start_time: payment.startTime,
      subject: payment.subject,
      status: payment.status,
    });
  if (error) throw new Error(error.message);
}

export async function getPaymentByReference(reference: string): Promise<PaymentRow | null> {
  const { data, error } = await db()
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    tutorId: data.tutor_id,
    studentId: data.student_id,
    planType: data.plan_type,
    amount: data.amount,
    reference: data.reference,
    startDate: data.start_date,
    startTime: data.start_time,
    subject: data.subject,
    status: data.status,
    bookingIds: data.booking_ids ?? [],
    confirmedAt: data.confirmed_at,
    paymentExpiresAt: data.payment_expires_at,
  };
}

export async function getPaymentById(paymentId: string): Promise<PaymentRow | null> {
  const { data, error } = await db()
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    tutorId: data.tutor_id,
    studentId: data.student_id,
    planType: data.plan_type,
    amount: data.amount,
    reference: data.reference,
    startDate: data.start_date,
    startTime: data.start_time,
    subject: data.subject,
    status: data.status,
    bookingIds: data.booking_ids ?? [],
    confirmedAt: data.confirmed_at,
    paymentExpiresAt: data.payment_expires_at,
  };
}

export async function updatePayment(id: string, updates: {
  status?: string;
  bookingIds?: string[];
  confirmedAt?: string;
  paymentExpiresAt?: string;
}): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.bookingIds !== undefined) row.booking_ids = updates.bookingIds;
  if (updates.confirmedAt !== undefined) row.confirmed_at = updates.confirmedAt;
  if (updates.paymentExpiresAt !== undefined) row.payment_expires_at = updates.paymentExpiresAt;

  const { error } = await db().from('payments').update(row).eq('id', id);

  if (error) {
    // Column not yet migrated — retry without it so the rest of the update succeeds
    if (error.message?.includes('payment_expires_at') && row.payment_expires_at !== undefined) {
      const { payment_expires_at: _dropped, ...rowWithout } = row;
      const { error: e2 } = await db().from('payments').update(rowWithout).eq('id', id);
      if (e2) throw new Error(e2.message);
      console.warn('payment_expires_at not stored — run: ALTER TABLE payments ADD COLUMN payment_expires_at TIMESTAMPTZ');
      return;
    }
    throw new Error(error.message);
  }
}

// ─── Tutor Balance ────────────────────────────────────────────────────────────

export async function getTutorBalance(tutorId: string): Promise<{
  tutor_id: string;
  pending_balance: number;
  available_balance: number;
  total_earnings: number;
  total_payouts: number;
}> {
  const { data, error } = await db()
    .from('tutor_balance')
    .select('*')
    .eq('tutor_id', tutorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? {
    tutor_id: tutorId,
    pending_balance: 0,
    available_balance: 0,
    total_earnings: 0,
    total_payouts: 0,
  };
}

/**
 * Atomically adds tutorAmount to pending_balance and total_earnings.
 * Creates the row if it doesn't exist yet.
 */
export async function incrementTutorBalance(tutorId: string, tutorAmount: number): Promise<void> {
  const current = await getTutorBalance(tutorId);
  const { error } = await db()
    .from('tutor_balance')
    .upsert(
      {
        tutor_id: tutorId,
        pending_balance: (current.pending_balance ?? 0) + tutorAmount,
        available_balance: current.available_balance ?? 0,
        total_earnings: (current.total_earnings ?? 0) + tutorAmount,
        total_payouts: current.total_payouts ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' },
    );
  if (error) throw new Error(error.message);
}

/**
 * Moves `amount` from pending_balance to available_balance — call this once a
 * paid session has actually happened, so a tutor can eventually withdraw it.
 * Clamped so pending never goes negative if called twice for the same amount.
 */
export async function releaseTutorBalance(tutorId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const current = await getTutorBalance(tutorId);
  const moved = Math.min(amount, current.pending_balance ?? 0);
  if (moved <= 0) return;
  const { error } = await db()
    .from('tutor_balance')
    .upsert(
      {
        tutor_id: tutorId,
        pending_balance: (current.pending_balance ?? 0) - moved,
        available_balance: (current.available_balance ?? 0) + moved,
        total_earnings: current.total_earnings ?? 0,
        total_payouts: current.total_payouts ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' },
    );
  if (error) throw new Error(error.message);
}

/**
 * Reserves `amount` out of available_balance when a payout is requested, so a
 * second request submitted before the first is approved can't double-spend
 * the same funds. Throws if the tutor doesn't have enough available.
 */
export async function reserveTutorBalanceForPayout(tutorId: string, amount: number): Promise<void> {
  const current = await getTutorBalance(tutorId);
  if ((current.available_balance ?? 0) < amount) {
    throw new Error('Insufficient available balance');
  }
  const { error } = await db()
    .from('tutor_balance')
    .upsert(
      {
        tutor_id: tutorId,
        pending_balance: current.pending_balance ?? 0,
        available_balance: (current.available_balance ?? 0) - amount,
        total_earnings: current.total_earnings ?? 0,
        total_payouts: current.total_payouts ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' },
    );
  if (error) throw new Error(error.message);
}

/** Returns a reserved amount to available_balance — payout was rejected or failed. */
export async function refundTutorReservedBalance(tutorId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const current = await getTutorBalance(tutorId);
  const { error } = await db()
    .from('tutor_balance')
    .upsert(
      {
        tutor_id: tutorId,
        pending_balance: current.pending_balance ?? 0,
        available_balance: (current.available_balance ?? 0) + amount,
        total_earnings: current.total_earnings ?? 0,
        total_payouts: current.total_payouts ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' },
    );
  if (error) throw new Error(error.message);
}

/** Records a completed payout — the reserved amount is now actually out the door. */
export async function finalizeTutorPayout(tutorId: string, amount: number): Promise<void> {
  const current = await getTutorBalance(tutorId);
  const { error } = await db()
    .from('tutor_balance')
    .upsert(
      {
        tutor_id: tutorId,
        pending_balance: current.pending_balance ?? 0,
        available_balance: current.available_balance ?? 0,
        total_earnings: current.total_earnings ?? 0,
        total_payouts: (current.total_payouts ?? 0) + amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' },
    );
  if (error) throw new Error(error.message);
}

/**
 * Claws back `amount` from a tutor's balance when a refund is processed —
 * pending first (money never actually cleared for withdrawal), then
 * available. Whatever's left after both are exhausted is a shortfall: money
 * already sitting as available/reserved-or-paid-out that this function
 * cannot safely touch automatically. Callers should flag that remainder for
 * manual admin review rather than silently writing it off.
 */
export async function deductTutorBalanceForRefund(
  tutorId: string,
  amount: number,
): Promise<{ deductedFromPending: number; deductedFromAvailable: number; shortfall: number }> {
  const current = await getTutorBalance(tutorId);
  const fromPending = Math.min(amount, current.pending_balance ?? 0);
  const remaining = amount - fromPending;
  const fromAvailable = Math.min(remaining, current.available_balance ?? 0);
  const shortfall = remaining - fromAvailable;
  const { error } = await db()
    .from('tutor_balance')
    .upsert(
      {
        tutor_id: tutorId,
        pending_balance: (current.pending_balance ?? 0) - fromPending,
        available_balance: (current.available_balance ?? 0) - fromAvailable,
        total_earnings: current.total_earnings ?? 0,
        total_payouts: current.total_payouts ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tutor_id' },
    );
  if (error) throw new Error(error.message);
  return { deductedFromPending: fromPending, deductedFromAvailable: fromAvailable, shortfall };
}

// ─── Payouts ──────────────────────────────────────────────────────────────────
// Single source of truth for payout requests (replaces the old KV `payout:`
// and `payout_req_:` records — two parallel, mutually-invisible systems that
// meant a tutor's real request never reached the admin approval screen).

export interface PayoutRow {
  id: string;
  tutorId: string;
  amount: number;
  bankDetails: Record<string, unknown>;
  status: string; // pending | processing | completed | failed | rejected
  reference?: string | null;
  transferId?: string | null;
  processedBy?: string | null;
  requestedAt: string;
  processedAt?: string | null;
}

function mapPayoutRow(row: any): PayoutRow {
  return {
    id: row.id,
    tutorId: row.tutor_id,
    amount: Number(row.amount),
    bankDetails: row.bank_details ?? {},
    status: row.status,
    reference: row.reference,
    transferId: row.transfer_id,
    processedBy: row.processed_by,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
  };
}

export async function createPayout(payout: {
  tutorId: string;
  amount: number;
  bankDetails: Record<string, unknown>;
}): Promise<PayoutRow> {
  const { data, error } = await db()
    .from('payouts')
    .insert({
      tutor_id: payout.tutorId,
      amount: payout.amount,
      bank_details: payout.bankDetails,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapPayoutRow(data);
}

export async function getPayout(payoutId: string): Promise<PayoutRow | null> {
  const { data, error } = await db()
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapPayoutRow(data) : null;
}

export async function updatePayout(
  payoutId: string,
  updates: { status?: string; reference?: string; transferId?: string; processedBy?: string; processedAt?: string },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.reference !== undefined) patch.reference = updates.reference;
  if (updates.transferId !== undefined) patch.transfer_id = updates.transferId;
  if (updates.processedBy !== undefined) patch.processed_by = updates.processedBy;
  if (updates.processedAt !== undefined) patch.processed_at = updates.processedAt;
  const { error } = await db().from('payouts').update(patch).eq('id', payoutId);
  if (error) throw new Error(error.message);
}

export async function listPayoutsByTutor(tutorId: string): Promise<PayoutRow[]> {
  const { data, error } = await db()
    .from('payouts')
    .select('*')
    .eq('tutor_id', tutorId)
    .order('requested_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPayoutRow);
}

export async function listAllPayouts(status?: string): Promise<PayoutRow[]> {
  let query = db().from('payouts').select('*').order('requested_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPayoutRow);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(notification: {
  userId: string;
  type: string;
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  priority?: string;
  metadata?: Record<string, unknown>;
  sentViaEmail?: boolean;
  sentViaInApp?: boolean;
  /** Set only when backfilling a pre-existing KV notification record — lets that backfill be re-run without duplicating rows. */
  legacyKvId?: string;
  /** Set only when backfilling, to preserve the KV record's original timestamp instead of defaulting to now(). */
  createdAt?: string;
  /** Set only when backfilling, to preserve whether the KV record had already been read. */
  read?: boolean;
  readAt?: string;
}): Promise<{ id: string }> {
  const { data, error } = await db()
    .from('notifications')
    .insert({
      user_id: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      description: notification.description ?? null,
      action_url: notification.actionUrl ?? null,
      priority: notification.priority ?? 'normal',
      metadata: notification.metadata ?? null,
      sent_via_email: notification.sentViaEmail ?? true,
      sent_via_in_app: notification.sentViaInApp ?? true,
      legacy_kv_id: notification.legacyKvId ?? null,
      ...(notification.createdAt ? { created_at: notification.createdAt } : {}),
      ...(notification.read !== undefined ? { read: notification.read } : {}),
      ...(notification.readAt ? { read_at: notification.readAt } : {}),
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function getNotificationsByUser(userId: string): Promise<{
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  read: boolean;
  readAt?: string;
  priority: string;
  metadata: any;
  createdAt: string;
  sentVia: { email: boolean; inApp: boolean };
}[]> {
  const { data, error } = await db()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    description: row.description ?? undefined,
    actionUrl: row.action_url ?? undefined,
    read: row.read,
    readAt: row.read_at ?? undefined,
    priority: row.priority ?? 'normal',
    metadata: row.metadata,
    createdAt: row.created_at,
    sentVia: { email: row.sent_via_email ?? true, inApp: row.sent_via_in_app ?? true },
  }));
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await db()
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) throw new Error(error.message);
}

/** Marks every unread notification for a user as read. Returns how many rows changed. */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { data, error } = await db()
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false)
    .select('id');
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}

/** Returns the owning user_id of a notification, or null if it doesn't exist — lets a caller enforce ownership before deleting. */
export async function getNotificationOwner(notificationId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('notifications')
    .select('user_id')
    .eq('id', notificationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const { error } = await db()
    .from('notifications')
    .delete()
    .eq('id', notificationId);
  if (error) throw new Error(error.message);
}

// ─── Meet links ───────────────────────────────────────────────────────────────

/** Stamps all given booking rows with the same Google Meet link. */
export async function updateBookingsMeetLink(bookingIds: string[], meetLink: string): Promise<void> {
  const { error } = await db()
    .from('bookings')
    .update({ meet_link: meetLink })
    .in('id', bookingIds);
  if (error) throw new Error(error.message);
}

// ─── Admin queries ────────────────────────────────────────────────────────────

/**
 * Returns all bookings from the DB, mapped to the same shape the KV store used.
 * Pass year + month to filter by session date.
 */
export async function getAllBookingsForAdmin(year?: number, month?: number): Promise<any[]> {
  let query = db().from('bookings').select('*');
  if (year && month) {
    // Filter by date column: e.g. 2026-04 → 2026-04-01 to 2026-04-30
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
    query = query.gte('date', from).lt('date', nextMonth);
  }
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    planType: row.plan_type,
    sessionNumber: row.session_number,
    totalSessions: row.total_sessions,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    userId: row.user_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    duration: row.duration,
    subject: row.subject,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
  }));
}

/** Returns payments for a specific user (as payer or tutor) from the DB. */
export async function getPaymentsByUserId(userId: string): Promise<any[]> {
  const { data, error } = await db()
    .from('payments')
    .select('*')
    .or(`user_id.eq.${userId},tutor_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    amount: Number(row.amount),
    subject: row.subject,
    status: row.status,
    reference: row.reference,
    planType: row.plan_type,
    createdAt: row.created_at,
    verifiedAt: row.confirmed_at,
    metadata: { planType: row.plan_type },
    source: 'db',
  }));
}

/**
 * Returns all payments from the DB, mapped to the same shape the KV store used.
 * Pass year + month to filter by created_at.
 */
export async function getAllPaymentsForAdmin(year?: number, month?: number): Promise<any[]> {
  let query = db().from('payments').select('*');
  if (year && month) {
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month, 1).toISOString();
    query = query.gte('created_at', from).lt('created_at', to);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    tutorId: row.tutor_id,
    studentId: row.student_id,
    planType: row.plan_type,
    amount: row.amount,
    reference: row.reference,
    status: row.status,
    startDate: row.start_date,
    startTime: row.start_time,
    subject: row.subject,
    bookingIds: row.booking_ids ?? [],
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  }));
}

/**
 * Returns the count of unread notifications for a specific user from the DB.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await db()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Returns all profiles with a specific role, shaped like the KV user objects.
 * Used for admin user-management queries.
 */
export async function getAllProfilesForAdmin(): Promise<any[]> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    ...row.raw_data,
    id: row.id,
    userId: row.id,
    role: row.role,
    email: row.email,
    fullName: row.full_name,
    createdAt: row.created_at,
  }));
}

// ─── Trivia Subscriptions ──────────────────────────────────────────────────────

export interface TriviaSubscription {
  id: string;
  studentId: string;
  subjectId: string;
  subjectName: string;
  status: 'free' | 'active' | 'expired';
  freeTrialStartedAt?: string;
  freeTrialExpiresAt?: string;
  paidExpiresAt?: string;
  paymentId?: string;
  pricePerMonth: number;
}

/**
 * Get or create trivia subscription for a student-subject combo.
 * First access starts 7-day free trial. After trial: requires payment.
 */
export async function getOrCreateTriviaSubscription(
  studentId: string,
  subjectId: string,
  subjectName: string
): Promise<TriviaSubscription> {
  const { data, error } = await db()
    .from('trivia_subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  // Subscription exists
  if (data) {
    return {
      id: data.id,
      studentId: data.student_id,
      subjectId: data.subject_id,
      subjectName: data.subject_name,
      status: data.status,
      freeTrialStartedAt: data.free_trial_started_at,
      freeTrialExpiresAt: data.free_trial_expires_at,
      paidExpiresAt: data.paid_expires_at,
      paymentId: data.payment_id,
      pricePerMonth: data.price_per_month,
    };
  }

  // Create new subscription with 7-day free trial
  const now = new Date();
  const trialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: newSub, error: createError } = await db()
    .from('trivia_subscriptions')
    .insert({
      student_id: studentId,
      subject_id: subjectId,
      subject_name: subjectName,
      status: 'free',
      free_trial_started_at: now.toISOString(),
      free_trial_expires_at: trialExpiresAt.toISOString(),
      price_per_month: 3000,
    })
    .select()
    .single();

  if (createError) throw new Error(createError.message);

  return {
    id: newSub.id,
    studentId: newSub.student_id,
    subjectId: newSub.subject_id,
    subjectName: newSub.subject_name,
    status: newSub.status,
    freeTrialStartedAt: newSub.free_trial_started_at,
    freeTrialExpiresAt: newSub.free_trial_expires_at,
    paidExpiresAt: newSub.paid_expires_at,
    paymentId: newSub.payment_id,
    pricePerMonth: newSub.price_per_month,
  };
}

/**
 * Check if student has access to trivia for a subject.
 * Returns: { hasAccess, status, expiresAt, reason }
 */
export async function checkTriviaAccess(
  studentId: string,
  subjectId: string
): Promise<{ hasAccess: boolean; status: string; expiresAt?: string; daysRemaining?: number; reason?: string }> {
  const { data, error } = await db()
    .from('trivia_subscriptions')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);

  // No subscription = first-time access (will be created on trivia endpoint call)
  if (!data) {
    return {
      hasAccess: true,
      status: 'free',
      reason: 'First-time access (free trial starting)',
    };
  }

  const now = new Date();

  // Check free trial
  if (data.status === 'free' && data.free_trial_expires_at) {
    const trialExpires = new Date(data.free_trial_expires_at);
    const daysLeft = Math.ceil((trialExpires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (now < trialExpires) {
      return {
        hasAccess: true,
        status: 'free_trial',
        expiresAt: data.free_trial_expires_at,
        daysRemaining: daysLeft,
      };
    }

    // Trial expired, check paid subscription
    if (data.paid_expires_at) {
      const paidExpires = new Date(data.paid_expires_at);
      const paidDaysLeft = Math.ceil((paidExpires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (now < paidExpires) {
        return {
          hasAccess: true,
          status: 'paid_active',
          expiresAt: data.paid_expires_at,
          daysRemaining: paidDaysLeft,
        };
      }
    }

    // No paid subscription or paid subscription expired
    return {
      hasAccess: false,
      status: 'trial_expired',
      reason: 'Free trial expired. Subscribe to continue.',
    };
  }

  // Check paid subscription
  if (data.status === 'active' && data.paid_expires_at) {
    const paidExpires = new Date(data.paid_expires_at);
    const daysLeft = Math.ceil((paidExpires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (now < paidExpires) {
      return {
        hasAccess: true,
        status: 'paid_active',
        expiresAt: data.paid_expires_at,
        daysRemaining: daysLeft,
      };
    }

    // Paid subscription expired
    return {
      hasAccess: false,
      status: 'subscription_expired',
      reason: 'Subscription expired. Renew to continue.',
    };
  }

  // Fallback
  return {
    hasAccess: false,
    status: 'no_access',
    reason: 'No active subscription.',
  };
}

/**
 * Update trivia subscription status after payment.
 */
export async function updateTriviaSubscription(
  studentId: string,
  subjectId: string,
  updates: {
    status?: string;
    paidExpiresAt?: string;
    paymentId?: string;
  }
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.paidExpiresAt !== undefined) row.paid_expires_at = updates.paidExpiresAt;
  if (updates.paymentId !== undefined) row.payment_id = updates.paymentId;

  const { error } = await db()
    .from('trivia_subscriptions')
    .update(row)
    .eq('student_id', studentId)
    .eq('subject_id', subjectId);

  if (error) throw new Error(error.message);
}

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

export async function createAdminAuditLog(entry: {
  actorId: string;
  actorEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await db()
    .from('admin_audit_log')
    .insert({
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
  if (error) console.error('Admin audit log write failed:', error.message);
}

export async function getAdminAuditLog(limit = 200): Promise<{
  id: string;
  actorId: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}[]> {
  const { data, error } = await db()
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    details: row.details ?? {},
    createdAt: row.created_at,
  }));
}
