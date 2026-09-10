import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { verifyAccessToken } from './route-auth.tsx';
import { releaseMaturedEarnings } from './payment-routes.tsx';
import { createNotification } from './notification-broker.tsx';

const payoutsComplete = new Hono();

const getUserId = async (accessToken: string | null): Promise<string | null> => {
  // Verify the JWT signature + expiry via Supabase; never trust an unverified decode.
  return verifyAccessToken(accessToken);
};

// Helper: Get subject-based rate — platform-fixed flat rate, same for every subject
const getSubjectRate = (_subject: string): number => {
  return 15000;
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

    // Release any earnings from sessions that have now happened — see
    // releaseMaturedEarnings in payment-routes.tsx for why this can't just
    // be a one-time background job.
    await releaseMaturedEarnings(userId);

    // Single source of truth: the Postgres tutor_balance table. This used to
    // be computed by re-scanning KV `booking:` records, which only ever
    // captured the old single-session flow — plan-based bookings (the flow
    // the live app actually uses) live in Postgres and were invisible here,
    // so a tutor's real earnings never showed up on their own dashboard.
    const balance = await db.getTutorBalance(userId);
    const payouts = await db.listPayoutsByTutor(userId);

    // Get settings
    const settings = (await kv.get(`payout_settings:${userId}`)) as any || {
      schedule: 'weekly',
      minimumAmount: 50,
      bankAccountLast4: null,
    };

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
      totalEarnings: balance.total_earnings.toFixed(2),
      paidThisMonth: balance.total_payouts.toFixed(2),
      // `pendingPayout` is what TutorPayoutDashboard.tsx treats as the
      // requestable amount (its "Available: ₦…" line and the
      // canRequestPayout gate both read this field) — it must be
      // available_balance, not pending_balance, or the UI would tell a tutor
      // they can request money that /request would then correctly reject.
      pendingPayout: balance.available_balance.toFixed(2),
      // Earned but not yet released (session hasn't happened yet) — not
      // withdrawable until releaseMaturedEarnings moves it above.
      awaitingSessionCompletion: balance.pending_balance.toFixed(2),
      nextPayoutDate: nextPayoutDate.toISOString(),
      minimumPayout: settings.minimumAmount,
      bankAccountLast4: settings.bankAccountLast4,
      currency: 'NGN',
      currencySymbol: '₦',
    };

    return c.json({ earnings: [], payouts, stats, settings });
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
    const requestedAmount = parseFloat(amount);

    // Get settings for minimum
    const settings = (await kv.get(`payout_settings:${userId}`)) as any || { minimumAmount: 50 };

    if (requestedAmount < settings.minimumAmount) {
      return c.json({ error: `Minimum payout amount is ₦${settings.minimumAmount}` }, 400);
    }

    // Check if bank account exists
    const bankAccount = (await kv.get(`bank_account:${userId}`)) as any;
    if (!bankAccount) {
      return c.json({ error: 'Please add a bank account before requesting payout' }, 400);
    }

    await releaseMaturedEarnings(userId);

    // Reserves the amount out of available_balance in the single Postgres
    // source of truth (see payment-routes.tsx) and creates a real payouts
    // row admins can actually see and process — this used to write a
    // parallel `payout_req_…` KV record that no admin screen ever read, so a
    // tutor's request went nowhere no matter what an admin did.
    try {
      await db.reserveTutorBalanceForPayout(userId, requestedAmount);
    } catch (e: any) {
      return c.json({ error: e.message || 'Insufficient available balance' }, 400);
    }

    const payout = await db.createPayout({
      tutorId: userId,
      amount: requestedAmount,
      bankDetails: {
        accountNumber: bankAccount.accountNumber,
        bankCode: bankAccount.bankCode,
        accountName: bankAccount.accountHolder,
      },
    });

    // Send notification to admins
    const tutorProfile = (await kv.get(`user:${userId}`)) as any || {};
    const adminUsers = (await kv.getByPrefix('user:')) as any[];
    const admins = adminUsers.filter((u: any) => u.role === 'admin');
    for (const admin of admins) {
      await createNotification(kv, {
        userId: admin.id,
        type: 'payout_request',
        title: 'New Payout Request',
        message: `${tutorProfile.full_name || 'A tutor'} has requested a payout of ₦${amount}`,
        actionUrl: `/admin/dashboard?tab=payouts`,
      });
    }

    return c.json({
      success: true,
      requestId: payout.id,
      message: 'Payout request submitted for admin approval',
      request: payout,
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

    const requests = await db.listPayoutsByTutor(userId);
    return c.json({ requests });
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
// TASK 7: Admin Payout Management
// ============================================
// Real admin approval/processing (including the actual Flutterwave transfer)
// now lives in payment-routes.tsx (GET /admin/payouts, POST
// /admin/payouts/:id/process, POST /admin/payouts/:id/reject) — this file
// used to have its own parallel /admin/pending, /admin/approve, /admin/reject
// and /admin/history endpoints that only flipped a status flag and never
// called Flutterwave, and had no admin UI wired to them anyway. Removed to
// avoid a second, silently-non-functional "approval" path existing again.

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
