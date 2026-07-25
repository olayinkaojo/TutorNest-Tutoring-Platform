import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowUp, ArrowDown, Info, Loader2 } from 'lucide-react';

interface ChangeTierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTierName: string;
  currentTierPrice: number;
  newTierName: string;
  newTierPrice: number;
  isUpgrade: boolean;
  proRataCalculation?: {
    unusedCredit: number;
    newCharge: number;
    proRataCharge: number;
    daysRemaining: number;
  };
  creditAmount?: number;
  effectiveDate?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ChangeTierDialog({
  open,
  onOpenChange,
  currentTierName,
  currentTierPrice,
  newTierName,
  newTierPrice,
  isUpgrade,
  proRataCalculation,
  creditAmount,
  effectiveDate,
  onConfirm,
  isLoading = false
}: ChangeTierDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <>
                <ArrowUp className="w-5 h-5 text-[#5d9827]" />
                Upgrade Subscription
              </>
            ) : (
              <>
                <ArrowDown className="w-5 h-5 text-orange-600" />
                Downgrade Subscription
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? 'Unlock more books, resources, and features with your upgraded plan.'
              : 'Schedule a downgrade to a lower-tier plan.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current vs New Plan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <p className="font-medium">{currentTierName}</p>
              <p className="text-lg">£{currentTierPrice.toFixed(2)}/month</p>
            </div>
            <div className="p-4 bg-[#625d9c]/10 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">New Plan</p>
              <p className="font-medium">{newTierName}</p>
              <p className="text-lg">£{newTierPrice.toFixed(2)}/month</p>
            </div>
          </div>

          {/* Upgrade - Pro-rata Billing */}
          {isUpgrade && proRataCalculation && (
            <Alert className="border-blue-300 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <p className="mb-2">
                  <strong>Pro-rata Billing:</strong>
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Unused credit from current plan:</span>
                    <span>-£{proRataCalculation.unusedCredit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New plan charge ({proRataCalculation.daysRemaining} days):</span>
                    <span>+£{proRataCalculation.newCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-300 mt-2">
                    <span>
                      <strong>Amount due today:</strong>
                    </span>
                    <span>
                      <strong>£{proRataCalculation.proRataCharge.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs">
                  Your upgrade will be effective immediately. Future billing will be at the new rate of £
                  {newTierPrice.toFixed(2)}/month.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Downgrade - Credit Notice */}
          {!isUpgrade && creditAmount !== undefined && effectiveDate && (
            <Alert className="border-orange-300 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <p className="mb-2">
                  <strong>Downgrade Scheduled:</strong>
                </p>
                <ul className="space-y-1 text-sm">
                  <li>
                    • Your current plan remains active until{' '}
                    {new Date(effectiveDate).toLocaleDateString()}
                  </li>
                  <li>
                    • You'll receive a <strong>£{creditAmount.toFixed(2)} credit</strong> on your next billing
                    cycle
                  </li>
                  <li>
                    • The new plan rate (£{newTierPrice.toFixed(2)}/month) will apply after that
                  </li>
                </ul>
                <p className="mt-2 text-xs">
                  You can continue using your current plan's features until the downgrade takes effect.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Additional Info */}
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              {isUpgrade
                ? '✓ Instant access to more books, worksheets, and curriculum resources'
                : '✓ No immediate changes to your current access'}
            </p>
            <p>
              {isUpgrade
                ? '✓ Pro-rated charge based on days remaining in current billing cycle'
                : '✓ Full access to current plan until scheduled downgrade date'}
            </p>
            <p>✓ You can change your plan again at any time</p>
            <p className="text-xs italic">
              Note: Live tutoring sessions are separate and billed at ₦15,000 per session.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={isUpgrade ? 'bg-[#5d9827] hover:bg-[#4a7a1f]' : 'bg-orange-600 hover:bg-orange-700'}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : isUpgrade ? (
              `Confirm Upgrade`
            ) : (
              `Schedule Downgrade`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}