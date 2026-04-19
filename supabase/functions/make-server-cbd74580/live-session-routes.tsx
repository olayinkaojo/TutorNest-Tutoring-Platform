import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Helper to get user from access token
async function getUserFromToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  
  try {
    const users = await kv.getByPrefix('user:');
    const user = users.find((u: any) => u.accessToken === accessToken || u.userId === accessToken || u.id === accessToken);
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// Start a live session
app.post('/sessions/:bookingId/start', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const bookingId = c.req.param('bookingId');
    const booking = await kv.get(`booking:${bookingId}`) as any;

    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Verify user is the tutor or student
    const userId = user.userId || user.id;
    if (booking.tutorId !== userId && booking.studentId !== userId) {
      return c.json({ error: 'Unauthorized to start this session' }, 403);
    }

    // Create live session
    const sessionId = `live_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const liveSession = {
      id: sessionId,
      bookingId,
      tutorId: booking.tutorId,
      studentId: booking.studentId,
      status: 'active',
      startedAt: new Date().toISOString(),
      startedBy: userId,
      endedAt: null,
      duration: 0,
      attendance: {
        tutor: booking.tutorId === userId,
        student: booking.studentId === userId,
      },
      videoRoomId: `tutornest_${bookingId}_${Date.now()}`,
    };

    await kv.set(`live_session:${sessionId}`, liveSession);
    await kv.set(`live_session_booking:${bookingId}`, sessionId);

    // Update booking status
    booking.status = 'in_progress';
    booking.liveSessionId = sessionId;
    await kv.set(`booking:${bookingId}`, booking);

    return c.json({
      success: true,
      session: liveSession,
    });
  } catch (error: any) {
    console.error('Error starting session:', error);
    return c.json({ error: error.message || 'Failed to start session' }, 500);
  }
});

// Join a live session
app.post('/sessions/:sessionId/join', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const sessionId = c.req.param('sessionId');
    const liveSession = await kv.get(`live_session:${sessionId}`) as any;

    if (!liveSession) {
      return c.json({ error: 'Session not found' }, 404);
    }

    if (liveSession.status !== 'active') {
      return c.json({ error: 'Session is not active' }, 400);
    }

    // Verify user is the tutor or student
    const userId = user.userId || user.id;
    if (liveSession.tutorId !== userId && liveSession.studentId !== userId) {
      return c.json({ error: 'Unauthorized to join this session' }, 403);
    }

    // Update attendance
    if (liveSession.tutorId === userId) {
      liveSession.attendance.tutor = true;
    } else if (liveSession.studentId === userId) {
      liveSession.attendance.student = true;
    }

    if (!liveSession.joinedAt && liveSession.attendance.tutor && liveSession.attendance.student) {
      liveSession.joinedAt = new Date().toISOString();
    }

    await kv.set(`live_session:${sessionId}`, liveSession);

    return c.json({
      success: true,
      session: liveSession,
    });
  } catch (error: any) {
    console.error('Error joining session:', error);
    return c.json({ error: error.message || 'Failed to join session' }, 500);
  }
});

// End a live session
app.post('/sessions/:sessionId/end', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const sessionId = c.req.param('sessionId');
    const liveSession = await kv.get(`live_session:${sessionId}`) as any;

    if (!liveSession) {
      return c.json({ error: 'Session not found' }, 404);
    }

    // Verify user is the tutor (only tutors can end sessions)
    const userId = user.userId || user.id;
    if (liveSession.tutorId !== userId) {
      return c.json({ error: 'Only the tutor can end the session' }, 403);
    }

    // Calculate duration
    const startTime = new Date(liveSession.startedAt).getTime();
    const endTime = Date.now();
    const duration = Math.floor((endTime - startTime) / 1000 / 60); // Duration in minutes

    // Update live session
    liveSession.status = 'completed';
    liveSession.endedAt = new Date().toISOString();
    liveSession.duration = duration;
    liveSession.endedBy = userId;

    await kv.set(`live_session:${sessionId}`, liveSession);

    // Update booking status
    const booking = await kv.get(`booking:${liveSession.bookingId}`) as any;
    if (booking) {
      booking.status = 'completed';
      booking.actualDuration = duration;
      booking.completedAt = new Date().toISOString();
      await kv.set(`booking:${liveSession.bookingId}`, booking);

      // Release payment to tutor's available balance
      if (booking.paymentId) {
        const payment = await kv.get(`payment:${booking.paymentId}`) as any;
        if (payment) {
          const tutorAmount = payment.amount * 0.8;
          const balanceKey = `tutor_balance:${liveSession.tutorId}`;
          let balance = await kv.get(balanceKey) as any;

          if (balance) {
            balance.pendingBalance = Math.max(0, (balance.pendingBalance || 0) - tutorAmount);
            balance.availableBalance = (balance.availableBalance || 0) + tutorAmount;
            balance.lastUpdated = new Date().toISOString();
            await kv.set(balanceKey, balance);
          }
        }
      }
    }

    return c.json({
      success: true,
      session: liveSession,
      message: 'Session ended successfully',
    });
  } catch (error: any) {
    console.error('Error ending session:', error);
    return c.json({ error: error.message || 'Failed to end session' }, 500);
  }
});

// Get active session for a booking
app.get('/sessions/booking/:bookingId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const sessionId = await kv.get(`live_session_booking:${bookingId}`) as string;

    if (!sessionId) {
      return c.json({ session: null });
    }

    const liveSession = await kv.get(`live_session:${sessionId}`) as any;

    return c.json({
      session: liveSession,
    });
  } catch (error: any) {
    console.error('Error fetching session:', error);
    return c.json({ error: error.message || 'Failed to fetch session' }, 500);
  }
});

// Get session statistics
app.get('/sessions/:sessionId/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sessionId = c.req.param('sessionId');
    const liveSession = await kv.get(`live_session:${sessionId}`) as any;

    if (!liveSession) {
      return c.json({ error: 'Session not found' }, 404);
    }

    const stats = {
      duration: liveSession.duration,
      startedAt: liveSession.startedAt,
      endedAt: liveSession.endedAt,
      attendance: liveSession.attendance,
      status: liveSession.status,
    };

    return c.json({ stats });
  } catch (error: any) {
    console.error('Error fetching session stats:', error);
    return c.json({ error: error.message || 'Failed to fetch session stats' }, 500);
  }
});

// Report session issue
app.post('/sessions/:sessionId/report', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { issue, description } = body;

    const reportId = `session_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const report = {
      id: reportId,
      sessionId,
      reportedBy: user.userId || user.id,
      issue,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`session_report:${reportId}`, report);

    // Create notification for admin
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`notification:${notificationId}`, {
      id: notificationId,
      userId: 'admin',
      type: 'session_issue',
      title: 'Session Issue Reported',
      message: `A user reported an issue during session ${sessionId}: ${issue}`,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        reportId,
        sessionId,
        issue,
      },
    });

    return c.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error('Error reporting session issue:', error);
    return c.json({ error: error.message || 'Failed to report issue' }, 500);
  }
});

export default app;
