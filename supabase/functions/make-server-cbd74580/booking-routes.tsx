import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';
import { collectBookingsForUser } from './messaging-access.tsx';
import { logAuditEvent } from './activity-log.tsx';
import { releaseMaturedEarnings } from './payment-routes.tsx';

const app = new Hono();

function resolveParticipantName(p: any, fallback: string): string {
  return (
    p?.fullName ||
    p?.full_name ||
    p?.name ||
    (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) ||
    fallback
  );
}

function formatSessionDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00+01:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Africa/Lagos',
  });
}

// Helper to get user from access token
async function getUserFromToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  
  const userId = accessToken; // In production, you'd verify the token properly
  const user = await kv.get(`user:${userId}`) as any;
  return user;
}

// Get bookings for a user.
// Supports role-specific query params:
//   ?tutorId=<id>   - Get only bookings where user is the TUTOR (teaching sessions)
//   ?studentId=<id> - Get only bookings where user is the STUDENT (attending sessions)
//   No params       - Get all bookings involving the authenticated user (all roles)
app.get('/bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

    // Verify token
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    /** Normalize DB/KV rows so enrichment always sees camelCase ids. */
    const normalizeBookingPayload = (b: Record<string, unknown>) => ({
      ...b,
      id: b.id as string,
      tutorId: (b.tutorId ?? b.tutor_id) as string | undefined,
      studentId: (b.studentId ?? b.student_id) as string | undefined,
      userId: (b.userId ?? b.user_id) as string | undefined,
      date: b.date as string | undefined,
      startTime: (b.startTime ?? b.start_time) as string | undefined,
      endTime: (b.endTime ?? b.end_time) as string | undefined,
      duration: b.duration as number | undefined,
      subject: b.subject as string | undefined,
      status: b.status as string | undefined,
      paymentStatus: (b.paymentStatus ?? b.payment_status) as string | undefined,
      meetLink: (b.meetLink ?? b.meet_link) as string | undefined,
      paymentId: (b.paymentId ?? b.payment_id) as string | undefined,
      planType: (b.planType ?? b.plan_type) as string | undefined,
      sessionNumber: (b.sessionNumber ?? b.session_number) as number | undefined,
      totalSessions: (b.totalSessions ?? b.total_sessions) as number | undefined,
    });

    // Release matured earnings (and flip 'confirmed' → 'completed') for
    // whichever tutor(s) this call touches, before reading bookings back —
    // otherwise a session that genuinely happened can sit at 'confirmed'
    // forever from a parent's point of view, since nothing else in the app
    // reliably visits a tutor's own balance screen to trigger the sweep
    // (see releaseMaturedEarnings in payment-routes.tsx). This is exactly
    // what silently broke "sessions awaiting review" — a parent can only
    // rate a 'completed' session, and nothing was ever marking it that way
    // from their side of the app.
    const sweepTutor = (tutorId: string) =>
      releaseMaturedEarnings(tutorId).catch((e: any) =>
        console.warn(`GET /bookings: releaseMaturedEarnings(${tutorId}) failed (non-fatal):`, e.message)
      );

    // Fetch bookings based on role context (role-specific filtering)
    let rawBookings: ReturnType<typeof normalizeBookingPayload>[];
    if (c.req.query('tutorId')) {
      const tutorId = c.req.query('tutorId')!;
      await sweepTutor(tutorId);
      rawBookings = (await db.getBookingsByTutorId(tutorId)).map((row) =>
        normalizeBookingPayload(row as unknown as Record<string, unknown>)
      );
    } else if (c.req.query('studentId')) {
      const studentId = c.req.query('studentId')!;
      const preSweep = await db.getBookingsByStudentId(studentId);
      const tutorIds = [...new Set(preSweep.map((b) => b.tutorId).filter(Boolean))];
      await Promise.all(tutorIds.map(sweepTutor));
      rawBookings = (await db.getBookingsByStudentId(studentId)).map((row) =>
        normalizeBookingPayload(row as unknown as Record<string, unknown>)
      );
    } else {
      // Default + `?persona=`: include auth user AND linked child profile (bookings often use child id as student_id)
      const preSweep = await collectBookingsForUser(user.id);
      const tutorIds = [...new Set(preSweep.map((b: any) => b.tutorId ?? b.tutor_id).filter(Boolean))];
      await Promise.all(tutorIds.map(sweepTutor));
      const merged = await collectBookingsForUser(user.id);
      rawBookings = merged.map((row) => normalizeBookingPayload(row));
    }

    // Enrich each booking with tutor/student display names and meet link.
    // Resolution order per ID:
    //   1. DB profiles table  — covers tutor/parent Supabase accounts
    //   2. KV user:${id}      — covers tutor/parent profiles stored only in KV
    //   3. KV child:${id}     — covers child profiles (never in the DB, added via AddChildDialog)
    const profileIds = [
      ...new Set(
        rawBookings.flatMap((b) =>
          [b.tutorId, b.studentId, b.userId].filter((x): x is string => typeof x === 'string' && x.length > 0)
        ),
      ),
    ];
    const profileMap: Record<string, any> = {};
    if (profileIds.length > 0) {
      await Promise.all(
        profileIds.map(async (id) => {
          try {
            const dbProfile = await db.getProfile(id);
            if (dbProfile) { profileMap[id] = dbProfile; return; }
            const kvUser = await kv.get(`user:${id}`) as any;
            if (kvUser) { profileMap[id] = kvUser; return; }
            const kvChild = await kv.get(`child:${id}`) as any;
            if (kvChild) profileMap[id] = kvChild;
          } catch (_) { /* non-fatal */ }
        }),
      );
    }

    // Name fields differ by profile source: DB returns fullName, KV user profiles
    // may use fullName/full_name/name, child profiles use firstName+lastName.
    const resolveName = (p: any, fallback: string): string =>
      p?.fullName ||
      p?.full_name ||
      p?.name ||
      (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) ||
      fallback;

    // Same field every profile-photo upload writes (see
    // profile-avatar-routes.tsx) — resolved here so every screen that reads
    // a booking's tutor/student (Chatroom's contact list, StudentDashboard
    // and ParentReviewsTab's session cards) can show a real photo instead of
    // initials, without each of them re-implementing this lookup.
    const resolvePhoto = (p: any): string | null => p?.photoUrl || p?.photo_url || null;

    const bookings = rawBookings.map((b) => {
      const tutor   = (b.tutorId && profileMap[b.tutorId])     || {};
      const student = (b.studentId && profileMap[b.studentId]) || {};
      const parent  = (b.userId && profileMap[b.userId])       || {};

      return {
        ...b,
        tutorName:      resolveName(tutor,   'Tutor'),
        studentName:    resolveName(student, 'Student'),
        parentName:     resolveName(parent,  ''),
        tutorPhoto:     resolvePhoto(tutor),
        studentPhoto:   resolvePhoto(student),
        parentPhoto:    resolvePhoto(parent),
        parentId:       b.userId,
        googleMeetLink: b.meetLink ?? null,
        price:          String(15000),
        createdAt:      new Date().toISOString(),
      };
    });

    return c.json({ bookings });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return c.json({ error: error.message || 'Failed to fetch bookings' }, 500);
  }
});

