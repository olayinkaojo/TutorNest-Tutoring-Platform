import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

const app = new Hono();

// Helper to get user from access token
async function getUserFromToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  
  const userId = accessToken; // In production, you'd verify the token properly
  const user = await kv.get(`user:${userId}`) as any;
  return user;
}

// Get bookings for a user.
// Supports optional query params: ?studentId=, ?tutorId= (for parent viewing child's bookings)
// Falls back to the authenticated user's own bookings if no param is provided.
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

    // If a specific student/tutor ID is requested (e.g. parent viewing child's bookings),
    // use that — otherwise default to the authenticated user's own ID.
    const targetId = c.req.query('studentId') || c.req.query('tutorId') || user.id;

    const bookings = await db.getBookingsByUserId(targetId);
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

// Get all tutors
app.get('/tutors', async (c) => {
  try {
    const allTutors = await db.getProfilesByRole('tutor');
    const tutors = allTutors
      .filter((u: any) => u.verificationStatus === 'verified' || u.verificationStatus === 'approved')
      .map((tutor: any) => ({
        id: tutor.id,
        name: tutor.fullName || tutor.name || 'Unknown Tutor',
        subjects: tutor.subjects || [],
        hourlyRate: tutor.hourlyRate || 25,
        availability: tutor.availability || {},
      }));

    return c.json({ tutors });
  } catch (error: any) {
    console.error('Error fetching tutors:', error);
    return c.json({ error: error.message || 'Failed to fetch tutors' }, 500);
  }
});

// Create a new booking
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

    // Get tutor and student details
    const tutor = await kv.get(`user:${tutorId}`) as any;
    const student = await kv.get(`child:${studentId}`) as any;

    if (!tutor || !student) {
      return c.json({ error: 'Tutor or student not found' }, 404);
    }

    // Look up parent to get their email for the calendar invite
    const parent = student.parentId ? await kv.get(`user:${student.parentId}`) as any : null;
    const parentEmail = parent?.email || '';
    const tutorEmail = tutor.email || '';
    const tutorName = tutor.fullName || tutor.name || 'Tutor';
    const studentName = `${student.firstName} ${student.lastName}`;

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

    return c.json({
      success: true,
      booking,
      message: 'Booking created successfully.'
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return c.json({ error: error.message || 'Failed to create booking' }, 500);
  }
});

// Cancel a booking
app.post('/bookings/:bookingId/cancel', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const booking = await kv.get(`booking:${bookingId}`) as any;

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    if (booking.status !== 'confirmed') {
      return c.json({ error: 'Booking cannot be cancelled' }, 400);
    }

    // Calculate refund
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    const price = parseFloat(booking.price);
    let refundAmount = '0.00';
    
    if (hoursUntilBooking > 24) {
      refundAmount = price.toFixed(2); // 100% refund
    } else if (hoursUntilBooking > 0) {
      refundAmount = (price * 0.5).toFixed(2); // 50% refund
    }

    // Update booking
    const updatedBooking = {
      ...booking,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      refundAmount,
      cancellationReason: 'Cancelled by user'
    };

    await kv.set(`booking:${bookingId}`, updatedBooking);

    // TODO: Delete Google Calendar events
    // TODO: Process refund
    // TODO: Send cancellation notifications

    return c.json({ 
      success: true, 
      booking: updatedBooking,
      message: 'Booking cancelled successfully' 
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return c.json({ error: error.message || 'Failed to cancel booking' }, 500);
  }
});

export default app;

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
      summary: `TutorNest: ${tutorName} & ${studentName}`,
      description: `TutorNest tutoring session\n\nStudent: ${studentName}\nTutor: ${tutorName}${notes ? `\n\nNotes: ${notes}` : ''}`,
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