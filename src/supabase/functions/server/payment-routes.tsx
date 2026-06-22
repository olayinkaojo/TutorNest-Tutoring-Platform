import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

const app = new Hono();

const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY') ?? '';
const FLUTTERWAVE_WEBHOOK_SECRET = Deno.env.get('FLUTTERWAVE_WEBHOOK_SECRET') ?? '';
const PLATFORM_FEE_PERCENTAGE = 20;

// Fixed payment plan definitions (prices in NGN)
const PAYMENT_PLANS: Record<string, { price: number; sessions: number; sessionsPerWeek: number; weeks: number; name: string }> = {
  trial:        { price: 20_000,  sessions: 1,  sessionsPerWeek: 1, weeks: 1,  name: 'Trial Session' },
  once_weekly:  { price: 260_000, sessions: 13, sessionsPerWeek: 1, weeks: 13, name: 'Once a Week (1 Term)' },
  twice_weekly: { price: 520_000, sessions: 26, sessionsPerWeek: 2, weeks: 13, name: 'Twice a Week (1 Term)' },
};

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function generateBookingDates(startDate: Date, sessionsCount: number, sessionsPerWeek: number): Date[] {
  const dates: Date[] = [];
  if (sessionsPerWeek === 1) {
    const cur = new Date(startDate);
    for (let i = 0; i < sessionsCount; i++) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    // Twice weekly: session 1 on start date, session 2 three days later, repeat each week
    for (let week = 0; week < 13; week++) {
      const first = new Date(startDate);
      first.setDate(startDate.getDate() + week * 7);
      dates.push(new Date(first));
      const second = new Date(first);
      second.setDate(first.getDate() + 3);
      dates.push(new Date(second));
    }
  }
  return dates;
}

// Verify JWT and return the authenticated user ID via Supabase auth
async function getUserIdFromToken(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// Validate payment initialization body
function validatePaymentInit(body: Record<string, unknown>): string | null {
  const { bookingId, tutorId, amount, email } = body;
  if (!bookingId || typeof bookingId !== 'string') return 'bookingId is required';
  if (!tutorId || typeof tutorId !== 'string') return 'tutorId is required';
  if (!email || typeof email !== 'string' || !email.includes('@')) return 'valid email is required';
  if (amount === undefined || amount === null) return 'amount is required';
  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) return 'amount must be a positive number';
  if (numAmount > 10_000_000) return 'amount exceeds maximum allowed value';
  return null;
}

// Initialize payment for a session booking
app.post('/payments/initialize', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserIdFromToken(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json() as Record<string, unknown>;
    const validationError = validatePaymentInit(body);
    if (validationError) return c.json({ error: validationError }, 400);

    const { bookingId, tutorId, studentId, subject, amount, email, metadata } = body as {
      bookingId: string; tutorId: string; studentId?: string;
      subject?: string; amount: number; email: string; metadata?: Record<string, unknown>;
    };

    // Use a cryptographically random reference — not predictable
    const reference = `TN_${crypto.randomUUID().replace(/-/g, '')}`;

    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: Number(amount),
        currency: 'NGN',
        customer: {
          email,
          name: metadata?.studentName ?? 'Student',
        },
        payment_options: 'card,banktransfer',
        customizations: {
          title: 'Knowledge Fons Academy Session Booking',
          description: `Booking for ${subject ?? 'Tutoring Session'}`,
          logo: 'https://tutornest.com/logo.png',
        },
        meta: {
          bookingId,
          tutorId,
          studentId,
          subject,
          userId,
          ...metadata,
        },
        redirect_url: `${c.req.header('origin') ?? 'https://tutornest.com'}/payment/callback`,
      }),
    });

    const data = await response.json() as { status: string; message?: string; data?: { link: string; payment_link: string } };

    if (data.status !== 'success' || !data.data) {
      console.error('Flutterwave initialization failed:', data.message);
      return c.json({ error: 'Payment initialization failed' }, 500);
    }

    const paymentId = crypto.randomUUID();
    const payment = {
      id: paymentId, bookingId, tutorId, studentId, userId,
      amount: Number(amount), subject, status: 'pending',
      reference: reference,
      flutterwaveLink: data.data.link || data.data.payment_link,
      createdAt: new Date().toISOString(),
      metadata,
    };

    await kv.set(`payment:${paymentId}`, payment);
    await kv.set(`payment_ref:${reference}`, paymentId);

    return c.json({
      success: true,
      payment: {
        id: paymentId,
        reference: reference,
        authorizationUrl: data.data.link || data.data.payment_link,
      },
    });
  } catch (error: unknown) {
    console.error('Error initializing payment:', error);
    return c.json({ error: 'Failed to initialize payment' }, 500);
  }
});