// Get tutor availability
app.get('/tutors/:tutorId/availability', async (c) => {
  try {
    const tutorId = c.req.param('tutorId');
    const date = c.req.query('date');
    const studentId = c.req.query('studentId');

    if (!date) {
      return c.json({ error: 'Date parameter is required' }, 400);
    }

    // Fetch booked slots using indexed DB queries (replaces full-table KV scan)
    const [tutorBookings, studentBookings] = await Promise.all([
      db.getBookingsByTutorAndDate(tutorId, date),
      studentId ? db.getBookingsByStudentAndDate(studentId, date) : Promise.resolve([]),
    ]);

    // Generate time slots from 9 AM to 8 PM
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

        const blockedByTutor = tutorBookings.some((b) =>
          time >= b.startTime && time < b.endTime
        );
        const blockedByStudent = studentBookings.some((b) =>
          time >= b.startTime && time < b.endTime
        );

        slots.push({
          time,
          available: !blockedByTutor && !blockedByStudent,
          blocked: blockedByTutor || blockedByStudent,
        });
      }
    }

    return c.json({ slots });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return c.json({ error: error.message || 'Failed to fetch availability' }, 500);
  }
});

// Get all tutors — returns full public profile (no contact info)
app.get('/tutors', async (c) => {
  try {
    const allTutors = await db.getProfilesByRole('tutor');

    // Resolve name regardless of which key the signup stored it under
    const resolveName = (t: any) =>
      t.fullName || t.full_name || t.name ||
      (t.firstName ? `${t.firstName} ${t.lastName ?? ''}`.trim() : null) ||
      'Unknown Tutor';

    const tutors = allTutors
      .filter((u: any) => {
        const status = String(u.verificationStatus || u.verification_status || '').toLowerCase();
        return status === 'verified' || status === 'approved';
      })
      .map((tutor: any) => ({
        // ── Identity ─────────────────────────────────────────────────────────
        id:               tutor.id,
        name:             resolveName(tutor),
        headline:         tutor.headline         || '',
        location:         tutor.location         || '',

        // ── Credentials ──────────────────────────────────────────────────────
        educationLevel:   tutor.education_level  || tutor.educationLevel  || '',
        institution:      tutor.institution      || '',
        experienceYears:  tutor.experience_years ?? tutor.experienceYears ?? null,
        qualifications:   tutor.qualifications   || '',

        // ── About ────────────────────────────────────────────────────────────
        bio:              tutor.bio   || tutor.about || '',
        teachingStyle:    tutor.teaching_style   || tutor.teachingStyle   || '',

        // ── Subjects & teaching scope ────────────────────────────────────────
        subjects:         tutor.subjects         || [],
        ageGroups:        tutor.age_groups       || tutor.ageGroups       || [],
        classes:          tutor.classes          || [],

        // ── Format ───────────────────────────────────────────────────────────
        teachingFormat:   tutor.teaching_format  || tutor.teachingFormat  || '',
        groupSize:        tutor.group_size       || tutor.groupSize       || '',

        // ── Specialisms ──────────────────────────────────────────────────────
        examBoards:          tutor.exam_boards          || tutor.examBoards          || [],
        learningDifficulties: tutor.learning_difficulties || tutor.learningDifficulties || [],
        methodologies:       tutor.methodologies         || [],
        languages:           tutor.languages             || [],

        // ── Safeguarding ─────────────────────────────────────────────────────
        dbsChecked:    tutor.dbs_checked  === true || tutor.dbsChecked  === true,
        hasInsurance:  tutor.has_insurance === true || tutor.hasInsurance === true,

        // ── Engagement ───────────────────────────────────────────────────────
        rating:        tutor.rating ?? tutor.averageRating ?? null,
        hourlyRate:    15000,   // platform-fixed
        availability:  tutor.availability || {},
      }));

    return c.json({ tutors });
  } catch (error: any) {
    console.error('Error fetching tutors:', error);
    return c.json({ error: error.message || 'Failed to fetch tutors' }, 500);
  }
});

