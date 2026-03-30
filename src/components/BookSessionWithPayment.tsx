import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Check, Calendar, Clock, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface BookSessionWithPaymentProps {
  session: any;
  booking: {
    tutorId: string;
    tutorName: string;
    studentId: string;
    studentName: string;
    subject: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

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

export function BookSessionWithPayment({
  session,
  booking,
  onSuccess,
  onCancel,
}: BookSessionWithPaymentProps) {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Fetch plans on mount
  useState(() => {
    fetchPlans();
  });

  const fetchPlans = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/plans`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch payment plans');
      }

      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load payment plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan: PaymentPlan) => {
    setSelectedPlan(plan.id);
    setProcessing(plan.id);

    try {
      // Initialize payment with new system
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/initiate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planType: plan.plan_type,
            tutorId: booking.tutorId,
            preferredStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            preferredTime: '10:00',
            subject: booking.subject,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize payment');
      }

      const data = await response.json();

      // Store payment reference for verification
      localStorage.setItem('pending_payment_reference', data.reference);
      localStorage.setItem('pending_payment_id', data.payment_id);

      // Close dialog before redirecting
      onCancel?.();

      // Redirect to Paystack
      window.location.href = data.authorization_url;

    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to process payment');
      setProcessing(null);
      setSelectedPlan(null);
    }
  };

  const formatNaira = (amount: number): string => {
    return `₦${amount.toLocaleString('en-NG')}`;
  };

  const calculatePerSessionPrice = (totalPrice: number, sessions: number): string => {
    return formatNaira(Math.round(totalPrice / sessions));
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onCancel?.()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#625d9c]" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Tutoring Plan</DialogTitle>
          <DialogDescription>
            Book sessions with <span className="font-semibold text-[#625d9c]">{booking.tutorName}</span> for {booking.subject}
          </DialogDescription>
        </DialogHeader>

        {/* Session Info Alert */}
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            <strong>Student:</strong> {booking.studentName} • <strong>Subject:</strong> {booking.subject}
          </AlertDescription>
        </Alert>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isPopular = plan.plan_type === 'once_weekly';
            const isBestValue = plan.plan_type === 'twice_weekly';
            const isProcessing = processing === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative transition-all hover:shadow-lg ${
                  selectedPlan === plan.id ? 'ring-2 ring-[#625d9c]' : ''
                } ${isPopular || isBestValue ? 'border-[#625d9c]' : ''}`}
              >
                {/* Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="px-4 py-1 bg-[#625d9c] hover:bg-[#625d9c]/90">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {isBestValue && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="px-4 py-1 bg-[#5d9827] hover:bg-[#5d9827]/90">
                      Best Value
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Price */}
                  <div className="text-center py-4">
                    <div className="text-3xl font-bold text-[#625d9c]">
                      {formatNaira(plan.price_naira)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {calculatePerSessionPrice(plan.price_naira, plan.sessions_count)} per session
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-5 h-5 text-[#5d9827] mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold">{plan.sessions_count} Sessions</div>
                        <div className="text-muted-foreground">
                          {plan.sessions_per_week}x per week for {plan.duration_weeks} weeks
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold">60-minute sessions</div>
                        <div className="text-muted-foreground">Full hour of focused learning</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-[#625d9c] mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold">Scheduled booking</div>
                        <div className="text-muted-foreground">
                          {plan.plan_type === 'trial' 
                            ? 'Pick your time'
                            : 'Auto-scheduled sessions'
                          }
                        </div>
                      </div>
                    </div>

                    {plan.plan_type !== 'trial' && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <div className="font-semibold">Progress tracking</div>
                          <div className="text-muted-foreground">Monitor improvement</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => handleSelectPlan(plan)}
                    disabled={!!processing}
                    style={{ 
                      background: isPopular || isBestValue ? '#625d9c' : undefined 
                    }}
                    variant={isPopular || isBestValue ? 'default' : 'outline'}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Select {plan.name}</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Info Footer */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#5d9827] mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Secure Payment</div>
                <div className="text-muted-foreground">Protected by Paystack</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#5d9827] mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Currency: Nigerian Naira (₦)</div>
                <div className="text-muted-foreground">Card payments accepted</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