// Verify payment (called after payment completion)
app.post('/payments/verify/:reference', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserIdFromToken(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const reference = c.req.param('reference');
    if (!reference || !/^TN_[0-9a-f]{32}$/.test(reference)) {
      return c.json({ error: 'Invalid payment reference' }, 400);
    }

    // Verify with Flutterwave
    const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
    });

    const data = await response.json() as { status: string; message?: string; data?: { status: string; amount: number; customer: any } };

    if (data.status !== 'success' || data.data?.status !== 'successful') {
      return c.json({ 
        success: false, 
        error: 'Payment verification failed',
        status: data.data?.status 
      }, 400);
    }

    // Get payment record
    const paymentId = await kv.get(`payment_ref:${reference}`) as string;
    if (!paymentId) {
      return c.json({ error: 'Payment record not found' }, 404);
    }

    const payment = await kv.get(`payment:${paymentId}`) as any;
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    // Update payment status
    payment.status = 'successful';
    payment.verifiedAt = new Date().toISOString();
    payment.flutterwaveResponse = data.data;
    await kv.set(`payment:${paymentId}`, payment);

    // Process revenue split (80% tutor, 20% platform)
    const tutorAmount = payment.amount * 0.8;
    const platformAmount = payment.amount * 0.2;

    // Update tutor's pending balance
    const tutorBalanceKey = `tutor_balance:${payment.tutorId}`;
    let tutorBalance = await kv.get(tutorBalanceKey) as any;
    
    if (!tutorBalance) {
      tutorBalance = {
        tutorId: payment.tutorId,
        pendingBalance: 0,
        availableBalance: 0,
        totalEarnings: 0,
        totalPayouts: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    tutorBalance.pendingBalance = (tutorBalance.pendingBalance || 0) + tutorAmount;
    tutorBalance.totalEarnings = (tutorBalance.totalEarnings || 0) + tutorAmount;
    tutorBalance.lastUpdated = new Date().toISOString();
    await kv.set(tutorBalanceKey, tutorBalance);

    // Record earnings transaction
    const earningId = `earning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`earning:${earningId}`, {
      id: earningId,
      tutorId: payment.tutorId,
      paymentId: payment.id,
      bookingId: payment.bookingId,
      amount: tutorAmount,
      platformFee: platformAmount,
      status: 'pending', // Will be 'paid' when payout is processed
      createdAt: new Date().toISOString(),
    });

    // Update booking status to paid
    const booking = await kv.get(`booking:${payment.bookingId}`) as any;
    if (booking) {
      booking.paymentStatus = 'paid';
      booking.paymentId = payment.id;
      booking.paidAt = new Date().toISOString();
      await kv.set(`booking:${payment.bookingId}`, booking);
    }

    // Create notification for tutor
    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(`notification:${notificationId}`, {
      id: notificationId,
      userId: payment.tutorId,
      type: 'payment_received',
      title: 'Payment Received',
      message: `You've earned ₦${tutorAmount.toLocaleString()} from a session booking. Funds are pending in your balance.`,
      read: false,
      createdAt: new Date().toISOString(),
      metadata: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        amount: tutorAmount,
      },
    });

    return c.json({
      success: true,
      payment: {
        id: payment.id,
        status: 'successful',
        amount: payment.amount,
        tutorEarnings: tutorAmount,
        platformFee: platformAmount,
      },
    });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return c.json({ error: error.message || 'Failed to verify payment' }, 500);
  }
});