// Create a new booking
// Disabled pending a payment gate: this created a fully confirmed booking —
// real Google Calendar event on the tutor's calendar, confirmation emails to
// parent/tutor/student — straight off client-supplied fields, with no payment
// check anywhere in the handler. No live screen calls this (the real booking
// flow is BookSessionWithPayment.tsx -> /payments/initiate-plan ->
// /payments/confirm-plan, which does verify payment before creating
// bookings), but the route itself was still directly callable by anyone with
// a valid token, creating real confirmed sessions for free. Re-enable by
// restoring the body below once it verifies payment first, the same way
// confirmPlanPayment() does.
app.post('/bookings', async (c) => {
  return c.json(
    { error: 'Direct booking creation is not available. Please book and pay through the app.' },
    503,
  );
});

/* Previous implementation, kept for when this is rebuilt behind a payment check:

app.post('/bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const {
      tutorId,
      studentId,
      date,
      startTime,
      endTime,
      duration,
      price,
      notes
    } = await c.req.json();

    if (!tutorId || !studentId || !date || !startTime || !endTime) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check if the slot is still available
    const allBookings = await kv.getByPrefix('booking:');
    const conflictingBooking = allBookings.find((b: any) =>
      (b.tutorId === tutorId || b.studentId === studentId) &&
      b.date === date &&
      b.status === 'confirmed' &&
      (
        (startTime >= b.startTime && startTime < b.endTime) ||
        (endTime > b.startTime && endTime <= b.endTime) ||
        (startTime <= b.startTime && endTime >= b.endTime)
      )
    );

    if (conflictingBooking) {
      return c.json({ error: 'Time slot is no longer available' }, 409);
    }

    // Tutor: KV first (most up-to-date for tutor-specific fields), then DB
    let tutor: any = await kv.get(`user:${tutorId}`);
    if (!tutor) tutor = await db.getProfile(tutorId);

    // Student: child KV record first, then user KV (linked student accounts), then DB
    let student: any = await kv.get(`child:${studentId}`);
    if (!student) student = await kv.get(`user:${studentId}`);
    if (!student) student = await db.getProfile(studentId);

    if (!tutor || !student) {
      return c.json({ error: 'Tutor or student not found' }, 404);
    }

    // Parent: from child's parentId or booking's userId, KV first then DB
    const parentId = student.parentId || null;
    let parent: any = parentId ? await kv.get(`user:${parentId}`) : null;
    if (!parent && parentId) parent = await db.getProfile(parentId);

    const parentEmail = parent?.email || '';
    const tutorEmail  = tutor?.email  || '';
    const tutorName   = resolveParticipantName(tutor,   'Your Tutor');
    const studentName = resolveParticipantName(student, 'Your Student');
    const parentName  = resolveParticipantName(parent,  'Parent');

    // Create a real Google Calendar event with Meet link using the tutor's connected calendar.
    // Falls back to a generic Meet URL if the tutor hasn't connected their calendar.
    const { meetLink, eventId } = await createCalendarEventForBooking(
      tutorId, tutorName, tutorEmail, studentName, parentEmail,
      date, startTime, endTime, notes || ''
    );

    // Create booking
    const bookingId = `${Date.now()}_${tutorId}_${studentId}`;
    const booking = {
      id: bookingId,
      tutorId,
      studentId,
      parentId: student.parentId,
      date,
      startTime,
      endTime,
      duration,
      price,
      notes: notes || '',
      status: 'confirmed',
      tutorName,
      studentName,
      createdAt: new Date().toISOString(),
      googleCalendarTutorEventId: eventId,
      googleCalendarStudentEventId: null,
      googleMeetLink: meetLink || 'https://meet.google.com/new',
    };

    await kv.set(`booking:${bookingId}`, booking);

    // Send confirmation emails to parent and tutor
    const formattedDate = formatSessionDate(date);
    const timeOnly = String(startTime).replace(/\s*WAT\s*$/i, '').trim();
    const subject = notes || 'Tutoring Session'; // Use notes as subject if provided
    const dashboardBase =
      Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_APP_URL') || 'https://app.knowledgefonsacademy.com';
    const dashboardLink = `${dashboardBase}/dashboard`;
    const meet = meetLink || 'https://meet.google.com/new';

    // Send email to parent
    if (parentEmail) {
      const parentEmailData = emailTemplates.bookingConfirmation(
        parentName,
        studentName,
        tutorName,
        formattedDate,
        timeOnly,
        subject,
        meet,
      );
      await sendEmail({
        to: parentEmail,
        subject: parentEmailData.subject,
        html: parentEmailData.html,
        replyTo: tutorEmail,
      });
    }

    // Send email to tutor
    if (tutorEmail) {
      const tutorEmailData = emailTemplates.tutorBookingNotification(
        tutorName,
        parentName,
        studentName,
        formattedDate,
        timeOnly,
        subject,
        `${dashboardBase}/dashboard?tab=bookings&bookingId=${bookingId}`,
      );
      await sendEmail({
        to: tutorEmail,
        subject: tutorEmailData.subject,
        html: tutorEmailData.html,
      });
    }

    const studentEmail =
      typeof student?.email === 'string' && student.email.includes('@')
        ? student.email.trim()
        : undefined;
    if (studentEmail) {
      const whenLabel = `${formattedDate} · ${timeOnly} WAT`;
      const stuTpl = emailTemplates.studentSessionUpdate(
        studentName,
        tutorName,
        subject,
        whenLabel,
        meet,
        dashboardLink,
        false,
      );
      await sendEmail({
        to: studentEmail,
        subject: stuTpl.subject,
        html: stuTpl.html,
      }).catch((err) => console.error('Error sending student booking email:', err));
    }

    return c.json({
      success: true,
      booking,
      message: 'Booking created successfully. Confirmation emails sent.'
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return c.json({ error: error.message || 'Failed to create booking' }, 500);
  }
});

*/

