import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner@2.0.3';
import {
  Lock,
  Zap,
  Calendar,
  Check,
  AlertCircle,
  CreditCard,
  Clock,
  Star,
  ChevronRight
} from 'lucide-react';

interface TriviaPaywallProps {
  subject: string;
  grade: string;
  status: 'free' | 'free_trial' | 'trial_expired' | 'paid_active' | 'subscription_expired';
  expiresAt?: string;
  daysRemaining?: number;
  pricePerMonth?: number;
  onSubscribe?: (subject: string) => void;
  onDismiss?: () => void;
}

export function TriviaPaywall({
  subject,
  grade,
  status,
  expiresAt,
  daysRemaining,
  pricePerMonth = 3000,
  onSubscribe,
  onDismiss
}: TriviaPaywallProps) {
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      if (onSubscribe) {
        onSubscribe(subject);
      } else {
        // Default: redirect to payment page
        toast.info('Redirecting to payment...');
        window.location.href = `/payment?product=trivia_${subject.toLowerCase().replace(/\s+/g, '_')}`;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Could not initialize subscription. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // Format expiration date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Determine message based on status
  const getMessage = () => {
    switch (status) {
      case 'free_trial':
        return {
          title: '🎉 Free Trial Active',
          subtitle: `${daysRemaining} days remaining`,
          description: `Enjoy unlimited access to ${subject} trivia during your free trial period.`,
          icon: '✨',
          color: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-900'
        };
      case 'trial_expired':
        return {
          title: '⏰ Trial Ended',
          subtitle: 'Subscribe to continue',
          description: `Your free trial ended on ${formatDate(expiresAt || new Date().toISOString())}. Subscribe now to keep playing ${subject} trivia.`,
          icon: '🔒',
          color: 'bg-orange-50 border-orange-200',
          textColor: 'text-orange-900'
        };
      case 'paid_active':
        return {
          title: '✅ Subscription Active',
          subtitle: `Renews on ${formatDate(expiresAt || new Date().toISOString())}`,
          description: `You have unlimited access to ${subject} trivia. Your subscription renews automatically.`,
          icon: '✔️',
          color: 'bg-green-50 border-green-200',
          textColor: 'text-green-900'
        };
      case 'subscription_expired':
        return {
          title: '❌ Subscription Expired',
          subtitle: 'Renew to continue playing',
          description: `Your subscription expired on ${formatDate(expiresAt || new Date().toISOString())}. Renew now to unlock ${subject} trivia again.`,
          icon: '🔐',
          color: 'bg-red-50 border-red-200',
          textColor: 'text-red-900'
        };
      default:
        return {
          title: '🎮 Premium Feature',
          subtitle: 'Subscribe for unlimited access',
          description: `Unlock ${subject} trivia with a monthly subscription. Get access to hundreds of questions and track your progress.`,
          icon: '⭐',
          color: 'bg-purple-50 border-purple-200',
          textColor: 'text-purple-900'
        };
    }
  };

  const message = getMessage();
  const isExpired = status === 'trial_expired' || status === 'subscription_expired';
  const isActive = status === 'free_trial' || status === 'paid_active';

  return (
    <>
      <Card className={`border-2 ${message.color} ${message.textColor}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{message.icon}</span>
              <div>
                <CardTitle className="text-lg">{message.title}</CardTitle>
                <CardDescription className={message.textColor}>
                  {message.subtitle}
                </CardDescription>
              </div>
            </div>
            {daysRemaining && isActive && (
              <Badge variant="secondary" className="ml-2">
                <Clock className="w-3 h-3 mr-1" />
                {daysRemaining} days left
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <p className="text-sm leading-relaxed">{message.description}</p>

          {/* Benefits */}
          {isExpired && (
            <div className="bg-white bg-opacity-50 rounded-lg p-3 space-y-2">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                What you'll unlock:
              </h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  Unlimited {subject} questions
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  Earn XP and climb the leaderboard
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  Track your progress over time
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3 h-3 text-green-600" />
                  Compete with other students
                </li>
              </ul>
            </div>
          )}

          {/* Pricing */}
          {isExpired && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Monthly subscription</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ₦{pricePerMonth?.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">per month per subject</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-purple-700 bg-white px-2 py-1 rounded">
                    Best Value
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {isExpired ? (
              <>
                <Button
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {isSubscribing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
                {onDismiss && (
                  <Button
                    onClick={onDismiss}
                    variant="outline"
                    className="px-4"
                  >
                    Later
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowDetails(!showDetails)}
                  variant="outline"
                  className="flex-1"
                >
                  {showDetails ? 'Hide Details' : 'View Details'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                {onDismiss && (
                  <Button onClick={onDismiss} variant="ghost">
                    ✕
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Info text */}
          {isActive && (
            <p className="text-xs text-gray-600 text-center">
              Your subscription ensures you have continuous access to all {subject} trivia content
            </p>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {subject} Trivia Subscription
            </DialogTitle>
            <DialogDescription>
              Everything you need to know about our premium trivia service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Free Trial Info */}
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                30-Day Free Trial
              </h3>
              <p className="text-sm text-gray-600">
                Every student gets 30 days of unlimited access on their first play. No payment method required.
              </p>
            </div>

            {/* Pricing */}
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h3 className="font-semibold text-sm mb-1">Pricing</h3>
              <p className="text-sm text-gray-600">
                ₦{pricePerMonth?.toLocaleString()} per month per subject. Cancel anytime.
              </p>
            </div>

            {/* Features */}
            <div className="border-l-4 border-green-500 pl-4 py-2">
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" />
                Included Features
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✓ 500+ questions per subject</li>
                <li>✓ Multiple difficulty levels</li>
                <li>✓ Earn XP and badges</li>
                <li>✓ Leaderboard rankings</li>
                <li>✓ Performance tracking</li>
                <li>✓ Daily challenges</li>
              </ul>
            </div>

            {/* Warning */}
            <Alert className="bg-orange-50 border-orange-200">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-800">
                After your free trial ends, you'll need an active subscription to play.
              </AlertDescription>
            </Alert>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Subscribe Now
            </Button>
            <Button
              onClick={() => setShowDetails(false)}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