// Get payment history for a user
app.get('/payments/history', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const userId = user.userId || user.id;
    const allPayments = await kv.getByPrefix('payment:');
    
    // Filter payments for this user (either as payer or recipient)
    let userPayments = allPayments.filter((p: any) => 
      p.userId === userId || p.tutorId === userId || p.studentId === userId
    );

    // Sort by date (newest first)
    userPayments = userPayments.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return c.json({ payments: userPayments });
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    return c.json({ error: error.message || 'Failed to fetch payment history' }, 500);
  }
});

// Get tutor balance and earnings
app.get('/tutors/balance', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user || user.role !== 'tutor') {
      return c.json({ error: 'Unauthorized - Tutors only' }, 403);
    }

    const tutorId = user.userId || user.id;
    const balanceKey = `tutor_balance:${tutorId}`;
    let balance = await kv.get(balanceKey) as any;

    if (!balance) {
      balance = {
        tutorId,
        pendingBalance: 0,
        availableBalance: 0,
        totalEarnings: 0,
        totalPayouts: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Get earnings history
    const allEarnings = await kv.getByPrefix('earning:');
    const tutorEarnings = allEarnings
      .filter((e: any) => e.tutorId === tutorId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Get payout history
    const allPayouts = await kv.getByPrefix('payout:');
    const tutorPayouts = allPayouts
      .filter((p: any) => p.tutorId === tutorId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({
      balance,
      earnings: tutorEarnings,
      payouts: tutorPayouts,
    });
  } catch (error: any) {
    console.error('Error fetching tutor balance:', error);
    return c.json({ error: error.message || 'Failed to fetch balance' }, 500);
  }
});

// Request payout (tutor initiates withdrawal)
app.post('/tutors/payouts/request', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user || user.role !== 'tutor') {
      return c.json({ error: 'Unauthorized - Tutors only' }, 403);
    }

    const body = await c.req.json();
    const { amount, bankDetails } = body;

    if (!amount || amount <= 0) {
      return c.json({ error: 'Invalid amount' }, 400);
    }

    if (!bankDetails?.accountNumber || !bankDetails?.bankCode) {
      return c.json({ error: 'Bank details required' }, 400);
    }

    const tutorId = user.userId || user.id;
    const balanceKey = `tutor_balance:${tutorId}`;
    const balance = await kv.get(balanceKey) as any;

    if (!balance || balance.availableBalance < amount) {
      return c.json({ error: 'Insufficient available balance' }, 400);
    }

    // Create payout request
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payout = {
      id: payoutId,
      tutorId,
      amount,
      bankDetails,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      processedAt: null,
      reference: null,
    };

    await kv.set(`payout:${payoutId}`, payout);

    // Update balance (move from available to pending payout)
    balance.availableBalance -= amount;
    balance.lastUpdated = new Date().toISOString();
    await kv.set(balanceKey, balance);

    return c.json({
      success: true,
      payout: {
        id: payoutId,
        amount,
        status: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Error requesting payout:', error);
    return c.json({ error: error.message || 'Failed to request payout' }, 500);
  }
});

// Process payout (Admin only - initiates transfer via Paystack)
app.post('/admin/payouts/:payoutId/process', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admins only' }, 403);
    }

    const payoutId = c.req.param('payoutId');
    const payout = await kv.get(`payout:${payoutId}`) as any;

    if (!payout) {
      return c.json({ error: 'Payout not found' }, 404);
    }

    if (payout.status !== 'pending') {
      return c.json({ error: 'Payout already processed' }, 400);
    }

    // Create transfer recipient on Flutterwave
    const recipientResponse = await fetch('https://api.flutterwave.com/v3/beneficiaries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: payout.bankDetails.accountNumber,
        account_bank: payout.bankDetails.bankCode,
        beneficiary_name: payout.bankDetails.accountName || 'Tutor',
      }),
    });

    const recipientData = await recipientResponse.json();

    if (recipientData.status !== 'success') {
      console.error('Failed to create recipient:', recipientData);
      return c.json({ error: 'Failed to create recipient', details: recipientData.message }, 500);
    }

    // Initiate transfer
    const transferResponse = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_bank: payout.bankDetails.bankCode,
        account_number: payout.bankDetails.accountNumber,
        amount: payout.amount,
        narration: `Knowledge Fons Academy payout - ${payoutId}`,
        currency: 'NGN',
        reference: `PAYOUT_${payoutId}_${Date.now()}`,
        beneficiary_name: payout.bankDetails.accountName || 'Tutor',
      }),
    });

    const transferData = await transferResponse.json();

    if (transferData.status !== 'success') {
      console.error('Failed to initiate transfer:', transferData);
      return c.json({ error: 'Failed to initiate transfer', details: transferData.message }, 500);
    }

    // Update payout status
    payout.status = 'processing';
    payout.processedAt = new Date().toISOString();
    payout.reference = transferData.data.reference;
    payout.transferId = transferData.data.id;
    payout.processedBy = user.userId || user.id;
    await kv.set(`payout:${payoutId}`, payout);

    // Update tutor balance
    const balanceKey = `tutor_balance:${payout.tutorId}`;
    const balance = await kv.get(balanceKey) as any;
    if (balance) {
      balance.totalPayouts = (balance.totalPayouts || 0) + payout.amount;
      balance.lastUpdated = new Date().toISOString();
      await kv.set(balanceKey, balance);
    }

    // Update earnings status
    const allEarnings = await kv.getByPrefix('earning:');
    const tutorEarnings = allEarnings.filter((e: any) => e.tutorId === payout.tutorId && e.status === 'pending');
    
    for (const earning of tutorEarnings) {
      earning.status = 'paid';
      earning.payoutId = payoutId;
      earning.paidAt = new Date().toISOString();
      await kv.set(`earning:${earning.id}`, earning);
    }

    return c.json({
      success: true,
      payout: {
        id: payoutId,
        status: 'processing',
        reference: transferData.data.reference,
      },
    });
  } catch (error: any) {
    console.error('Error processing payout:', error);
    return c.json({ error: error.message || 'Failed to process payout' }, 500);
  }
});