// Calculate refund for a booking (extracted logic, used before cancellation)
app.post('/bookings/:bookingId/calculate-refund', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    
    // Try Database first, fallback to KV Store
    let booking = await db.getBooking(bookingId);
    if (!booking) {
      booking = await kv.get(`booking:${bookingId}`) as any;
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    if (booking.status !== 'confirmed') {
      return c.json({ error: 'Only confirmed bookings can have refunds calculated' }, 400);
    }

    // Calculate refund based on cancellation policy
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const b = booking as any;
    const price = parseFloat(String(b.price ?? '0'));
    let refundPercentage = 0;
    let refundAmount = '0.00';
    let policy = '';
    
    if (hoursUntilBooking > 24) {
      refundPercentage = 100;
      refundAmount = price.toFixed(2);
      policy = 'Full refund - cancelled >24 hours before booking';
    } else if (hoursUntilBooking > 0) {
      refundPercentage = 50;
      refundAmount = (price * 0.5).toFixed(2);
      policy = 'Half refund - cancelled <24 hours before booking';
    } else {
      refundPercentage = 0;
      refundAmount = '0.00';
      policy = 'No refund - booking has already started';
    }

    return c.json({
      refundAmount,
      refundPercentage,
      policy,
      bookingId,
      price: b.price,
      hoursUntilBooking: Math.max(0, hoursUntilBooking).toFixed(2),
    });
  } catch (error: any) {
    console.error('Error calculating refund:', error);
    return c.json({ error: error.message || 'Failed to calculate refund' }, 500);
  }
});

