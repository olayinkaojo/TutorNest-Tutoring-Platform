import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Check, Calendar, Clock, TrendingUp, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ─── Fixed plan definitions ────────────────────────────────────────────────
const PLANS = [
  {
    id: 'trial',
    planType: 'trial' as const,
    name: 'Trial Session',
    description: 'Try one session before committing to a full term.',
    price: 20_000,
    sessions: 1,
    sessionsPerWeek: 1,
    weeks: 1,
  },
  {
    id: 'once_weekly',
    planType: 'once_weekly' as const,
    name: 'Once a Week',
    description: '1 session per week for a full 13-week term.',
    price: 260_000,
    sessions: 13,
    sessionsPerWeek: 1,
    weeks: 13,
  },
  {
    id: 'twice_weekly',
    planType: 'twice_weekly' as const,
    name: 'Twice a Week',
    description: '2 sessions per week for a full 13-week term.',
    price: 520_000,
    sessions: 26,
    sessionsPerWeek: 2,
    weeks: 13,
  },
];

interface BookSessionWithPaymentProps {
  session: any;
  tutorId: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  subject?: string;
  startDate: string;   // YYYY-MM-DD
  startTime: string;   // HH:MM
  onSuccess?: (sessionsCreated: number) => void;
  onCancel?: () => void;
}

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function BookSessionWithPayment({
  session,
  tutorId,
  tutorName,
  studentId,
  studentName,
  subject,
  startDate,
  startTime,
  onSuccess,
  onCancel,
}: BookSessionWithPaymentProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ sessions: number; planName: string } | null>(null);

  const confirmPayment = async (reference: string, planName: string) => {
    const confirmRes = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/confirm-plan/${reference}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      }
    );

    let confirmData: any;
    const rawConfirm = await confirmRes.text();
    try {
      confirmData = JSON.parse(rawConfirm);
    } catch {
      throw new Error('Payment received but session creation failed. Please contact support with reference: ' + reference);
    }

    if (!confirmRes.ok || !confirmData.success) {
      throw new Error(confirmData.error || 'Sessions could not be created after payment');
    }

    setSuccess({ sessions: confirmData.sessionsCreated, planName });
  };

  const handleSelectPlan = async (plan: typeof PLANS[number]) => {
    setError('');
    setProcessing(plan.id);

    try {
      // 1. Initialise on backend — get Flutterwave tx_ref + amount
      const initRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/initiate-plan`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planType: plan.planType,
            tutorId,
            studentId,
            startDate,
            startTime,
            subject: subject ?? '',
            email: session.user.email,
          }),
        }
      );

      let initData: any;
      const rawText = await initRes.text();
      try {
        initData = JSON.parse(rawText);
      } catch {
        throw new Error(
          initRes.ok
            ? 'Unexpected server response. Please try again.'
            : `Server error (${initRes.status}). Please ensure the edge function is deployed.`
        );
      }

      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || 'Failed to initialise payment');
      }

      const { reference } = initData;
      const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;

      if (!publicKey) {
        throw new Error('Flutterwave public key not configured (VITE_FLUTTERWAVE_PUBLIC_KEY).');
      }

      // 2. Open Flutterwave inline checkout — callback fires when payment completes
      await new Promise<void>((resolve, reject) => {
        // @ts-ignore — FlutterwaveCheckout loaded via <script> in index.html
        window.FlutterwaveCheckout({
          public_key: publicKey,
          tx_ref: reference,
          amount: plan.price,
          currency: 'NGN',
          payment_options: 'card,banktransfer,ussd,mobilemoney',
          customer: {
            email: session.user.email,
            name: studentName,
          },
          customizations: {
            title: 'TutorNest',
            description: `${plan.name}${subject ? ' — ' + subject : ''}`,
            logo: 'https://tutornest.org/logo.png',
          },
          callback: async (response: { status: string; tx_ref: string; transaction_id: number }) => {
            if (response.status === 'successful' || response.status === 'completed') {
              try {
                await confirmPayment(response.tx_ref, plan.name);
                resolve();
              } catch (err: any) {
                reject(err);
              }
            } else {
              reject(new Error('Payment was not completed. Please try again.'));
            }
          },
          onclose: () => {
            // User closed modal without paying — not an error
            setProcessing(null);
            resolve();
          },
        });
      });
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  // ─── Success screen ──────────────────────────────────────────────────────
  if (success) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onSuccess?.(success.sessions); }}>
        <DialogContent className="max-w-md text-center">
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#f0f4ff' }}>
              <CheckCircle className="w-9 h-9" style={{ color: '#625d9c' }} />
            </div>
            <h2 className="text-xl font-bold">Booking Confirmed!</h2>
            <p className="text-gray-600">
              <span className="font-semibold">{success.sessions} session{success.sessions > 1 ? 's' : ''}</span> have been scheduled
              with <span className="font-semibold">{tutorName}</span>.
            </p>
            <p className="text-sm text-gray-500">
              Starting <strong>{new Date(startDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong> at <strong>{startTime}</strong>
            </p>
            <Alert className="bg-blue-50 border-blue-200 text-left">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                Calendar invites will be sent to both you and your tutor.
              </AlertDescription>
            </Alert>
            <Button
              className="w-full text-white"
              style={{ backgroundColor: '#625d9c' }}
              onClick={() => onSuccess?.(success.sessions)}
            >
              View My Bookings
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Plan selector ───────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Tutoring Plan</DialogTitle>
          <DialogDescription>
            Book sessions with <span className="font-semibold" style={{ color: '#625d9c' }}>{tutorName}</span>
            {subject ? ` for ${subject}` : ''}
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Student:</strong> {studentName}
            {subject && <> &bull; <strong>Subject:</strong> {subject}</>}
            &bull; <strong>Start:</strong>{' '}
            {new Date(startDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {startTime}
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-2">
          {PLANS.map((plan) => {
            const isPopular = plan.planType === 'once_weekly';
            const isBestValue = plan.planType === 'twice_weekly';
            const isProcessing = processing === plan.id;
            const perSession = Math.round(plan.price / plan.sessions);

            return (
              <Card
                key={plan.id}
                className={`relative transition-all hover:shadow-lg ${isPopular || isBestValue ? 'border-[#625d9c]' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1 bg-[#625d9c] hover:bg-[#625d9c]/90">Most Popular</Badge>
                  </div>
                )}
                {isBestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1 bg-[#5d9827] hover:bg-[#5d9827]/90">Best Value</Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-3xl font-bold" style={{ color: '#625d9c' }}>
                      {formatNaira(plan.price)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {plan.sessions > 1 ? `${formatNaira(perSession)} per session` : 'flat rate'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-5 h-5 text-[#5d9827] mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold">{plan.sessions} Session{plan.sessions > 1 ? 's' : ''}</div>
                        <div className="text-muted-foreground">
                          {plan.sessionsPerWeek}× per week{plan.weeks > 1 ? ` for ${plan.weeks} weeks` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold">60-minute sessions</div>
                        <div className="text-muted-foreground">Full hour of focused learning</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-[#625d9c] mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <div className="font-semibold">
                          {plan.planType === 'trial' ? 'Pick your time' : 'Calendar blocked'}
                        </div>
                        <div className="text-muted-foreground">
                          {plan.planType === 'trial'
                            ? 'Choose any available slot'
                            : 'All sessions auto-scheduled & locked in'}
                        </div>
                      </div>
                    </div>

                    {plan.planType !== 'trial' && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <div className="font-semibold">Progress tracking</div>
                          <div className="text-muted-foreground">Monitor improvement over the term</div>
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
                    variant={isPopular || isBestValue ? 'default' : 'outline'}
                    style={isPopular || isBestValue ? { backgroundColor: '#625d9c' } : undefined}
                  >
                    {isProcessing ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      `Pay ${formatNaira(plan.price)}`
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#5d9827] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Secure Payment</div>
                <div className="text-muted-foreground">Protected by Paystack — card, bank, USSD accepted</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#5d9827] mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Nigerian Naira (₦)</div>
                <div className="text-muted-foreground">Any card charged at the current Naira rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={!!processing}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
