import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const payoutsComplete = new Hono();

const getUserId = async (accessToken: string | null): Promise<string | null> => {
  if (!accessToken) return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch (err) {
    return null;
  }
};

// Helper: Get subject-based rate
const getSubjectRate = (subject: string): number => {
  const subjectRates: Record<string, number> = {
    'Mathematics': 20000, 'Physics': 20000, 'Chemistry': 20000, 'Biology': 18000,
    'Computer Science': 22000, 'Information Technology': 20000,
    'English': 16000, 'Mandarin Chinese': 25000, 'Arabic': 22000, 'Spanish': 18000,
    'French': 18000, 'German': 18000, 'Italian': 16000, 'Latin': 20000,
    'A-Level Preparation': 22000, 'GCSE Preparation': 18000, '11+ Entrance Exams': 20000,
    'SAT Preparation': 25000, 'ACT Preparation': 25000, 'IELTS': 20000, 'TOEFL': 20000,
    'Special Educational Needs (SEN)': 25000, 'Dyslexia Support': 25000,
    'ADHD Support': 25000, 'Autism Spectrum': 28000,
    'Science': 16000, 'History': 15000, 'Geography': 15000, 'Economics': 18000,
    'Business Studies': 16000, 'Accounting': 18000, 'Psychology': 16000,
    'Sociology': 15000, 'Philosophy': 16000, 'Politics': 16000,
    'Religious Studies': 14000, 'Art & Design': 15000, 'Music': 16000, 'Drama': 14000, 'Law': 22000,
  };
  return subjectRates[subject] || 16000;
};

// ============================================
// TASK 1: Fix Earnings Calculation
// ============================================

payoutsComplete.get('/dashboard', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all completed, paid bookings for this tutor
    const allBookings = await kv.getByPrefix('booking:');
    const tutorBookings = allBookings.filter((b: any) =>
      b.tutorId === userId && b.status === 'completed' && b.paidAt
    );

    // Calculate earnings from bookings
    const earnings = tutorBookings.map((booking: any) => {
      const subjectRate = getSubjectRate(booking.subject || '');
      const grossAmount = subjectRate;
      const platformFee = (grossAmount * 0.20).toFixed(2);
      const netAmount = (grossAmount * 0.80).toFixed(2);

      return {
        id: `earn_${booking.id}`,
        bookingId: booking.id,
        date: booking.date || booking.scheduledDate,
        studentName: booking.studentName || 'Unknown',
        subject: booking.subject || 'Not specified',
        lessonDuration: booking.duration || '1 hour',
        grossAmount: grossAmount.toFixed(2),
        platformFee,
        netAmount,
        status: booking.payoutStatus || 'pending',
        payoutDate: booking.payoutDate,
      };
    });

    // Calculate totals
    const totalEarnings = earnings.reduce((sum, e) => sum + parseFloat(e.netAmount), 0);
    const paidEarnings = earnings
      .filter((e) => e.status === 'paid')
      .reduce((sum, e) => sum + parseFloat(e.netAmount), 0);
    const pendingPayout = totalEarnings - paidEarnings;

    // Get settings
    const settings = (await kv.get(`payout_settings:${userId}`)) as any || {
      schedule: 'weekly',
      minimumAmount: 50,
      bankAccountLast4: null,
    };

    // Get payout history (Task 2)
    const payoutHistory = (await kv.get(`payout_history:${userId}`)) as any[] || [];

    // Calculate next payout date based on schedule
    const today = new Date();
    let nextPayoutDate = new Date();
    switch (settings.schedule) {
      case 'weekly':
        nextPayoutDate.setDate(today.getDate() + (7 - today.getDay()));
        break;
      case 'biweekly':
        nextPayoutDate.setDate(today.getDate() + 14);
        break;
      case 'monthly':
        nextPayoutDate.setMonth(today.getMonth() + 1);
        nextPayoutDate.setDate(1);
        break;
    }

    const stats = {
      totalEarnings: totalEarnings.toFixed(2),
      paidThisMonth: paidEarnings.toFixed(2),
      pendingPayout: pendingPayout.toFixed(2),
      nextPayoutDate: nextPayoutDate.toISOString(),
      minimumPayout: settings.minimumAmount,
      bankAccountLast4: settings.bankAccountLast4,
      currency: 'NGN',
      currencySymbol: '₦',
    };

    return c.json({ earnings, payouts: payoutHistory, stats, settings });
  } catch (error: any) {
    console.error('Error fetching payout dashboard:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// ============================================
// TASK 3: Bank Account Management
// ============================================

payoutsComplete.get('/bank-account', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bankAccount = (await kv.get(`bank_account:${userId}`)) as any || null;

    return c.json({
      account: bankAccount ? {
        bankName: bankAccount.bankName,
        accountHolder: bankAccount.accountHolder,
        accountLast4: bankAccount.accountNumber?.slice(-4),
        verified: bankAccount.verified || false,
      } : null,
    });
  } catch (error: any) {
    console.error('Error fetching bank account:', error);
    return c.json({ error: error.message }, 500);
  }
});