// Cancel a booking
app.post('/bookings/:bookingId/cancel', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data: { user } } = await supabaseAuth.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');

    let booking = await db.getBooking(bookingId);
    let isKvBooking = false;
    if (!booking) {
      booking = await kv.get(`booking:${bookingId}`) as any;
      if (booking) isKvBooking = true;
    }

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    if (booking.status !== 'confirmed') {
      return c.json({ error: 'Booking cannot be cancelled' }, 400);
    }

    const ownerId = isKvBooking ? (booking as any).parentId : (booking as any).userId;
    if (user.id !== ownerId && user.id !== booking.tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    // Get refund calculation
    const refundCalc = await calculateBookingRefund(booking);

    // Update booking
    const updatedBooking = {
      ...booking,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      refundAmount: refundCalc.refundAmount,
      refundPercentage: refundCalc.refundPercentage,
      refundPolicy: refundCalc.policy,
      cancellationReason: 'Cancelled by user',
    };

    await kv.set(`booking:${bookingId}`, updatedBooking);

    await logAuditEvent({
      userId: user.id,
      action: 'booking_cancelled',
      category: 'bookings',
      description: `Booking ${bookingId} cancelled by ${user.id === booking.tutorId ? 'tutor' : 'parent/student'} — refund: ${refundCalc.refundPercentage}%`,
      metadata: { bookingId, cancelledBy: user.id, refundAmount: refundCalc.refundAmount, refundPercentage: refundCalc.refundPercentage },
    });

    const dateLabel = formatSessionDate(booking.date);
    const timeOnly = String(booking.startTime).replace(/\s*WAT\s*$/i, '').trim();
    const timeLabel = `${timeOnly} WAT`;

    try {
      let tutor: any = await kv.get(`user:${booking.tutorId}`);
      if (!tutor) tutor = await db.getProfile(booking.tutorId);

      let student: any = await kv.get(`child:${booking.studentId}`);
      if (!student) student = await kv.get(`user:${booking.studentId}`);
      if (!student) student = await db.getProfile(booking.studentId);

      const parentUserId = isKvBooking ? (booking as any).parentId : (booking as any).userId;
      let parent: any = parentUserId ? await kv.get(`user:${parentUserId}`) : null;
      if (!parent && parentUserId) parent = await db.getProfile(parentUserId);

      const tutorName = resolveParticipantName(tutor, 'Tutor');
      const studentName = resolveParticipantName(student, 'Student');
      const parentName = resolveParticipantName(parent, 'Parent');
      const reasonLine = user.id === booking.tutorId
        ? 'Cancelled by the tutor'
        : 'Cancelled by the parent or guardian';

      if (parent?.email) {
        const tpl = emailTemplates.bookingCancellation(
          parentName,
          tutorName,
          dateLabel,
          timeLabel,
          reasonLine,
        );
        await sendEmail({ to: parent.email, ...tpl }).catch((e) =>
          console.warn('cancel email parent:', e)
        );
      }
      if (tutor?.email) {
        const tpl = emailTemplates.bookingCancellation(
          tutorName,
          parentName,
          dateLabel,
          timeLabel,
          reasonLine,
        );
        await sendEmail({ to: tutor.email, ...tpl }).catch((e) =>
          console.warn('cancel email tutor:', e)
        );
      }
      const studentEmail =
        typeof student?.email === 'string' && student.email.includes('@')
          ? student.email.trim()
          : undefined;
      if (studentEmail) {
        const stuTpl = emailTemplates.bookingCancellation(
          studentName,
          tutorName,
          dateLabel,
          timeLabel,
          reasonLine,
        );
        await sendEmail({ to: studentEmail, ...stuTpl }).catch((e) =>
          console.warn('cancel email student:', e)
        );
      }
    } catch (e) {
      console.warn('Cancellation emails (non-fatal):', e);
    }

    return c.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return c.json({ error: error.message || 'Failed to cancel booking' }, 500);
  }
});