// Get all payout requests (Admin only)
app.get('/admin/payouts', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user || user.role !== 'admin') {
      return c.json({ error: 'Unauthorized - Admins only' }, 403);
    }

    const allPayouts = await kv.getByPrefix('payout:');
    
    // Sort by date (newest first)
    const sortedPayouts = allPayouts.sort((a: any, b: any) => 
      new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );

    return c.json({ payouts: sortedPayouts });
  } catch (error: any) {
    console.error('Error fetching payouts:', error);
    return c.json({ error: error.message || 'Failed to fetch payouts' }, 500);
  }
});

// Generate invoice for a payment
app.get('/payments/:paymentId/invoice', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const paymentId = c.req.param('paymentId');
    const payment = await kv.get(`payment:${paymentId}`) as any;

    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    // Get booking details
    const booking = await kv.get(`booking:${payment.bookingId}`) as any;
    
    // Get tutor details
    const tutorUsers = await kv.getByPrefix('user:');
    const tutor = tutorUsers.find((u: any) => (u.userId || u.id) === payment.tutorId);

    // Get student/parent details
    const payer = tutorUsers.find((u: any) => (u.userId || u.id) === payment.userId);

    const invoice = {
      id: `INV-${payment.id}`,
      paymentId: payment.id,
      reference: payment.reference,
      date: payment.createdAt,
      dueDate: payment.createdAt,
      paidDate: payment.verifiedAt,
      status: payment.status,
      from: {
        name: 'Knowledge Fons Academy',
        address: 'Lagos, Nigeria',
        email: 'billing@tutornest.com',
      },
      to: {
        name: payer?.fullName || payer?.name || 'Customer',
        email: payer?.email || '',
      },
      items: [
        {
          description: `Tutoring Session - ${payment.subject || 'General'}`,
          tutor: tutor?.fullName || tutor?.name || 'Tutor',
          date: booking?.date || '',
          time: booking?.startTime || '',
          duration: '1 hour',
          quantity: 1,
          rate: payment.amount,
          amount: payment.amount,
        },
      ],
      subtotal: payment.amount,
      tax: 0,
      total: payment.amount,
      notes: 'Thank you for using Knowledge Fons Academy!',
    };

    return c.json({ invoice });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return c.json({ error: error.message || 'Failed to generate invoice' }, 500);
  }
});

