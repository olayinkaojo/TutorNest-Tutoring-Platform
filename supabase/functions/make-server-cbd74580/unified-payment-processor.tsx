// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED PAYMENT PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════
// Handles ALL payment types through Flutterwave:
// - Tutor Booking Sessions
// - Subscription Plans
// - Bookshop Purchases
// - Platform Credits
// - Organization Invoices

type PaymentType = 'booking' | 'subscription' | 'bookshop' | 'credits' | 'org_invoice';
type PaymentCurrency = 'NGN' | 'GBP' | 'USD';

interface PaymentRequest {
  type: PaymentType;
  userId: string;
  email: string;
  amount: number;
  currency: PaymentCurrency;
  description: string;
  metadata: Record<string, any>;
  redirectUrl?: string;
}

interface FlutterwavePaymentResponse {
  status: string;
  message?: string;
  data?: {
    link?: string;
    payment_link?: string;
    reference?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE PAYMENT PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════════

export async function initializeFlutterwavePayment(
  request: PaymentRequest
): Promise<{
  success: boolean;
  paymentId: string;
  reference: string;
  authorizationUrl: string;
  error?: string;
}> {
  const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY') ?? '';
  
  if (!FLUTTERWAVE_SECRET_KEY) {
    console.error('Flutterwave secret key not configured');
    return {
      success: false,
      paymentId: '',
      reference: '',
      authorizationUrl: '',
      error: 'Payment gateway not configured'
    };
  }

  try {
    // Generate unique reference for this payment
    const reference = `${request.type.toUpperCase()}_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`;
    const paymentId = crypto.randomUUID();

    // Build Flutterwave request
    const flutterwaveRequest = {
      tx_ref: reference,
      amount: request.amount,
      currency: request.currency,
      customer: {
        email: request.email,
        name: request.metadata.customerName || 'Customer',
      },
      payment_options: 'card,banktransfer,ussd,mobile_money',
      customizations: {
        title: `TutorNest - ${getPaymentTypeDisplayName(request.type)}`,
        description: request.description,
        logo: 'https://tutornest.org/logo.png',
      },
      meta: {
        paymentId,
        paymentType: request.type,
        userId: request.userId,
        ...request.metadata,
      },
      redirect_url: request.redirectUrl || 'https://tutornest.org/payment/callback',
    };

    console.log(`[UnifiedPaymentProcessor] Initializing ${request.type} payment`, {
      reference,
      amount: request.amount,
      currency: request.currency,
      userId: request.userId,
    });

    // Call Flutterwave API
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flutterwaveRequest),
    });

    const data = await response.json() as FlutterwavePaymentResponse;

    if (data.status !== 'success' || !data.data) {
      console.error(`[UnifiedPaymentProcessor] Flutterwave init failed: ${data.message}`);
      return {
        success: false,
        paymentId: '',
        reference: '',
        authorizationUrl: '',
        error: data.message || 'Failed to initialize payment'
      };
    }

    const paymentLink = data.data.link || data.data.payment_link || '';
    if (!paymentLink) {
      console.error('[UnifiedPaymentProcessor] No payment link in Flutterwave response');
      return {
        success: false,
        paymentId: '',
        reference: '',
        authorizationUrl: '',
        error: 'No payment link returned from gateway'
      };
    }

    console.log(`[UnifiedPaymentProcessor] Successfully initialized payment: ${paymentId}`);

    return {
      success: true,
      paymentId,
      reference,
      authorizationUrl: paymentLink,
    };
  } catch (error: unknown) {
    console.error('[UnifiedPaymentProcessor] Error initializing payment:', error);
    return {
      success: false,
      paymentId: '',
      reference: '',
      authorizationUrl: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function verifyFlutterwavePayment(
  reference: string
): Promise<{
  success: boolean;
  paymentVerified: boolean;
  amount?: number;
  currency?: string;
  email?: string;
  metadata?: Record<string, any>;
  error?: string;
}> {
  const FLUTTERWAVE_SECRET_KEY = Deno.env.get('FLUTTERWAVE_SECRET_KEY') ?? '';
  
  if (!FLUTTERWAVE_SECRET_KEY) {
    return {
      success: false,
      paymentVerified: false,
      error: 'Payment gateway not configured'
    };
  }

  try {
    console.log(`[UnifiedPaymentProcessor] Verifying payment: ${reference}`);

    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    const data = await response.json() as FlutterwavePaymentResponse & {
      data?: {
        status?: string;
        amount?: number;
        currency?: string;
        customer?: { email: string };
        meta?: Record<string, any>;
      }
    };

    if (data.status !== 'success') {
      console.warn(`[UnifiedPaymentProcessor] Payment verification failed: ${data.message}`);
      return {
        success: true,
        paymentVerified: false,
        error: data.message
      };
    }

    if (data.data?.status !== 'successful') {
      console.warn(`[UnifiedPaymentProcessor] Payment not successful: ${data.data?.status}`);
      return {
        success: true,
        paymentVerified: false,
        error: `Payment status: ${data.data?.status}`
      };
    }

    console.log(`[UnifiedPaymentProcessor] Payment verified successfully: ${reference}`);

    return {
      success: true,
      paymentVerified: true,
      amount: data.data?.amount,
      currency: data.data?.currency,
      email: data.data?.customer?.email,
      metadata: data.data?.meta,
    };
  } catch (error: unknown) {
    console.error('[UnifiedPaymentProcessor] Error verifying payment:', error);
    return {
      success: false,
      paymentVerified: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getPaymentTypeDisplayName(type: PaymentType): string {
  const names: Record<PaymentType, string> = {
    booking: 'Tutor Session Booking',
    subscription: 'Subscription Plan',
    bookshop: 'Educational Book Purchase',
    credits: 'Platform Credits',
    org_invoice: 'Organization Invoice',
  };
  return names[type] || 'Payment';
}

export function buildPaymentMetadata(
  type: PaymentType,
  additionalData: Record<string, any>
): Record<string, any> {
  return {
    paymentType: type,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };
}

export function calculatePlatformFee(
  amount: number,
  feePercentage: number = 0.02
): { tutorAmount?: number; platformAmount?: number; studentAmount?: number; platformFee: number } {
  const platformFee = Math.round(amount * feePercentage * 100) / 100;
  
  // For tutor bookings, split is 80/20
  if (feePercentage === 0.2) {
    return {
      tutorAmount: Math.round(amount * 0.8 * 100) / 100,
      platformAmount: Math.round(amount * 0.2 * 100) / 100,
      platformFee: Math.round(amount * 0.2 * 100) / 100,
    };
  }
  
  // For others, just calculate platform fee
  return {
    studentAmount: amount - platformFee,
    platformFee,
  };
}

export const PaymentProcessor = {
  initializeFlutterwavePayment,
  verifyFlutterwavePayment,
  getPaymentTypeDisplayName,
  buildPaymentMetadata,
  calculatePlatformFee,
};