// Reschedule a booking
app.post('/bookings/:bookingId/reschedule', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);

    const bookingId = c.req.param('bookingId');
    
    // Try Database first, fallback to KV Store for single-session bookings
    let booking = await db.getBooking(bookingId);
    let isKvBooking = false;

    if (!booking) {
      booking = await kv.get(`booking:${bookingId}`) as any;
      if (booking) isKvBooking = true;
    }

    if (!booking) return c.json({ error: 'Booking not found' }, 404);
    if (booking.status !== 'confirmed') return c.json({ error: 'Only confirmed bookings can be rescheduled' }, 400);

    const oldDate = booking.date;
    const oldStartTime = booking.startTime;

    // Must be >24 h before the original session
    const originalDT = new Date(`${booking.date}T${booking.startTime}+01:00`);
    const hoursUntil = (originalDT.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil <= 24) {
      return c.json({ error: 'Bookings can only be rescheduled more than 24 hours in advance' }, 400);
    }

    // Authorization: must be the parent who booked or the tutor
    // Database uses .userId, KV uses .parentId
    const ownerId = isKvBooking ? (booking as any).parentId : (booking as any).userId;
    if (user.id !== ownerId && user.id !== booking.tutorId) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const { newDate, newStartTime, newEndTime } = await c.req.json();
    if (!newDate || !newStartTime || !newEndTime) {
      return c.json({ error: 'newDate, newStartTime and newEndTime are required' }, 400);
    }

    // New slot must also be >24 h in the future
    const newDT = new Date(`${newDate}T${newStartTime}+01:00`);
    const hoursUntilNew = (newDT.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilNew <= 24) {
      return c.json({ error: 'New session time must be more than 24 hours in the future' }, 400);
    }

    // Conflict check for new slot - check database for conflicts
    const conflictingBookings = await db.getBookingsByTutorAndDate(booking.tutorId, newDate);
    let conflict = conflictingBookings.find((b: any) =>
      b.id !== bookingId &&
      b.status === 'confirmed' &&
      (
        (newStartTime >= b.startTime && newStartTime < b.endTime) ||
        (newEndTime > b.startTime && newEndTime <= b.endTime) ||
        (newStartTime <= b.startTime && newEndTime >= b.endTime)
      )
    );

    // Also check KV for conflicts
    if (!conflict) {
      const allKv = await kv.getByPrefix('booking:');
      conflict = allKv.find((b: any) => 
        b.id !== bookingId &&
        b.tutorId === booking.tutorId &&
        b.date === newDate &&
        b.status === 'confirmed' &&
        (
          (newStartTime >= b.startTime && newStartTime < b.endTime) ||
          (newEndTime > b.startTime && newEndTime <= b.endTime) ||
          (newStartTime <= b.startTime && newEndTime >= b.endTime)
        )
      );
    }

    if (conflict) return c.json({ error: 'The selected time slot is not available' }, 409);

    let updated;
    if (isKvBooking) {
      // Update KV Store
      updated = {
        ...booking,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        rescheduledAt: new Date().toISOString(),
      };
      await kv.set(`booking:${bookingId}`, updated);
    } else {
      // Update the booking in the DATABASE
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
        })
        .eq('id', bookingId);

      if (updateError) {
        throw new Error(`Failed to update booking: ${updateError.message}`);
      }
      updated = await db.getBooking(bookingId);
    }

    await logAuditEvent({
      userId: user.id,
      action: 'booking_rescheduled',
      category: 'bookings',
      description: `Booking ${bookingId} rescheduled by ${user.id === booking.tutorId ? 'tutor' : 'parent/student'}: ${oldDate} ${oldStartTime} → ${newDate} ${newStartTime}`,
      metadata: { bookingId, rescheduledBy: user.id, oldDate, oldStartTime, newDate, newStartTime },
    });

    const finalRecord = { ...booking, ...(updated || {}) };
    const dashboardBase =
      Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_APP_URL') || 'https://app.knowledgefonsacademy.com';
    const dashboardLink = `${dashboardBase}/dashboard`;
    const meetLink =
      (finalRecord as any).googleMeetLink ||
      (finalRecord as any).meetLink ||
      'https://meet.google.com/new';
    const movedByLabel =
      user.id === booking.tutorId
        ? 'Rescheduled by your tutor'
        : 'Rescheduled by the parent or guardian';

    const oldWhen = `${formatSessionDate(oldDate)} · ${String(oldStartTime).replace(/\s*WAT\s*$/i, '').trim()} WAT`;
    const newWhen = `${formatSessionDate(newDate)} · ${String(newStartTime).replace(/\s*WAT\s*$/i, '').trim()} WAT`;
    const subjectLine =
      (finalRecord as any).subject || (finalRecord as any).notes || 'Tutoring session';

    try {
      const parentUserId = isKvBooking ? (booking as any).parentId : (booking as any).userId;
      let parent: any = parentUserId ? await kv.get(`user:${parentUserId}`) : null;
      if (!parent && parentUserId) parent = await db.getProfile(parentUserId);

      let tutor: any = await kv.get(`user:${booking.tutorId}`);
      if (!tutor) tutor = await db.getProfile(booking.tutorId);

      let student: any = await kv.get(`child:${booking.studentId}`);
      if (!student) student = await kv.get(`user:${booking.studentId}`);
      if (!student) student = await db.getProfile(booking.studentId);

      const tutorName = resolveParticipantName(tutor, 'Tutor');
      const studentName = resolveParticipantName(student, 'Student');
      const parentName = resolveParticipantName(parent, 'Parent');

      if (parent?.email) {
        const tpl = emailTemplates.sessionRescheduled(
          parentName,
          studentName,
          tutorName,
          oldWhen,
          newWhen,
          meetLink,
          dashboardLink,
          movedByLabel,
        );
        await sendEmail({ to: parent.email, ...tpl }).catch((e) =>
          console.warn('reschedule email parent:', e)
        );
      }
      if (tutor?.email) {
        const tpl = emailTemplates.sessionRescheduled(
          tutorName,
          studentName,
          tutorName,
          oldWhen,
          newWhen,
          meetLink,
          dashboardLink,
          movedByLabel,
        );
        await sendEmail({ to: tutor.email, ...tpl }).catch((e) =>
          console.warn('reschedule email tutor:', e)
        );
      }
      const studentEmail =
        typeof student?.email === 'string' && student.email.includes('@')
          ? student.email.trim()
          : undefined;
      if (studentEmail) {
        const stuTpl = emailTemplates.studentSessionUpdate(
          studentName,
          tutorName,
          subjectLine,
          newWhen,
          meetLink,
          dashboardLink,
          true,
        );
        await sendEmail({ to: studentEmail, ...stuTpl }).catch((e) =>
          console.warn('reschedule email student:', e)
        );
      }
    } catch (e) {
      console.warn('Reschedule emails (non-fatal):', e);
    }

    return c.json({ success: true, booking: updated, message: 'Booking rescheduled successfully' });
  } catch (error: any) {
    console.error('Error rescheduling booking:', error);
    return c.json({ error: error.message || 'Failed to reschedule booking' }, 500);
  }
});

