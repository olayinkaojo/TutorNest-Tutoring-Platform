// =====================================================
// PAYMENT PLANS ROUTES - Supabase Edge Functions
// =====================================================
// Complete payment system with Flutterwave integration
// Handles: initialization, verification, webhooks, and booking generation

import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// =====================================================
// TYPES
// =====================================================

interface PaymentPlan {
  id: string;
  plan_type: 'trial' | 'once_weekly' | 'twice_weekly';
  name: string;
  description: string;
  price_naira: number;
  sessions_count: number;
  duration_weeks: number;
  sessions_per_week: number;
}

interface InitiatePaymentRequest {
  planType: 'trial' | 'once_weekly' | 'twice_weekly';
  tutorId: string;
  preferredStartDate?: string; // ISO date string
  preferredTime?: string; // HH:MM format
  subject?: string;
}

interface FlutterwaveInitResponse {
  status: string;
  message: string;
  data: {
    link: string;
    payment_link: string;
  };
}

interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data: {
    reference: string;
    amount: number;
    status: 'successful' | 'failed';
    created_at: string;
    customer: {
      email: string;
    };
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getSupabaseClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
}

function generatePaymentReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `TNP-${timestamp}-${random}`.toUpperCase();
}

async function initializeFlutterwavePayment(
  email: string,
  amount: number,
  reference: string,
  metadata: Record<string, any>
): Promise<FlutterwaveInitResponse> {
  const FLUTTERWAVE_SECRET = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  
  if (!FLUTTERWAVE_SECRET) {
    throw new Error('Flutterwave secret key not configured');
  }

  const response = await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FLUTTERWAVE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: reference,
      amount,
      currency: 'NGN',
      customer: {
        email,
      },
      payment_options: 'card,banktransfer',
      redirect_url: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'}/payment/verify`,
      meta: metadata,
      customizations: {
        title: 'TutorNest',
        logo: 'https://tutornest.com/logo.png',
      },
    }),
  });

  const data = await response.json();
  
  if (data.status !== 'success') {
    throw new Error(data.message || 'Failed to initialize payment');
  }

  return data;
}

