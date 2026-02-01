import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Paystack secret key should be set in environment variables
const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || '';
const PLATFORM_FEE_PERCENTAGE = 20; // Platform takes 20%, tutor gets 80%

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

// Initialize payment for a session booking
app.post('/payments/initialize', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const user = await getUserFromToken(accessToken);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    const body = await c.req.json();
    const { bookingId, tutorId, studentId, subject, amount, email, metadata } = body;

    if (!bookingId || !tutorId || !amount || !email) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Initialize payment with Paystack
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Paystack expects amount in kobo (₦1 = 100 kobo)
        currency: 'NGN',
        reference: `TUTORNEST_${bookingId}_${Date.now()}`,
        callback_url: `${c.req.header('origin') || 'https://tutornest.com'}/payment/callback`,
        metadata: {
          bookingId,
          tutorId,
          studentId,
          subject,
          userId: user.userId || user.id,
          ...metadata,
        },
      }),
    });

    const data = await response.json();

    if (!data.status) {
      console.error('Paystack initialization failed:', data);
      return c.json({ error: 'Payment initialization failed', details: data.message }, 500);
    }

    // Store payment record
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const payment = {
      id: paymentId,
      bookingId,
      tutorId,
      studentId,
      userId: user.userId || user.id,
      amount,
      subject,
      status: 'pending',
      reference: data.data.reference,
      paystackAccessCode: data.data.access_code,
      authorizationUrl: data.data.authorization_url,
      createdAt: new Date().toISOString(),
      metadata,
    };

    await kv.set(`payment:${paymentId}`, payment);
    await kv.set(`payment_ref:${data.data.reference}`, paymentId);

    return c.json({
      success: true,
      payment: {
        id: paymentId,
        reference: data.data.reference,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
      },
    });
  } catch (error: any) {
    console.error('Error initializing payment:', error);
    return c.json({ error: error.message || 'Failed to initialize payment' }, 500);
  }
});

// Verify payment (called after payment completion)
app.post('/payments/verify/:reference', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const reference = c.req.param('reference');

    // Verify with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
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
    payment.paystackResponse = data.data;
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

    // Create transfer recipient on Paystack
    const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: payout.bankDetails.accountName || 'Tutor',
        account_number: payout.bankDetails.accountNumber,
        bank_code: payout.bankDetails.bankCode,
        currency: 'NGN',
      }),
    });

    const recipientData = await recipientResponse.json();

    if (!recipientData.status) {
      console.error('Failed to create recipient:', recipientData);
      return c.json({ error: 'Failed to create recipient', details: recipientData.message }, 500);
    }

    // Initiate transfer
    const transferResponse = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: payout.amount * 100, // Convert to kobo
        recipient: recipientData.data.recipient_code,
        reason: `TutorNest payout - ${payoutId}`,
        reference: `PAYOUT_${payoutId}_${Date.now()}`,
      }),
    });

    const transferData = await transferResponse.json();

    if (!transferData.status) {
      console.error('Failed to initiate transfer:', transferData);
      return c.json({ error: 'Failed to initiate transfer', details: transferData.message }, 500);
    }

    // Update payout status
    payout.status = 'processing';
    payout.processedAt = new Date().toISOString();
    payout.reference = transferData.data.reference;
    payout.transferCode = transferData.data.transfer_code;
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
        name: 'TutorNest',
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
      notes: 'Thank you for using TutorNest!',
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

export default app;