// Get session reports for multiple bookings (batch endpoint)
app.get('/bookings/:ids/reports', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Extract booking IDs from path or query
    const idsParam = c.req.param('ids') || c.req.query('ids') || '';
    const bookingIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);

    if (bookingIds.length === 0) {
      return c.json({ error: 'No booking IDs provided' }, 400);
    }

    // Fetch all reports concurrently. Reports submitted via POST
    // /bookings/:bookingId/report (reports-notifications-routes.tsx) are
    // stored at `report:<bookingId>` — this used to look under
    // `session_report_<bookingId>` (an unrelated key from a different report
    // system), so every report ever submitted through the live "View Report"
    // flow came back as "not found".
    const reports = await Promise.all(
      bookingIds.map(async (bookingId) => {
        try {
          const report = await kv.get(`report:${bookingId}`) as any;
          return report || { bookingId, error: 'Report not found' };
        } catch (err) {
          return { bookingId, error: 'Failed to fetch report' };
        }
      })
    );

    return c.json({ 
      bookingIds,
      count: reports.length,
      reports: reports.filter(r => !r.error),
      missing: reports.filter(r => r.error)
    });
  } catch (error: any) {
    console.error('Error fetching batch reports:', error);
    return c.json({ error: error.message || 'Failed to fetch reports' }, 500);
  }
});

