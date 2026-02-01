import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PaymentProcessorProps {
  bookingId: string;
  tutorId: string;
  studentId: string;
  subject: string;
  amount: number;
  email: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: string) => void;
  metadata?: any;
}

export function PaymentProcessor({
  bookingId,
  tutorId,
  studentId,
  subject,
  amount,
  email,
  onSuccess,
  onError,
  metadata = {},
}: PaymentProcessorProps) {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const initializePayment = async () => {
    setProcessing(true);
    setStatus('processing');
    setErrorMessage('');

    try {
      // Get access token
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Please sign in to make a payment');
      }

      // Initialize payment
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/initialize`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bookingId,
            tutorId,
            studentId,
            subject,
            amount,
            email,
            metadata,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Open Paystack payment modal
      // @ts-ignore - PaystackPop is loaded via script
      const handler = window.PaystackPop.setup({
        key: 'pk_test_XXXXXXXXXXXXXXXXXXXXXXXX', // This should be the Paystack public key
        email: email,
        amount: amount * 100, // Paystack expects amount in kobo
        currency: 'NGN',
        ref: data.payment.reference,
        callback: async function(response: any) {
          // Payment successful, verify with backend
          await verifyPayment(response.reference);
        },
        onClose: function() {
          setProcessing(false);
          setStatus('idle');
        }
      });

      handler.openIframe();
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      setErrorMessage(error.message || 'Failed to initialize payment');
      setStatus('error');
      setProcessing(false);
      onError?.(error.message);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      const { getSupabaseClient } = await import('../utils/supabase/client');
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Session expired');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/verify/${reference}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        onSuccess?.(data.payment);
      } else {
        throw new Error(data.error || 'Payment verification failed');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      setErrorMessage(error.message || 'Failed to verify payment');
      setStatus('error');
      onError?.(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Information
        </CardTitle>
        <CardDescription>
          Complete your payment to confirm the booking
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subject:</span>
            <span>{subject}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="text-lg">₦{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Platform Fee (20%):</span>
            <span>₦{(amount * 0.2).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tutor Receives (80%):</span>
            <span>₦{(amount * 0.8).toLocaleString()}</span>
          </div>
        </div>

        {status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {status === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Payment successful! Your booking is confirmed.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={initializePayment}
          disabled={processing || status === 'success'}
          className="w-full"
        >
          {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === 'success' ? 'Payment Complete' : `Pay ₦${amount.toLocaleString()}`}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secured by Paystack. Your payment information is encrypted and secure.
        </p>
      </CardContent>
    </Card>
  );
}