// Move earnings from pending to available (after session completion)
app.post('/payments/:paymentId/release', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const paymentId = c.req.param('paymentId');
    const payment = await kv.get(`payment:${paymentId}`) as any;

    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    const tutorAmount = payment.amount * 0.8;

    // Update tutor balance (move from pending to available)
    const balanceKey = `tutor_balance:${payment.tutorId}`;
    const balance = await kv.get(balanceKey) as any;

    if (balance) {
      balance.pendingBalance = Math.max(0, (balance.pendingBalance || 0) - tutorAmount);
      balance.availableBalance = (balance.availableBalance || 0) + tutorAmount;
      balance.lastUpdated = new Date().toISOString();
      await kv.set(balanceKey, balance);

      return c.json({
        success: true,
        message: 'Earnings released to available balance',
        balance,
      });
    }

    return c.json({ error: 'Balance not found' }, 404);
  } catch (error: any) {
    console.error('Error releasing payment:', error);
    return c.json({ error: error.message || 'Failed to release payment' }, 500);
  }
});

// ─── Plan-based payment: initialize ──────────────────────────────────────────
// POST /payments/initiate-plan
// Creates a payment record and returns a Paystack reference + access_code
// for the inline popup. Does NOT require a pre-existing booking.
app.post('/payments/initiate-plan', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserIdFromToken(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json() as Record<string, any>;
    const { planType, tutorId, studentId, startDate, startTime, subject, email } = body;

    const plan = PAYMENT_PLANS[planType as string];
    if (!plan) return c.json({ error: 'Invalid plan type. Must be trial, once_weekly, or twice_weekly.' }, 400);
    if (!tutorId || !startDate || !startTime || !email) {
      return c.json({ error: 'tutorId, startDate, startTime and email are required' }, 400);
    }

    if (!FLUTTERWAVE_SECRET_KEY) return c.json({ error: 'Payment not configured yet' }, 503);

    const reference = `TNP_${crypto.randomUUID().replace(/-/g, '')}`;

    // Initialize transaction with Flutterwave
    const flutterwaveRes = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount: plan.price,
        currency: 'NGN',
        customer: { email },
        payment_options: 'card,banktransfer',
        meta: { planType, tutorId, studentId, userId, startDate, startTime, subject, planName: plan.name },
      }),
    });

    const flutterwaveData = await flutterwaveRes.json() as any;
    if (flutterwaveData.status !== 'success' || !flutterwaveData.data) {
      console.error('Flutterwave init failed:', flutterwaveData.message);
      return c.json({ error: 'Failed to initialize payment with Flutterwave' }, 500);
    }

    const paymentId = crypto.randomUUID();

    // Write to proper payments table
    await db.createPayment({
      id: paymentId,
      userId,
      tutorId,
      studentId: studentId ?? userId,
      planType,
      amount: plan.price,
      reference,
      startDate,
      startTime,
      subject: subject ?? null,
      status: 'pending',
    });

    return c.json({
      success: true,
      reference,
      authorizationUrl: flutterwaveData.data.link || flutterwaveData.data.payment_link,
      amount: plan.price,
      planName: plan.name,
      sessions: plan.sessions,
    });
  } catch (err: any) {
    console.error('Error in initiate-plan:', err);
    return c.json({ error: err.message || 'Failed to initiate plan payment' }, 500);
  }
});

// ─── Google Calendar helpers ──────────────────────────────────────────────────

/** Returns a valid Google access token, refreshing if it is about to expire. */
async function getGoogleToken(tutorId: string): Promise<string | null> {
  const tokens = await kv.get(`google_calendar_tokens:${tutorId}`) as any;
  if (!tokens?.accessToken) return null;

  // Refresh if expiring within 5 minutes
  if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 300_000) {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret || !tokens.refreshToken) return null;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokens.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const fresh = await res.json() as any;
    await kv.set(`google_calendar_tokens:${tutorId}`, {
      ...tokens,
      accessToken: fresh.access_token,
      expiresAt: Date.now() + (fresh.expires_in * 1000),
      refreshToken: fresh.refresh_token || tokens.refreshToken,
    });
    return fresh.access_token;
  }

  return tokens.accessToken;
}

