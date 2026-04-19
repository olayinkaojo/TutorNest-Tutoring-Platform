import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';

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
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShowPlans(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
      const publicKey =
        import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY ||
        'FLWPUBK_TEST-faf29eb495805d5a046cac66366b2eae-X';

      // 2. Open Flutterwave inline checkout.
      //    The callback must return synchronously so Flutterwave can close its
      //    modal immediately. We capture the tx_ref and run confirmPayment AFTER
      //    the modal is gone — otherwise the app is stuck behind Flutterwave's
      //    "Thanks for your payment!" screen while we await the backend call.
      let successTxRef: string | null = null;
      let paymentCancelled = false;

      await new Promise<void>((resolve) => {
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
          // Synchronous callback — store tx_ref, resolve immediately so modal closes
          callback: (response: { status: string; tx_ref: string; transaction_id: number }) => {
            if (response.status === 'successful' || response.status === 'completed') {
              successTxRef = response.tx_ref;
            }
            resolve(); // close the modal right away regardless
          },
          onclose: () => {
            if (!successTxRef) paymentCancelled = true;
            resolve();
          },
        });
      });

      // 3. Modal is now closed — confirm payment if successful
      if (paymentCancelled || !successTxRef) {
        setProcessing(null);
        return;
      }

      await confirmPayment(successTxRef, plan.name);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md text-center p-8 space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#f0f4ff' }}>
            <CheckCircle className="w-9 h-9" style={{ color: '#625d9c' }} />
          </div>
          <h2 className="text-xl font-bold">Booking Confirmed!</h2>
          <p className="text-gray-600">
            <span className="font-semibold">{success.sessions} session{success.sessions > 1 ? 's' : ''}</span> have been scheduled
            with <span className="font-semibold">{tutorName}</span>.
          </p>
          <p className="text-sm text-gray-500">
            Starting <strong>{new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong> at <strong>{startTime}</strong>
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
      </div>
    );
  }

  // ─── Plan selector ───────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-7 border-b bg-gradient-to-r from-indigo-50 via-white to-green-50 relative overflow-hidden rounded-t-2xl">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-indigo-200/30 blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-emerald-200/30 blur-2xl" />
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">Choose Your Tutoring Plan</h2>
            <p className="mt-1 text-sm text-gray-500">
              Book sessions with <span className="font-semibold" style={{ color: '#625d9c' }}>{tutorName}</span>
              {subject ? ` for ${subject}` : ''}
            </p>
          </div>

          <div className="mt-4 grid sm:grid-cols-3 gap-2 text-sm relative z-10">
            <div className="rounded-lg border bg-white/90 backdrop-blur px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">Student</div>
              <div className="font-medium text-gray-900 truncate">{studentName}</div>
            </div>
            <div className="rounded-lg border bg-white/90 backdrop-blur px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">Start Date</div>
              <div className="font-medium text-gray-900">
                {new Date(startDate + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
            <div className="rounded-lg border bg-white/90 backdrop-blur px-3 py-2 shadow-sm">
              <div className="text-xs text-gray-500">Start Time</div>
              <div className="font-medium text-gray-900">{startTime}</div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-4">

        <Alert className="bg-blue-50 border-blue-200 py-2.5">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            Choose a plan below and complete payment securely.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-4 mt-1">
          {PLANS.map((plan, index) => {
            const isPopular = plan.planType === 'once_weekly';
            const isBestValue = plan.planType === 'twice_weekly';
            const isProcessing = processing === plan.id;
            const perSession = Math.round(plan.price / plan.sessions);

            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${isPopular || isBestValue ? 'border-[#625d9c] shadow-sm ring-1 ring-indigo-100' : 'border-gray-200'}`}
                  style={{
                    opacity: showPlans ? 1 : 0,
                    transform: showPlans ? 'translateY(0px)' : 'translateY(8px)',
                    transition: `opacity 320ms ease, transform 320ms ease`,
                    transitionDelay: `${index * 70}ms`,
                  }}
              >
                {isPopular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="px-2.5 py-0.5 text-[11px] sm:text-xs bg-[#625d9c] hover:bg-[#625d9c]/90">Most Popular</Badge>
                  </div>
                )}
                {isBestValue && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="px-2.5 py-0.5 text-[11px] sm:text-xs bg-[#5d9827] hover:bg-[#5d9827]/90">Best Value</Badge>
                  </div>
                )}

                    <CardHeader className="pb-2.5">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-xs min-h-0 sm:min-h-[2.5rem]">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                    <div className="text-center py-2.5 rounded-lg border" style={{ backgroundColor: '#f7f7fc' }}>
                    <div className="text-2xl font-bold" style={{ color: '#625d9c' }}>
                      {formatNaira(plan.price)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {plan.sessions > 1 ? `${formatNaira(perSession)} per session` : 'flat rate'}
                    </div>
                  </div>

                    <div className="space-y-2.5">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-[#5d9827] mt-0.5 shrink-0" />
                        <div className="text-[11px] sm:text-xs leading-relaxed">
                        <div className="font-semibold">{plan.sessions} Session{plan.sessions > 1 ? 's' : ''}</div>
                        <div className="text-muted-foreground">
                          {plan.sessionsPerWeek}× weekly{plan.weeks > 1 ? ` • ${plan.weeks} weeks` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                        <div className="text-[11px] sm:text-xs leading-relaxed">
                        <div className="font-semibold">60-minute sessions</div>
                        <div className="text-muted-foreground">Focused, structured lesson time</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#625d9c] mt-0.5 shrink-0" />
                        <div className="text-[11px] sm:text-xs leading-relaxed">
                          <div className="font-semibold">Calendar scheduling included</div>
                        <div className="text-muted-foreground">
                            {plan.planType === 'trial' ? 'Single-slot booking' : 'Recurring plan schedule'}
                        </div>
                      </div>
                    </div>

                    {plan.planType !== 'trial' && (
                      <div className="flex items-start gap-2">
                        <TrendingUp className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                          <div className="text-[11px] sm:text-xs leading-relaxed">
                          <div className="font-semibold">Progress tracking</div>
                          <div className="text-muted-foreground">Monitor improvement over the term</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="pt-1">
                  <Button
                      className="w-full shadow-sm h-10 sm:h-11"
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
        <div className="rounded-lg border bg-gray-50 px-3.5 py-3 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-3">
          <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#5d9827]" /> Secure checkout</span>
          <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#5d9827]" /> NGN pricing</span>
          <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#5d9827]" /> Instant scheduling</span>
        </div>

        <div className="flex justify-center pt-1">
          <Button variant="ghost" onClick={onCancel} disabled={!!processing}>Cancel</Button>
        </div>
        </div>
      </div>
    </div>
  );
}