export default app;

// Helper function to calculate booking refund
async function calculateBookingRefund(booking: any) {
  const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  const price = parseFloat(booking.price);
  let refundPercentage = 0;
  let refundAmount = '0.00';
  let policy = '';
  
  if (hoursUntilBooking > 24) {
    refundPercentage = 100;
    refundAmount = price.toFixed(2);
    policy = 'Full refund - cancelled >24 hours before booking';
  } else if (hoursUntilBooking > 0) {
    refundPercentage = 50;
    refundAmount = (price * 0.5).toFixed(2);
    policy = 'Half refund - cancelled <24 hours before booking';
  } else {
    refundPercentage = 0;
    refundAmount = '0.00';
    policy = 'No refund - booking has already started';
  }

  return { refundAmount, refundPercentage, policy };
}

// Creates a real Google Calendar event on the tutor's calendar with a Google Meet link.
// Adds the parent as an attendee so they receive an email invite (which blocks their calendar on accept).
// Returns the real Meet link and Calendar event ID, or nulls if the tutor hasn't connected their calendar.
async function createCalendarEventForBooking(
  tutorId: string,
  tutorName: string,
  tutorEmail: string,
  studentName: string,
  parentEmail: string,
  date: string,
  startTime: string,
  endTime: string,
  notes: string,
): Promise<{ meetLink: string | null; eventId: string | null }> {
  try {
    const tokens = await kv.get(`google_calendar_tokens:${tutorId}`) as any;
    if (!tokens?.accessToken) {
      console.log('Tutor has not connected Google Calendar — skipping calendar event creation');
      return { meetLink: null, eventId: null };
    }

    // Refresh access token if expiring within 5 minutes
    let googleAccessToken = tokens.accessToken;
    if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 300000) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
      if (clientId && clientSecret && tokens.refreshToken) {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: tokens.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
          }),
        });
        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          googleAccessToken = refreshed.access_token;
          await kv.set(`google_calendar_tokens:${tutorId}`, {
            ...tokens,
            accessToken: refreshed.access_token,
            expiresAt: Date.now() + (refreshed.expires_in * 1000),
            refreshToken: refreshed.refresh_token || tokens.refreshToken,
          });
        }
      }
    }

    const attendees: { email: string }[] = [];
    if (tutorEmail) attendees.push({ email: tutorEmail });
    if (parentEmail) attendees.push({ email: parentEmail });

    const event = {
      summary: `Knowledge Fons Academy: ${tutorName} & ${studentName}`,
      description: `Knowledge Fons Academy tutoring session\n\nStudent: ${studentName}\nTutor: ${tutorName}${notes ? `\n\nNotes: ${notes}` : ''}`,
      start: { dateTime: `${date}T${startTime}:00`, timeZone: 'Africa/Lagos' },
      end: { dateTime: `${date}T${endTime}:00`, timeZone: 'Africa/Lagos' },
      attendees,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    };

    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      },
    );

    if (!response.ok) {
      console.error('Google Calendar event creation failed:', await response.text());
      return { meetLink: null, eventId: null };
    }

    const createdEvent = await response.json();
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      (ep: any) => ep.entryPointType === 'video'
    )?.uri || null;

    console.log('✅ Google Calendar event created:', createdEvent.id, '| Meet:', meetLink);
    return { meetLink, eventId: createdEvent.id || null };
  } catch (error: any) {
    console.error('Error creating Google Calendar event:', error.message);
    return { meetLink: null, eventId: null };
  }
}