/**
 * Creates a single Google Calendar event with a Meet link.
 * Returns the hangout (Meet) link, or null on failure.
 */
async function createMeetEvent(
  googleToken: string,
  opts: { date: string; startTime: string; endTime: string; subject: string | null; sessionLabel: string },
): Promise<string | null> {
  const tz = 'Africa/Lagos';
  const event = {
    summary: `Knowledge Fons Academy: ${opts.subject ?? 'Tutoring Session'}`,
    description: opts.sessionLabel,
    start: { dateTime: `${opts.date}T${opts.startTime}:00`, timeZone: tz },
    end:   { dateTime: `${opts.date}T${opts.endTime}:00`,   timeZone: tz },
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

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${googleToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    },
  );

  if (!res.ok) {
    console.warn('Google Calendar event creation failed:', await res.text());
    return null;
  }
  const data = await res.json() as any;
  return data.hangoutLink ?? data.conferenceData?.entryPoints?.[0]?.uri ?? null;
}

// ─── Shared: confirm a plan payment and create all bookings ──────────────────
// Called by both the client-side confirm-plan route AND the Flutterwave webhook.
// Returns the number of sessions created, or throws on failure.
// Fully idempotent — safe to call multiple times for the same reference.
async function confirmPlanPayment(reference: string): Promise<{ sessionsCreated: number; bookingIds: string[] }> {
  if (!FLUTTERWAVE_SECRET_KEY) throw new Error('Payment not configured yet');

  // Verify the transaction with Flutterwave
  const verifyRes = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
    { headers: { 'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}` } },
  );
  const verifyData = await verifyRes.json() as any;

  if (verifyData.status !== 'success' || verifyData.data?.status !== 'successful') {
    throw new Error(`Payment not confirmed by Flutterwave (status: ${verifyData.data?.status ?? 'unknown'})`);
  }

  // Get our payment record
  const payment = await db.getPaymentByReference(reference);
  if (!payment) throw new Error('Payment record not found for reference: ' + reference);

  // Idempotency — already processed
  if (payment.status === 'successful') {
    return { sessionsCreated: (payment.bookingIds ?? []).length, bookingIds: payment.bookingIds ?? [] };
  }

  const plan = PAYMENT_PLANS[payment.planType];
  if (!plan) throw new Error('Invalid plan type on payment record: ' + payment.planType);

  // Generate all session dates and create booking rows
  const startDate = new Date(payment.startDate);
  const bookingDates = generateBookingDates(startDate, plan.sessions, plan.sessionsPerWeek);
  const endTime = addMinutesToTime(payment.startTime, 60);

  const bookingIds: string[] = [];
  for (let i = 0; i < bookingDates.length; i++) {
    const bookingId = crypto.randomUUID();
    await db.createBooking({
      id: bookingId,
      paymentId: payment.id,
      planType: payment.planType,
      sessionNumber: i + 1,
      totalSessions: plan.sessions,
      tutorId: payment.tutorId,
      studentId: payment.studentId,
      userId: payment.userId,
      date: bookingDates[i].toISOString().split('T')[0],
      startTime: payment.startTime,
      endTime,
      duration: 60,
      subject: payment.subject,
      status: 'scheduled',
      paymentStatus: 'paid',
    });
    bookingIds.push(bookingId);
  }

  // Mark payment confirmed
  await db.updatePayment(payment.id, {
    status: 'successful',
    bookingIds,
    confirmedAt: new Date().toISOString(),
  });

  // Credit tutor (80%)
  const tutorAmount = payment.amount * 0.8;
  await db.incrementTutorBalance(payment.tutorId, tutorAmount);

  // Notify tutor
  await db.createNotification({
    userId: payment.tutorId,
    type: 'payment_received',
    title: 'New Plan Booking',
    message: `You have a new ${plan.name} booking — ${plan.sessions} sessions starting ${payment.startDate}. Expected earnings: ₦${tutorAmount.toLocaleString()}.`,
  });

  // ── Create Google Meet link (non-fatal) ────────────────────────────────────
  // We create ONE calendar event for the first session. The resulting Meet URL
  // is stored on ALL bookings so tutor and student use the same room every week.
  try {
    const googleToken = await getGoogleToken(payment.tutorId);
    if (googleToken) {
      const firstDate = bookingDates[0].toISOString().split('T')[0];
      const meetLink = await createMeetEvent(googleToken, {
        date: firstDate,
        startTime: payment.startTime,
        endTime,
        subject: payment.subject,
        sessionLabel: `${plan.name} (${plan.sessions} sessions) — Knowledge Fons Academy`,
      });
      if (meetLink) {
        await db.updateBookingsMeetLink(bookingIds, meetLink);
        console.log(`Meet link created for payment ${payment.id}:`, meetLink);
      }
    }
  } catch (calendarErr: any) {
    // Non-fatal — bookings are already confirmed, Meet link is optional
    console.warn('Google Calendar Meet link creation skipped:', calendarErr.message);
  }

  return { sessionsCreated: bookingIds.length, bookingIds };
}

// ─── Plan-based payment: confirm (client-side call) ───────────────────────────
// POST /payments/confirm-plan/:reference
app.post('/payments/confirm-plan/:reference', async (c: any) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserIdFromToken(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const reference = c.req.param('reference');
    if (!reference || !reference.startsWith('TNP_')) {
      return c.json({ error: 'Invalid plan payment reference' }, 400);
    }

    const result = await confirmPlanPayment(reference);

    return c.json({
      success: true,
      sessionsCreated: result.sessionsCreated,
      bookingIds: result.bookingIds,
      message: `Payment confirmed. ${result.sessionsCreated} sessions scheduled successfully.`,
    });
  } catch (err: any) {
    console.error('Error in confirm-plan:', err);
    return c.json({ error: err.message || 'Failed to confirm plan payment' }, 500);
  }
});

