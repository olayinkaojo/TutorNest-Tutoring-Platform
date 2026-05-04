import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

const payoutRoutes = new Hono();

// Helper to get user ID from access token
const getUserIdFromToken = (accessToken: string | null): string | null => {
  if (!accessToken) return null;
  
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch (err) {
    console.error('getUserIdFromToken error:', err);
    return null;
  }
};

// Get tutor's payout summary
payoutRoutes.get('/tutor/:tutorId/summary', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tutorId = c.req.param('tutorId');
    
    // Verify the requesting user is the tutor
    if (userId !== tutorId) {
      return c.json({ error: 'Unauthorized: Can only view own payout summary' }, 403);
    }

    // Get all completed bookings for this tutor
    const allBookings = await db.getBookingsByTutorId(tutorId);
    const completedBookings = allBookings.filter((b: any) =>
      b.status === 'completed' &&
      (b.paymentStatus === 'paid' || b.paymentStatus === 'confirmed')
    );

    // Calculate earnings
    let totalEarnings = 0;
    let totalPaidOut = 0;
    let pendingPayout = 0;

    completedBookings.forEach((booking: any) => {
      const tutorEarnings = Math.round(booking.price * 0.8); // 80% to tutor
      totalEarnings += tutorEarnings;

      if (booking.payoutStatus === 'paid') {
        totalPaidOut += tutorEarnings;
      } else {
        pendingPayout += tutorEarnings;
      }
    });

    // Get payout history
    const payoutHistory = await kv.get(`tutor_payouts:${tutorId}`) || [];

    return c.json({
      summary: {
        totalEarnings,
        totalPaidOut,
        pendingPayout,
        currency: 'NGN',
        currencySymbol: '₦',
        completedSessions: completedBookings.length,
        earningsRate: 80, // 80% tutor rate
      },
      payoutHistory: payoutHistory.slice(-10) // Last 10 payouts
    });
  } catch (error: any) {
    console.error('Error fetching payout summary:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get detailed payout breakdown
payoutRoutes.get('/tutor/:tutorId/breakdown', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tutorId = c.req.param('tutorId');
    
    if (userId !== tutorId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get all completed bookings
    const allBookings = await db.getBookingsByTutorId(tutorId);
    const completedBookings = allBookings.filter((b: any) =>
      b.status === 'completed' &&
      (b.paymentStatus === 'paid' || b.paymentStatus === 'confirmed')
    ).sort((a: any, b: any) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Build detailed breakdown
    const breakdown = completedBookings.map((booking: any) => {
      const totalAmount = booking.price;
      const tutorAmount = Math.round(totalAmount * 0.8);
      const platformFee = Math.round(totalAmount * 0.2);

      return {
        bookingId: booking.id,
        sessionDate: booking.date,
        studentName: booking.studentName || 'Unknown',
        subject: booking.subject,
        duration: booking.duration,
        totalAmount,
        tutorAmount,
        platformFee,
        payoutStatus: booking.payoutStatus || 'pending',
        paidOutAt: booking.paidOutAt || null,
        currency: 'NGN'
      };
    });

    return c.json({ breakdown });
  } catch (error: any) {
    console.error('Error fetching payout breakdown:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Request payout
payoutRoutes.post('/tutor/:tutorId/request', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const tutorId = c.req.param('tutorId');
    
    if (userId !== tutorId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const body = await c.req.json();
    const { amount, accountDetails } = body;

    if (!amount || !accountDetails) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Get tutor's pending payout amount
    const allBookings = await db.getBookingsByTutorId(tutorId);
    const pendingBookings = allBookings.filter((b: any) =>
      b.status === 'completed' &&
      (b.paymentStatus === 'paid' || b.paymentStatus === 'confirmed') &&
      (!b.payoutStatus || b.payoutStatus === 'pending')
    );

    let availableAmount = 0;
    pendingBookings.forEach((booking: any) => {
      availableAmount += Math.round(booking.price * 0.8);
    });

    if (amount > availableAmount) {
      return c.json({ error: 'Requested amount exceeds available balance' }, 400);
    }

    // Create payout request
    const payoutId = crypto.randomUUID();
    const payoutRequest = {
      id: payoutId,
      tutorId,
      amount,
      currency: 'NGN',
      accountDetails,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      bookingIds: pendingBookings.map((b: any) => b.id)
    };

    await kv.set(`payout_request:${payoutId}`, payoutRequest);

    // Add to tutor's payout requests list
    const payoutRequests = await kv.get(`tutor_payout_requests:${tutorId}`) || [];
    payoutRequests.push(payoutId);
    await kv.set(`tutor_payout_requests:${tutorId}`, payoutRequests);

    // Mark bookings as payout requested
    for (const booking of pendingBookings) {
      booking.payoutStatus = 'requested';
      booking.payoutRequestId = payoutId;
      await kv.set(`booking:${booking.id}`, booking);
    }

    console.log(`Payout request created: ${payoutId} for tutor ${tutorId}, amount: ₦${amount}`);

    return c.json({
      success: true,
      payoutRequestId: payoutId,
      message: 'Payout request submitted successfully'
    });
  } catch (error: any) {
    console.error('Error creating payout request:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get payout requests (for admin)
payoutRoutes.get('/admin/requests', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify admin role
    const user = await kv.get(`user:${userId}`);
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Get all payout requests
    const allRequests = await kv.getByPrefix('payout_request:');
    const requests = allRequests.sort((a: any, b: any) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    // Enrich with tutor names
    const enrichedRequests = await Promise.all(requests.map(async (request: any) => {
      const tutor = await kv.get(`user:${request.tutorId}`);
      return {
        ...request,
        tutorName: tutor?.fullName || tutor?.name || 'Unknown'
      };
    }));

    return c.json({ requests: enrichedRequests });
  } catch (error: any) {
    console.error('Error fetching payout requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Approve/reject payout (admin only)
payoutRoutes.patch('/admin/requests/:requestId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = getUserIdFromToken(accessToken);
    
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify admin role
    const user = await kv.get(`user:${userId}`);
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const requestId = c.req.param('requestId');
    const body = await c.req.json();
    const { action, notes } = body; // action: 'approve' or 'reject'

    const payoutRequest = await kv.get(`payout_request:${requestId}`);
    if (!payoutRequest) {
      return c.json({ error: 'Payout request not found' }, 404);
    }

    if (action === 'approve') {
      payoutRequest.status = 'approved';
      payoutRequest.approvedAt = new Date().toISOString();
      payoutRequest.approvedBy = userId;
      payoutRequest.notes = notes;

      // Mark associated bookings as paid out
      for (const bookingId of payoutRequest.bookingIds) {
        const booking = await kv.get(`booking:${bookingId}`);
        if (booking) {
          booking.payoutStatus = 'paid';
          booking.paidOutAt = new Date().toISOString();
          await kv.set(`booking:${bookingId}`, booking);
        }
      }

      // Add to tutor's payout history
      const payoutHistory = await kv.get(`tutor_payouts:${payoutRequest.tutorId}`) || [];
      payoutHistory.push({
        id: requestId,
        amount: payoutRequest.amount,
        currency: 'NGN',
        paidAt: new Date().toISOString(),
        bookingsCount: payoutRequest.bookingIds.length
      });
      await kv.set(`tutor_payouts:${payoutRequest.tutorId}`, payoutHistory);

    } else if (action === 'reject') {
      payoutRequest.status = 'rejected';
      payoutRequest.rejectedAt = new Date().toISOString();
      payoutRequest.rejectedBy = userId;
      payoutRequest.notes = notes;

      // Reset booking payout status
      for (const bookingId of payoutRequest.bookingIds) {
        const booking = await kv.get(`booking:${bookingId}`);
        if (booking) {
          booking.payoutStatus = 'pending';
          delete booking.payoutRequestId;
          await kv.set(`booking:${bookingId}`, booking);
        }
      }
    }

    await kv.set(`payout_request:${requestId}`, payoutRequest);

    // Send email notification to tutor (non-fatal)
    try {
      const tutorProfile = await kv.get(`user:${payoutRequest.tutorId}`) as any;
      const tutorEmail = tutorProfile?.email;
      const tutorName = tutorProfile?.fullName || tutorProfile?.name || 'Tutor';
      const amountDisplay = `₦${Number(payoutRequest.amount).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
      const processedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const dashboardBase = Deno.env.get('FRONTEND_URL') || Deno.env.get('VITE_APP_URL') || 'https://app.tutornest.org';

      if (tutorEmail) {
        if (action === 'approve') {
          const tpl = emailTemplates.payoutNotification(tutorName, amountDisplay, 'NGN', processedDate, payoutRequest.bookingIds?.length);
          await sendEmail({ to: tutorEmail, ...tpl }).catch((e) => console.warn('payout approval email:', e));
        } else if (action === 'reject') {
          const tpl = emailTemplates.payoutRejected(tutorName, amountDisplay, 'NGN', notes || 'Please contact support for further details.', `${dashboardBase}/dashboard`);
          await sendEmail({ to: tutorEmail, ...tpl }).catch((e) => console.warn('payout rejection email:', e));
        }
      }
    } catch (e) {
      console.warn('Payout notification email (non-fatal):', e);
    }

    return c.json({ success: true, request: payoutRequest });
  } catch (error: any) {
    console.error('Error processing payout request:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default payoutRoutes;
