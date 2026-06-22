import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import {
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface Subscription {
  id: string;
  parentId: string;
  tierId: string;
  tierName: string;
  price: number;
  currency: string;
  billingCycle: string;
  sessions: number;
  sessionsUsed: number;
  status: string;
  startDate: string;
  nextBillingDate: string;
  autoRenew: boolean;
  daysUntilRenewal?: number;
  needsRenewalReminder?: boolean;
  scheduledDowngrade?: {
    tierId: string;
    tierName: string;
    newPrice: number;
    creditAmount: number;
    effectiveDate: string;
  };
  cancellation?: {
    reason: string;
    feedback?: string;
    requestedAt: string;
    effectiveDate: string;
  };
}

interface CurrentSubscriptionProps {
  subscription: Subscription | null;
  onManageSubscription: () => void;
  onReactivate: () => void;
  onCancel: (reason: string, feedback: string) => void;
  onToggleAutoRenew: (autoRenew: boolean) => void;
}

export function CurrentSubscription({
  subscription,
  onManageSubscription,
  onReactivate,
  onCancel,
  onToggleAutoRenew
}: CurrentSubscriptionProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');

  if (!subscription) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <CreditCard className="w-12 h-12 text-gray-400" />
          <div>
            <h3 className="mb-2">No Active Subscription</h3>
            <p className="text-gray-600 mb-4">
              Choose a subscription plan to get started with Knowledge Fons Academy
            </p>
          </div>
          <Button onClick={onManageSubscription} className="bg-[#625d9c] hover:bg-[#4f4a7d]">
            View Plans
          </Button>
        </div>
      </Card>
    );
  }

  const sessionsPercentage = (subscription.sessionsUsed / subscription.sessions) * 100;
  const sessionsRemaining = subscription.sessions - subscription.sessionsUsed;

  const handleCancelConfirm = () => {
    onCancel(cancelReason, cancelFeedback);
    setShowCancelDialog(false);
    setCancelReason('');
    setCancelFeedback('');
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3>{subscription.tierName} Plan</h3>
              <Badge
                className={
                  subscription.status === 'active'
                    ? 'bg-[#5d9827]'
                    : subscription.status === 'cancelling'
                    ? 'bg-orange-500'
                    : 'bg-gray-500'
                }
              >
                {subscription.status === 'active' && 'Active'}
                {subscription.status === 'cancelling' && 'Ending Soon'}
                {subscription.status === 'cancelled' && 'Cancelled'}
              </Badge>
            </div>
            <p className="text-2xl">
              £{subscription.price}
              <span className="text-sm text-gray-600">/{subscription.billingCycle}</span>
            </p>
          </div>
          
          <Button
            onClick={onManageSubscription}
            variant="outline"
            className="border-[#625d9c] text-[#625d9c]"
          >
            Change Plan
          </Button>
        </div>

        {/* Renewal Reminder */}
        {subscription.needsRenewalReminder && subscription.status === 'active' && (
          <Alert className="mb-4 border-orange-300 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Your subscription renews in {subscription.daysUntilRenewal} days on{' '}
              {new Date(subscription.nextBillingDate).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        {/* Scheduled Downgrade Notice */}
        {subscription.scheduledDowngrade && (
          <Alert className="mb-4 border-blue-300 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Your plan will change to <strong>{subscription.scheduledDowngrade.tierName}</strong> on{' '}
              {new Date(subscription.scheduledDowngrade.effectiveDate).toLocaleDateString()}.
              You'll receive a £{subscription.scheduledDowngrade.creditAmount.toFixed(2)} credit.
            </AlertDescription>
          </Alert>
        )}

        {/* Cancellation Notice */}
        {subscription.cancellation && (
          <Alert className="mb-4 border-red-300 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Your subscription will end on{' '}
              {new Date(subscription.cancellation.effectiveDate).toLocaleDateString()}.
              You'll retain access until then.
            </AlertDescription>
          </Alert>
        )}

        {/* Sessions Usage */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span>Worksheets Downloaded This Month</span>
            <span className="text-sm text-gray-600">
              {subscription.sessionsUsed} / {subscription.sessions === 999 ? 'Unlimited' : subscription.sessions}
            </span>
          </div>
          {subscription.sessions !== 999 && (
            <>
              <Progress value={sessionsPercentage} className="h-2" />
              <p className="text-sm text-gray-600 mt-1">
                {sessionsRemaining} worksheets remaining this month
              </p>
            </>
          )}
          {subscription.sessions === 999 && (
            <p className="text-sm text-gray-600 mt-1">
              ✓ Unlimited worksheet downloads
            </p>
          )}
        </div>

        {/* Billing Details */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Next Billing Date</span>
            </div>
            <span className="text-sm">
              {new Date(subscription.nextBillingDate).toLocaleDateString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Auto-Renew</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleAutoRenew(!subscription.autoRenew)}
              disabled={subscription.status === 'cancelling'}
            >
              {subscription.autoRenew ? (
                <CheckCircle2 className="w-4 h-4 text-[#5d9827] mr-1" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400 mr-1" />
              )}
              {subscription.autoRenew ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          {subscription.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              Cancel Subscription
            </Button>
          )}
          
          {subscription.status === 'cancelling' && (
            <Button
              onClick={onReactivate}
              className="flex-1 bg-[#5d9827] hover:bg-[#4a7a1f]"
            >
              Reactivate Subscription
            </Button>
          )}
        </div>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              We're sorry to see you go. Your subscription will remain active until{' '}
              {new Date(subscription.nextBillingDate).toLocaleDateString()}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Why are you cancelling? *</Label>
              <RadioGroup value={cancelReason} onValueChange={setCancelReason} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too_expensive" id="too_expensive" />
                  <Label htmlFor="too_expensive" className="cursor-pointer">
                    Too expensive
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_using" id="not_using" />
                  <Label htmlFor="not_using" className="cursor-pointer">
                    Not using it enough
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="found_alternative" id="found_alternative" />
                  <Label htmlFor="found_alternative" className="cursor-pointer">
                    Found an alternative
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="missing_features" id="missing_features" />
                  <Label htmlFor="missing_features" className="cursor-pointer">
                    Missing features I need
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer">
                    Other
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="feedback">Additional Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Help us improve by sharing more details..."
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button
              onClick={handleCancelConfirm}
              disabled={!cancelReason}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}