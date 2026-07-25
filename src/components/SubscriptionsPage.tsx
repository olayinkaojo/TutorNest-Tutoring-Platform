import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SubscriptionTiers } from './SubscriptionTiers';
import { CurrentSubscription } from './CurrentSubscription';
import { ChangeTierDialog } from './ChangeTierDialog';
import { SubscriptionHistory } from './SubscriptionHistory';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';
import { CreditCard, History, ArrowLeft } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SubscriptionsPageProps {
  parentId: string;
  accessToken: string;
  onBack?: () => void;
}

export function SubscriptionsPage({ parentId, accessToken, onBack }: SubscriptionsPageProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  
  // Change tier dialog state
  const [showChangeTierDialog, setShowChangeTierDialog] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [proRataCalculation, setProRataCalculation] = useState<any>(null);

  const tierPrices: Record<string, { name: string; price: number }> = {
    basic: { name: 'Starter', price: 9.99 },
    standard: { name: 'Plus', price: 19.99 },
    premium: { name: 'Premium', price: 29.99 }
  };

  useEffect(() => {
    fetchSubscription();
  }, [parentId]);

  const fetchSubscription = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/${parentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setSubscription(data.subscription);
      } else {
        console.error('Failed to fetch subscription:', data.error);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTier = async (tierId: string) => {
    if (!subscription) {
      // New subscription
      await handleNewSubscription(tierId);
      return;
    }

    if (subscription.tierId === tierId) {
      return; // Already on this tier
    }

    setSelectedTierId(tierId);

    const currentTier = tierPrices[subscription.tierId];
    const newTier = tierPrices[tierId];

    // Check if upgrade or downgrade
    const isUpgrade = newTier.price > currentTier.price;

    if (isUpgrade) {
      // For upgrades, show pro-rata calculation immediately
      // In a real app, you'd fetch this from the backend
      const now = new Date();
      const nextBilling = new Date(subscription.nextBillingDate);
      const daysRemaining = Math.ceil((nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = 30; // Approximate

      const currentDailyRate = currentTier.price / totalDays;
      const newDailyRate = newTier.price / totalDays;
      const unusedCredit = currentDailyRate * daysRemaining;
      const newCharge = newDailyRate * daysRemaining;
      const proRataCharge = Math.max(0, newCharge - unusedCredit);

      setProRataCalculation({
        unusedCredit: Math.round(unusedCredit * 100) / 100,
        newCharge: Math.round(newCharge * 100) / 100,
        proRataCharge: Math.round(proRataCharge * 100) / 100,
        daysRemaining
      });
    } else {
      // For downgrades, show credit info
      setProRataCalculation(null);
    }

    setShowChangeTierDialog(true);
  };

  const handleNewSubscription = async (tierId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/subscribe`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentId,
            tierId,
            paymentMethodId: 'pm_demo_' + Date.now() // Demo payment method
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Subscription activated successfully!');
        setSubscription(data.subscription);
        setActiveTab('current');
      } else {
        toast.error(data.error || 'Failed to activate subscription');
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Failed to activate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmTierChange = async () => {
    if (!selectedTierId || !subscription) return;

    const currentTier = tierPrices[subscription.tierId];
    const newTier = tierPrices[selectedTierId];
    const isUpgrade = newTier.price > currentTier.price;

    setActionLoading(true);
    try {
      const endpoint = isUpgrade ? 'upgrade' : 'downgrade';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentId,
            newTierId: selectedTierId
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        if (isUpgrade) {
          toast.success('Subscription upgraded successfully!');
        } else {
          toast.success(data.message || 'Downgrade scheduled successfully!');
        }
        setSubscription(data.subscription);
        setShowChangeTierDialog(false);
        setSelectedTierId(null);
        setProRataCalculation(null);
        setActiveTab('current');
      } else {
        toast.error(data.error || 'Failed to change subscription');
      }
    } catch (error) {
      console.error('Error changing subscription:', error);
      toast.error('Failed to change subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async (reason: string, feedback: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentId,
            reason,
            feedback
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Subscription cancelled');
        setSubscription(data.subscription);
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/reactivate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ parentId })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Subscription reactivated!');
        setSubscription(data.subscription);
      } else {
        toast.error(data.error || 'Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error('Failed to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAutoRenew = async (autoRenew: boolean) => {
    setActionLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/subscription/auto-renew`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentId,
            autoRenew
          })
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Auto-renew updated');
        setSubscription(data.subscription);
      } else {
        toast.error(data.error || 'Failed to update auto-renew');
      }
    } catch (error) {
      console.error('Error updating auto-renew:', error);
      toast.error('Failed to update auto-renew');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#625d9c]" />
        </div>
      </div>
    );
  }

  const currentTier = subscription ? tierPrices[subscription.tierId] : null;
  const selectedTier = selectedTierId ? tierPrices[selectedTierId] : null;

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Current Plan
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-2">
            <CreditCard className="w-4 h-4" />
            All Plans
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="mt-6">
          <CurrentSubscription
            subscription={subscription}
            onManageSubscription={() => setActiveTab('plans')}
            onReactivate={handleReactivateSubscription}
            onCancel={handleCancelSubscription}
            onToggleAutoRenew={handleToggleAutoRenew}
          />
        </TabsContent>

        <TabsContent value="plans" className="mt-6">
          <div className="mb-6">
            <h2 className="mb-2">Choose Your Plan</h2>
            <p className="text-gray-600">
              Subscriptions cover books, worksheets, curriculum resources, and platform access.
            </p>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Live tutoring sessions are billed separately at ₦15,000 per session.
                Subscriptions give you access to our library of educational resources, not tutoring sessions.
              </p>
            </div>
          </div>
          
          <SubscriptionTiers
            onSelectTier={handleSelectTier}
            currentTierId={subscription?.tierId}
            isLoading={actionLoading}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <SubscriptionHistory parentId={parentId} accessToken={accessToken} />
        </TabsContent>
      </Tabs>

      {/* Change Tier Dialog */}
      {selectedTier && currentTier && (
        <ChangeTierDialog
          open={showChangeTierDialog}
          onOpenChange={setShowChangeTierDialog}
          currentTierName={currentTier.name}
          currentTierPrice={currentTier.price}
          newTierName={selectedTier.name}
          newTierPrice={selectedTier.price}
          isUpgrade={selectedTier.price > currentTier.price}
          proRataCalculation={proRataCalculation}
          creditAmount={
            selectedTier.price < currentTier.price
              ? currentTier.price - selectedTier.price
              : undefined
          }
          effectiveDate={subscription?.nextBillingDate}
          onConfirm={handleConfirmTierChange}
          isLoading={actionLoading}
        />
      )}
    </div>
  );
}