async function verifyFlutterwavePayment(reference: string): Promise<FlutterwaveVerifyResponse> {
  const FLUTTERWAVE_SECRET = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  
  if (!FLUTTERWAVE_SECRET) {
    throw new Error('Flutterwave secret key not configured');
  }

  const response = await fetch(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${FLUTTERWAVE_SECRET}`,
    },
  });

  const data = await response.json();
  
  if (data.status !== 'success') {
    throw new Error(data.message || 'Failed to verify payment');
  }

  return data;
}

function calculateBookingDates(
  startDate: Date,
  sessionsCount: number,
  sessionsPerWeek: number
): Date[] {
  const dates: Date[] = [];
  const daysIncrement = sessionsPerWeek === 1 ? 7 : 3; // Weekly or twice-weekly (Mon/Thu pattern)
  
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < sessionsCount; i++) {
    dates.push(new Date(currentDate));
    
    // For twice weekly: alternate between 3 and 4 days
    if (sessionsPerWeek === 2 && i % 2 === 0) {
      currentDate.setDate(currentDate.getDate() + 3); // Monday to Thursday
    } else if (sessionsPerWeek === 2 && i % 2 === 1) {
      currentDate.setDate(currentDate.getDate() + 4); // Thursday to Monday
    } else {
      currentDate.setDate(currentDate.getDate() + daysIncrement);
    }
  }
  
  return dates;
}

async function createBookingsForPayment(
  supabase: any,
  paymentId: string,
  userId: string,
  tutorId: string,
  planId: string,
  plan: PaymentPlan,
  startDate: Date,
  preferredTime: string,
  subject?: string
) {
  const bookingDates = calculateBookingDates(
    startDate,
    plan.sessions_count,
    plan.sessions_per_week
  );

  const bookings = bookingDates.map((date, index) => ({
    payment_id: paymentId,
    user_id: userId,
    tutor_id: tutorId,
    plan_id: planId,
    session_number: index + 1,
    scheduled_date: date.toISOString().split('T')[0],
    scheduled_time: preferredTime,
    duration_minutes: 60,
    booking_status: 'scheduled',
    subject: subject || null,
    location: 'online',
  }));

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookings)
    .select();

  if (error) {
    console.error('Error creating bookings:', error);
    throw new Error(`Failed to create bookings: ${error.message}`);
  }

  return data;
}

// =====================================================
// ROUTES
// =====================================================

// GET /make-server-cbd74580/payments/plans
// Get all available payment plans
app.get('/make-server-cbd74580/payments/plans', async (c) => {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_naira', { ascending: true });

    if (error) {
      console.error('Error fetching payment plans:', error);
      return c.json({ error: 'Failed to fetch payment plans' }, 500);
    }

    return c.json({ plans: data });
  } catch (error: any) {
    console.error('Error in GET /payments/plans:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// POST /make-server-cbd74580/payments/initiate
// Initialize a payment with Paystack
app.post('/make-server-cbd74580/payments/initiate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid authentication token' }, 401);
    }

    const body: InitiatePaymentRequest = await c.req.json();
    const { planType, tutorId, preferredStartDate, preferredTime, subject } = body;

    // Validate required fields
    if (!planType || !tutorId) {
      return c.json({ error: 'Missing required fields: planType, tutorId' }, 400);
    }

    // Get payment plan
    const { data: plan, error: planError } = await supabase
      .from('payment_plans')
      .select('*')
      .eq('plan_type', planType)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return c.json({ error: 'Invalid payment plan' }, 400);
    }

    // Verify tutor exists and is a tutor
    const { data: tutor, error: tutorError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .eq('id', tutorId)
      .single();

    if (tutorError || !tutor) {
      return c.json({ error: 'Invalid tutor ID' }, 400);
    }

    // Generate payment reference
    const paymentReference = generatePaymentReference();

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        tutor_id: tutorId,
        plan_id: plan.id,
        amount_naira: plan.price_naira,
        payment_reference: paymentReference,
        payment_status: 'pending',
        payment_method: 'paystack',
        metadata: {
          plan_type: planType,
          preferred_start_date: preferredStartDate,
          preferred_time: preferredTime,
          subject,
        },
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      return c.json({ error: 'Failed to create payment record' }, 500);
    }

    // Initialize Flutterwave payment
    const flutterwaveResponse = await initializeFlutterwavePayment(
      user.email!,
      plan.price_naira,
      paymentReference,
      {
        payment_id: payment.id,
        user_id: user.id,
        tutor_id: tutorId,
        plan_type: plan.name,
      }
    );

    // Update payment record with Flutterwave details
    await supabase
      .from('payments')
      .update({
        flutterwave_reference: flutterwaveResponse.data.reference,
        flutterwave_payment_link: flutterwaveResponse.data.link || flutterwaveResponse.data.payment_link,
        payment_status: 'processing',
      })
      .eq('id', payment.id);

    return c.json({
      success: true,
      payment_id: payment.id,
      reference: paymentReference,
      authorization_url: flutterwaveResponse.data.link || flutterwaveResponse.data.payment_link,
    });

  } catch (error: any) {
    console.error('Error in POST /payments/initiate:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /make-server-cbd74580/payments/verify/:reference
// Verify payment and create bookings
app.get('/make-server-cbd74580/payments/verify/:reference', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid authentication token' }, 401);
    }

    const reference = c.req.param('reference');

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        payment_plans (*)
      `)
      .eq('payment_reference', reference)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    // If already paid, return existing data
    if (payment.payment_status === 'paid') {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('payment_id', payment.id);

      return c.json({
        success: true,
        payment,
        bookings,
        message: 'Payment already verified',
      });
    }

    // Verify with Flutterwave
    const flutterwaveData = await verifyFlutterwavePayment(reference);

    if (flutterwaveData.data.status !== 'successful') {
      // Update payment as failed
      await supabase
        .from('payments')
        .update({
          payment_status: 'failed',
          failed_reason: 'Payment not successful on Flutterwave',
        })
        .eq('id', payment.id);

      return c.json({
        success: false,
        error: 'Payment verification failed',
      }, 400);
    }

    // Update payment as paid
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        payment_status: 'paid',
        paid_at: new Date(flutterwaveData.data.created_at).toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Error updating payment status:', updateError);
      throw new Error('Failed to update payment status');
    }

    // Create bookings
    const startDate = payment.metadata?.preferred_start_date 
      ? new Date(payment.metadata.preferred_start_date)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 1 week from now

    const preferredTime = payment.metadata?.preferred_time || '10:00';

    const bookings = await createBookingsForPayment(
      supabase,
      payment.id,
      user.id,
      payment.tutor_id,
      payment.plan_id,
      payment.payment_plans,
      startDate,
      preferredTime,
      payment.metadata?.subject
    );

    return c.json({
      success: true,
      payment: {
        ...payment,
        payment_status: 'paid',
        paid_at: paystackData.data.paid_at,
      },
      bookings,
      message: 'Payment verified and bookings created successfully',
    });

  } catch (error: any) {
    console.error('Error in GET /payments/verify:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// POST /make-server-cbd74580/webhooks/paystack
// Handle Paystack webhook events
app.post('/make-server-cbd74580/webhooks/paystack', async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header('x-paystack-signature');

    // Verify webhook signature
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!PAYSTACK_SECRET) {
      return c.json({ error: 'Webhook secret not configured' }, 500);
    }

    const crypto = await import('node:crypto');
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET)
      .update(body)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid webhook signature');
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body);
    const supabase = getSupabaseClient();

    // Log webhook event
    await supabase.from('webhook_logs').insert({
      event_type: event.event,
      payment_reference: event.data?.reference,
      payload: event,
      processed: false,
    });

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const reference = event.data.reference;

      // Get payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          payment_plans (*)
        `)
        .eq('payment_reference', reference)
        .single();

      if (paymentError || !payment) {
        console.error('Payment not found for reference:', reference);
        return c.json({ error: 'Payment not found' }, 404);
      }

      // Skip if already processed
      if (payment.payment_status === 'paid') {
        console.log('Payment already processed:', reference);
        return c.json({ message: 'Already processed' });
      }

      // Update payment status
      await supabase
        .from('payments')
        .update({
          payment_status: 'paid',
          paid_at: new Date(event.data.paid_at).toISOString(),
        })
        .eq('id', payment.id);

      // Create bookings
      const startDate = payment.metadata?.preferred_start_date 
        ? new Date(payment.metadata.preferred_start_date)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const preferredTime = payment.metadata?.preferred_time || '10:00';

      await createBookingsForPayment(
        supabase,
        payment.id,
        payment.user_id,
        payment.tutor_id,
        payment.plan_id,
        payment.payment_plans,
        startDate,
        preferredTime,
        payment.metadata?.subject
      );

      // Mark webhook as processed
      await supabase
        .from('webhook_logs')
        .update({ processed: true })
        .eq('payment_reference', reference)
        .eq('event_type', 'charge.success');

      console.log('Webhook processed successfully for:', reference);
    }

    return c.json({ message: 'Webhook received' });

  } catch (error: any) {
    console.error('Error in POST /webhooks/paystack:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /make-server-cbd74580/payments/my-payments
// Get user's payment history
app.get('/make-server-cbd74580/payments/my-payments', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid authentication token' }, 401);
    }

    const { data, error } = await supabase
      .from('payment_summary_view')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      return c.json({ error: 'Failed to fetch payment history' }, 500);
    }

    return c.json({ payments: data });

  } catch (error: any) {
    console.error('Error in GET /payments/my-payments:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /make-server-cbd74580/payments/my-bookings
// Get user's bookings
app.get('/make-server-cbd74580/payments/my-bookings', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Invalid authentication token' }, 401);
    }

    const { data, error } = await supabase
      .from('active_bookings_view')
      .select('*')
      .eq('student_id', user.id)
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return c.json({ error: 'Failed to fetch bookings' }, 500);
    }

    return c.json({ bookings: data });

  } catch (error: any) {
    console.error('Error in GET /payments/my-bookings:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /make-server-cbd74580/payments/test-config
// Test endpoint to verify Paystack configuration
app.get('/make-server-cbd74580/payments/test-config', async (c) => {
  try {
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY');
    const FRONTEND_URL = Deno.env.get('FRONTEND_URL');
    
    return c.json({
      paystack_configured: !!PAYSTACK_SECRET,
      paystack_key_prefix: PAYSTACK_SECRET ? PAYSTACK_SECRET.substring(0, 10) + '...' : 'NOT SET',
      frontend_url: FRONTEND_URL || 'NOT SET',
      expected_currency: 'NGN',
      enabled_channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default app;