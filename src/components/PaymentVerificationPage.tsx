// =====================================================
// PAYMENT VERIFICATION PAGE
// =====================================================
// Verifies payment after Paystack redirect and shows booking summary

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Calendar,
  Clock,
  User,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// =====================================================
// TYPES
// =====================================================

interface Booking {
  id: string;
  session_number: number;
  scheduled_date: string;
  scheduled_time: string;
  booking_status: string;
  subject: string;
  duration_minutes: number;
}

interface Payment {
  id: string;
  amount_naira: number;
  payment_status: string;
  paid_at: string;
  payment_plans: {
    name: string;
    plan_type: string;
    sessions_count: number;
  };
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PaymentVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    // Get reference from URL or localStorage
    const paymentReference = reference || localStorage.getItem('pending_payment_reference');

    if (!paymentReference) {
      setError('No payment reference found');
      setVerifying(false);
      return;
    }

    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        setError('Authentication required');
        setVerifying(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/verify/${paymentReference}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Payment verification failed');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setPayment(data.payment);
        setBookings(data.bookings || []);

        // Clear localStorage
        localStorage.removeItem('pending_payment_reference');
        localStorage.removeItem('pending_payment_id');

        toast.success('Payment successful! Your sessions have been booked.');
      } else {
        throw new Error('Payment was not successful');
      }
    } catch (err: any) {
      console.error('Error verifying payment:', err);
      setError(err.message || 'Failed to verify payment');
      toast.error(err.message || 'Payment verification failed');
    } finally {
      setVerifying(false);
    }
  };

  // Loading state
  if (verifying) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Verifying Payment...</h2>
        <p className="text-muted-foreground">Please wait while we confirm your transaction</p>
      </div>
    );
  }

  // Error state
  if (error || !success) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="w-12 h-12 text-red-600" />
              <div>
                <CardTitle className="text-2xl">Payment Failed</CardTitle>
                <CardDescription>{error || 'Something went wrong'}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Your payment could not be verified. If money was deducted from your account,
                please contact support with your payment reference.
              </AlertDescription>
            </Alert>

            <div className="flex gap-4">
              <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
                Go to Dashboard
              </Button>
              <Button onClick={() => navigate('/support')} className="flex-1">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Success Header */}
      <Card className="border-green-200 dark:border-green-800 mb-8">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
            <div>
              <CardTitle className="text-3xl">Payment Successful!</CardTitle>
              <CardDescription className="text-lg">
                Your tutoring sessions have been booked
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {payment?.payment_plans.name}
              </Badge>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Amount Paid</div>
              <div className="text-2xl font-bold text-green-600">
                {formatNaira(payment?.amount_naira || 0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Sessions Booked</div>
              <div className="text-2xl font-bold">{bookings.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Your Scheduled Sessions
          </CardTitle>
          <CardDescription>
            All {bookings.length} sessions have been automatically scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {bookings.map((booking, index) => (
              <div
                key={booking.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  index === 0 ? 'bg-primary/5 border-primary' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold">
                    {booking.session_number}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {formatDate(booking.scheduled_date)}
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">Next Session</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(booking.scheduled_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {booking.subject || 'Subject TBD'}
                      </span>
                      <span>{booking.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline">{booking.booking_status}</Badge>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6">
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="flex-1"
              size="lg"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              onClick={() => navigate('/bookings')} 
              variant="outline"
              className="flex-1"
              size="lg"
            >
              View All Bookings
            </Button>
          </div>

          {/* Next Steps */}
          <Alert className="mt-6">
            <AlertDescription>
              <strong>Next Steps:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Check your email for booking confirmations</li>
                <li>Your tutor will contact you before the first session</li>
                <li>You can reschedule sessions from your dashboard</li>
                <li>Session links will be sent 24 hours before each class</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Payment Receipt */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Payment Receipt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment ID:</span>
              <span className="font-mono">{payment?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{payment?.paid_at ? new Date(payment.paid_at).toLocaleString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan:</span>
              <span>{payment?.payment_plans.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sessions:</span>
              <span>{payment?.payment_plans.sessions_count}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-2 border-t">
              <span>Total Paid:</span>
              <span className="text-green-600">{formatNaira(payment?.amount_naira || 0)}</span>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={() => window.print()}>
            Print Receipt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default PaymentVerificationPage;