// ─── Flutterwave webhook ──────────────────────────────────────────────────────
// POST /payments/webhook
//
// Flutterwave calls this URL server-to-server after every successful payment.
// This is the safety net: if the user's browser closes before confirm-plan runs,
// this ensures bookings are still created.
//
// Setup in Flutterwave dashboard:
//   Webhook URL: https://<project>.supabase.co/functions/v1/make-server-cbd74580/payments/webhook
//   Secret hash: set FLUTTERWAVE_WEBHOOK_SECRET in Supabase edge function secrets
app.post('/payments/webhook', async (c: any) => {
  try {
    // 1. Verify the request is genuinely from Flutterwave
    const secretHash = FLUTTERWAVE_WEBHOOK_SECRET;
    if (secretHash) {
      const signature = c.req.header('verif-hash');
      if (!signature || signature !== secretHash) {
        console.warn('Webhook rejected: invalid verif-hash');
        return c.json({ error: 'Unauthorized' }, 401);
      }
    } else {
      console.warn('FLUTTERWAVE_WEBHOOK_SECRET not set — webhook signature not verified');
    }

    const payload = await c.req.json() as any;
    console.log('Flutterwave webhook received:', JSON.stringify(payload));

    // 2. Only process successful plan payments (our TNP_ references)
    const status = payload?.data?.status ?? payload?.event?.data?.status;
    const txRef = payload?.data?.tx_ref ?? payload?.event?.data?.tx_ref;

    if (!txRef || !txRef.startsWith('TNP_')) {
      // Not a plan payment — ignore silently (Flutterwave sends all events)
      return c.json({ received: true });
    }

    if (status !== 'successful') {
      console.log(`Webhook: payment ${txRef} status is "${status}", skipping`);
      return c.json({ received: true });
    }

    // 3. Confirm the payment (idempotent — safe if browser already confirmed it)
    try {
      const result = await confirmPlanPayment(txRef);
      console.log(`Webhook: confirmed ${txRef} — ${result.sessionsCreated} sessions created`);
    } catch (err: any) {
      // Log but still return 200 so Flutterwave doesn't retry endlessly
      console.error(`Webhook: confirmPlanPayment failed for ${txRef}:`, err.message);
    }

    // Always return 200 — Flutterwave retries on any non-2xx response
    return c.json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    // Still return 200 to stop retries on malformed payloads
    return c.json({ received: true });
  }
});

export default app;
