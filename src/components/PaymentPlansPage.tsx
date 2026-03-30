// =====================================================
// PAYMENT PLANS SELECTION PAGE
// =====================================================
// Complete UI for selecting and purchasing tutoring plans

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Loader2, Calendar, Clock, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface PaymentPlansPageProps {
  tutorId: string;
  tutorName: string;
  subject?: string;
  onClose?: () => void;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

const calculatePerSessionPrice = (totalPrice: number, sessions: number): string => {
  return formatNaira(Math.round(totalPrice / sessions));
};

// =====================================================
// MAIN COMPONENT
// =====================================================

export function PaymentPlansPage({ tutorId, tutorName, subject, onClose }: PaymentPlansPageProps) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/plans`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
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
      // Get user's access token
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        toast.error('Please log in to continue');
        navigate('/auth');
        return;
      }

      // Initialize payment
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/payments/initiate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            planType: plan.plan_type,
            tutorId: tutorId,
            preferredStartDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            preferredTime: '10:00',
            subject: subject,
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

      // Redirect to Paystack
      window.location.href = data.authorization_url;

    } catch (error: any) {
      console.error('Error initiating payment:', error);
      toast.error(error.message || 'Failed to process payment');
      setProcessing(null);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Book tutoring sessions with <span className="font-semibold text-primary">{tutorName}</span>
        </p>
        {subject && (
          <Badge variant="secondary" className="mt-2 text-base px-4 py-1">
            {subject}
          </Badge>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isPopular = plan.plan_type === 'once_weekly';
          const isBestValue = plan.plan_type === 'twice_weekly';
          const isProcessing = processing === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative transition-all hover:shadow-lg ${
                selectedPlan === plan.id ? 'ring-2 ring-primary' : ''
              } ${isPopular || isBestValue ? 'border-primary' : ''}`}
            >
              {/* Badge */}
              {isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              {isBestValue && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="px-4 py-1 bg-green-600 hover:bg-green-700">
                    Best Value
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">
                    {formatNaira(plan.price_naira)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {calculatePerSessionPrice(plan.price_naira, plan.sessions_count)} per session
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Calendar className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
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
                    <Check className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
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
                        <div className="text-muted-foreground">Monitor your improvement</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Savings Badge */}
                {plan.plan_type !== 'trial' && (
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                    <div className="text-sm font-semibold text-green-700 dark:text-green-400">
                      Save {plan.plan_type === 'once_weekly' ? '₦0' : '₦0'} vs single sessions
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={!!processing}
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

      {/* Additional Info */}
      <div className="mt-12 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Qualified Tutors</div>
                <div className="text-muted-foreground">Verified and experienced educators</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Flexible Scheduling</div>
                <div className="text-muted-foreground">Choose times that work for you</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Online Sessions</div>
                <div className="text-muted-foreground">Learn from anywhere</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div className="font-semibold">Progress Reports</div>
                <div className="text-muted-foreground">Track your learning journey</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Close Button */}
      {onClose && (
        <div className="text-center mt-8">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

export default PaymentPlansPage;