payoutsComplete.post('/bank-account', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { bankName, accountNumber, accountHolder, bankCode } = await c.req.json();

    // Validation
    if (!bankName || !accountNumber || !accountHolder || !bankCode) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (accountNumber.length < 10) {
      return c.json({ error: 'Invalid account number' }, 400);
    }

    // Store securely (in production, encrypt this)
    const bankAccount = {
      bankName,
      accountNumber,
      accountHolder,
      bankCode,
      verified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`bank_account:${userId}`, bankAccount);

    return c.json({
      success: true,
      message: 'Bank account saved. Verification pending.',
      account: {
        bankName,
        accountHolder,
        accountLast4: accountNumber.slice(-4),
        verified: false,
      },
    });
  } catch (error: any) {
    console.error('Error saving bank account:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// TASK 4: Payout Request Feature
// ============================================

payoutsComplete.post('/request', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { amount } = await c.req.json();

    if (!amount || parseFloat(amount) <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    // Get settings for minimum
    const settings = (await kv.get(`payout_settings:${userId}`)) as any || { minimumAmount: 50 };

    if (parseFloat(amount) < settings.minimumAmount) {
      return c.json({ error: `Minimum payout amount is ₦${settings.minimumAmount}` }, 400);
    }

    // Check if bank account exists
    const bankAccount = await kv.get(`bank_account:${userId}`);
    if (!bankAccount) {
      return c.json({ error: 'Please add a bank account before requesting payout' }, 400);
    }

    // Get tutor profile for name
    const tutorProfile = (await kv.get(`user:${userId}`)) as any || {};

    // Create payout request
    const requestId = `payout_req_${Date.now()}_${userId}`;
    const payoutRequest = {
      id: requestId,
      tutorId: userId,
      tutorName: tutorProfile.full_name || tutorProfile.email || 'Unknown',
      amount: parseFloat(amount).toFixed(2),
      status: 'pending_approval', // pending_approval → approved → processing → paid/failed
      requestedAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
      processedAt: null,
      failureReason: null,
      reference: null,
    };

    await kv.set(requestId, payoutRequest);

    // Add to tutor's payout requests list
    const tutorRequests = ((await kv.get(`tutor_payout_requests:${userId}`)) as any) || [];
    tutorRequests.push(requestId);
    await kv.set(`tutor_payout_requests:${userId}`, tutorRequests);

    // Add to admin's pending approvals
    const adminPending = ((await kv.get(`admin_payout_pending`)) as any) || [];
    adminPending.push(requestId);
    await kv.set(`admin_payout_pending`, adminPending);

    // Send notification to admins
    const adminUsers = (await kv.getByPrefix('user:')) as any[];
    const admins = adminUsers.filter((u: any) => u.role === 'admin');
    for (const admin of admins) {
      const notificationId = `notification_${Date.now()}_${admin.id}`;
      const notification = {
        id: notificationId,
        userId: admin.id,
        type: 'payout_request',
        title: 'New Payout Request',
        message: `${tutorProfile.full_name || 'A tutor'} has requested a payout of ₦${amount}`,
        actionUrl: `/admin/dashboard?tab=payouts&request=${requestId}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      await kv.set(notificationId, notification);
    }

    return c.json({
      success: true,
      requestId,
      message: 'Payout request submitted for admin approval',
      request: payoutRequest,
    });
  } catch (error: any) {
    console.error('Error creating payout request:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Get user's payout requests
payoutsComplete.get('/requests', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestIds = ((await kv.get(`tutor_payout_requests:${userId}`)) as any) || [];
    const requests = [];

    for (const requestId of requestIds) {
      const request = await kv.get(requestId);
      if (request) requests.push(request);
    }

    return c.json({ requests: requests.sort((a: any, b: any) =>
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    )});
  } catch (error: any) {
    console.error('Error fetching payout requests:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// TASK 5: Real-Time Updates & Notifications
// ============================================

payoutsComplete.get('/notifications', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all payout-related notifications for user
    const allNotifications = (await kv.getByPrefix('notification_')) as any[];
    const userNotifications = allNotifications.filter((n: any) =>
      n.userId === userId && n.type?.startsWith('payout')
    );

    return c.json({
      notifications: userNotifications.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// TASK 7: Admin Payout Management Dashboard
// ============================================

payoutsComplete.get('/admin/pending', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify admin
    const userProfile = (await kv.get(`user:${userId}`)) as any;
    if (userProfile?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const pendingIds = ((await kv.get(`admin_payout_pending`)) as any) || [];
    const requests = [];

    for (const requestId of pendingIds) {
      const request = await kv.get(requestId);
      if (request && request.status === 'pending_approval') {
        requests.push(request);
      }
    }

    return c.json({
      pending: requests.sort((a: any, b: any) =>
        new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      ),
    });
  } catch (error: any) {
    console.error('Error fetching pending payouts:', error);
    return c.json({ error: error.message }, 500);
  }
});

payoutsComplete.post('/admin/approve/:requestId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = (await kv.get(`user:${userId}`)) as any;
    if (userProfile?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const requestId = c.req.param('requestId');
    const { notes } = await c.req.json();

    const payoutRequest = (await kv.get(requestId)) as any;
    if (!payoutRequest) {
      return c.json({ error: 'Payout request not found' }, 404);
    }

    // Update request status
    payoutRequest.status = 'approved';
    payoutRequest.approvedAt = new Date().toISOString();
    payoutRequest.approvedBy = userId;
    payoutRequest.notes = notes;

    await kv.set(requestId, payoutRequest);

    // Remove from pending
    const pendingIds = ((await kv.get(`admin_payout_pending`)) as any) || [];
    const updatedPending = pendingIds.filter((id: string) => id !== requestId);
    await kv.set(`admin_payout_pending`, updatedPending);

    // Add to approved list
    const approvedIds = ((await kv.get(`admin_payout_approved`)) as any) || [];
    approvedIds.push(requestId);
    await kv.set(`admin_payout_approved`, approvedIds);

    // Store in payout history
    const tutorId = payoutRequest.tutorId;
    const payoutHistory = ((await kv.get(`payout_history:${tutorId}`)) as any) || [];
    payoutHistory.push({
      id: requestId,
      amount: payoutRequest.amount,
      status: 'approved',
      requestedAt: payoutRequest.requestedAt,
      approvedAt: payoutRequest.approvedAt,
    });
    await kv.set(`payout_history:${tutorId}`, payoutHistory);

    // Notify tutor
    const notificationId = `notification_${Date.now()}_${tutorId}`;
    const notification = {
      id: notificationId,
      userId: tutorId,
      type: 'payout_approved',
      title: 'Payout Approved',
      message: `Your payout request of ₦${payoutRequest.amount} has been approved`,
      actionUrl: `/tutor/dashboard?tab=payouts`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await kv.set(notificationId, notification);

    return c.json({
      success: true,
      message: 'Payout request approved',
      request: payoutRequest,
    });
  } catch (error: any) {
    console.error('Error approving payout:', error);
    return c.json({ error: error.message }, 500);
  }
});

payoutsComplete.post('/admin/reject/:requestId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = (await kv.get(`user:${userId}`)) as any;
    if (userProfile?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const requestId = c.req.param('requestId');
    const { reason } = await c.req.json();

    const payoutRequest = (await kv.get(requestId)) as any;
    if (!payoutRequest) {
      return c.json({ error: 'Payout request not found' }, 404);
    }

    // Update request status
    payoutRequest.status = 'rejected';
    payoutRequest.failureReason = reason;
    payoutRequest.rejectedAt = new Date().toISOString();
    payoutRequest.rejectedBy = userId;

    await kv.set(requestId, payoutRequest);

    // Remove from pending
    const pendingIds = ((await kv.get(`admin_payout_pending`)) as any) || [];
    const updatedPending = pendingIds.filter((id: string) => id !== requestId);
    await kv.set(`admin_payout_pending`, updatedPending);

    // Notify tutor
    const tutorId = payoutRequest.tutorId;
    const notificationId = `notification_${Date.now()}_${tutorId}`;
    const notification = {
      id: notificationId,
      userId: tutorId,
      type: 'payout_rejected',
      title: 'Payout Rejected',
      message: `Your payout request of ₦${payoutRequest.amount} was rejected: ${reason}`,
      actionUrl: `/tutor/dashboard?tab=payouts`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await kv.set(notificationId, notification);

    return c.json({
      success: true,
      message: 'Payout request rejected',
    });
  } catch (error: any) {
    console.error('Error rejecting payout:', error);
    return c.json({ error: error.message }, 500);
  }
});

payoutsComplete.get('/admin/history', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userProfile = (await kv.get(`user:${userId}`)) as any;
    if (userProfile?.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Get all payout requests (processed)
    const allRequests = (await kv.getByPrefix('payout_req_')) as any[];
    const processed = allRequests.filter((r: any) =>
      r.status === 'approved' || r.status === 'rejected' || r.status === 'paid'
    );

    return c.json({
      history: processed.sort((a: any, b: any) =>
        new Date(b.approvedAt || b.requestedAt).getTime() - new Date(a.approvedAt || a.requestedAt).getTime()
      ),
    });
  } catch (error: any) {
    console.error('Error fetching payout history:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// TASK 8: Tax & Compliance Reports
// ============================================

payoutsComplete.get('/tax-report/:year', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const year = parseInt(c.req.param('year'));

    // Get all bookings for the year
    const allBookings = await kv.getByPrefix('booking:');
    const tutorBookings = allBookings.filter((b: any) => {
      const bookingYear = new Date(b.date || b.scheduledDate).getFullYear();
      return b.tutorId === userId && b.status === 'completed' && bookingYear === year;
    });

    // Calculate tax summary
    const monthlyEarnings: Record<number, number> = {};
    let totalGross = 0;
    let totalFees = 0;

    tutorBookings.forEach((booking: any) => {
      const month = new Date(booking.date || booking.scheduledDate).getMonth();
      const subjectRate = getSubjectRate(booking.subject || '');
      const platformFee = subjectRate * 0.20;
      const tutorEarnings = subjectRate * 0.80;

      monthlyEarnings[month] = (monthlyEarnings[month] || 0) + tutorEarnings;
      totalGross += subjectRate;
      totalFees += platformFee;
    });

    const quarterlyEarnings = {
      Q1: (monthlyEarnings[0] || 0) + (monthlyEarnings[1] || 0) + (monthlyEarnings[2] || 0),
      Q2: (monthlyEarnings[3] || 0) + (monthlyEarnings[4] || 0) + (monthlyEarnings[5] || 0),
      Q3: (monthlyEarnings[6] || 0) + (monthlyEarnings[7] || 0) + (monthlyEarnings[8] || 0),
      Q4: (monthlyEarnings[9] || 0) + (monthlyEarnings[10] || 0) + (monthlyEarnings[11] || 0),
    };

    return c.json({
      year,
      totalSessions: tutorBookings.length,
      totalGross: totalGross.toFixed(2),
      platformFees: totalFees.toFixed(2),
      totalEarnings: (totalGross * 0.80).toFixed(2),
      monthlyEarnings: Object.fromEntries(
        Object.entries(monthlyEarnings).map(([k, v]) => [
          new Date(0, parseInt(k)).toLocaleString('default', { month: 'short' }),
          v.toFixed(2),
        ])
      ),
      quarterlyEarnings: Object.fromEntries(
        Object.entries(quarterlyEarnings).map(([k, v]) => [k, v.toFixed(2)])
      ),
    });
  } catch (error: any) {
    console.error('Error generating tax report:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default payoutsComplete;
