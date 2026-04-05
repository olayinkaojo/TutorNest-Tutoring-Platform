import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Helper to get user from access token
async function getUserFromToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  
  const userId = accessToken; // In production, you'd verify the token properly
  const user = await kv.get(`user:${userId}`) as any;
  return user;
}

// Get all bookings for a user
app.get('/bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all bookings and filter by user
    const allBookings = await kv.getByPrefix('booking:');
    
    // For now, return all bookings (in production, filter by user role)
    return c.json({ bookings: allBookings || [] });
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

    // Get tutor's existing bookings for the date
    const allBookings = await kv.getByPrefix('booking:');
    const tutorBookings = allBookings.filter((b: any) => 
      b.tutorId === tutorId && b.date === date && b.status === 'confirmed'
    );

    // Get student's existing bookings for the date
    const studentBookings = studentId ? allBookings.filter((b: any) => 
      b.studentId === studentId && b.date === date && b.status === 'confirmed'
    ) : [];

    // Generate time slots from 9 AM to 8 PM
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if slot is blocked by tutor or student bookings
        const blockedByTutor = tutorBookings.some((b: any) => {
          const bookingStart = b.startTime;
          const bookingEnd = b.endTime;
          return time >= bookingStart && time < bookingEnd;
        });

        const blockedByStudent = studentBookings.some((b: any) => {
          const bookingStart = b.startTime;
          const bookingEnd = b.endTime;
          return time >= bookingStart && time < bookingEnd;
        });

        slots.push({
          time,
          available: !blockedByTutor && !blockedByStudent,
          blocked: blockedByTutor || blockedByStudent
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
    const allUsers = await kv.getByPrefix('user:');
    const tutors = allUsers
      .filter((u: any) => u.role === 'tutor' && u.verificationStatus === 'verified')
      .map((tutor: any) => ({
        id: tutor.userId || tutor.id,
        name: tutor.fullName || tutor.name || 'Unknown Tutor',
        subjects: tutor.subjects || [],
        hourlyRate: tutor.hourlyRate || 25,
        availability: tutor.availability || {}
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

    // Generate Google Meet link
    const googleMeetLink = await generateGoogleMeetLink(date, startTime, endTime, tutor, student);

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
      tutorName: tutor.fullName || tutor.name || 'Unknown Tutor',
      studentName: `${student.firstName} ${student.lastName}`,
      createdAt: new Date().toISOString(),
      googleCalendarTutorEventId: null,
      googleCalendarStudentEventId: null,
      googleMeetLink: googleMeetLink || `https://meet.google.com/new`, // Fallback to generic meet link
    };

    await kv.set(`booking:${bookingId}`, booking);

    // TODO: Send calendar invites via Google Calendar API
    // TODO: Send notification emails

    return c.json({ 
      success: true, 
      booking,
      message: 'Booking created successfully. Calendar invites will be sent shortly.' 
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

// Helper function to generate Google Meet link
async function generateGoogleMeetLink(date: string, startTime: string, endTime: string, tutor: any, student: any): Promise<string | null> {
  try {
    // Generate a unique meeting code
    const meetingCode = generateMeetingCode();
    const meetLink = `https://meet.google.com/${meetingCode}`;
    
    // In production, you would use Google Calendar API to create an actual meeting
    // For now, we'll generate a consistent meeting code based on the booking details
    return meetLink;
  } catch (error) {
    console.error('Error generating Google Meet link:', error);
    return null;
  }
}

// Helper function to generate meeting code
function generateMeetingCode(): string {
  // Generate a Google Meet-style code (xxx-xxxx-xxx)
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const segment1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const segment2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const segment3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment1}-${segment2}-${segment3}`;
}