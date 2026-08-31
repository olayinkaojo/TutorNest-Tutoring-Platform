import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { requireSelfOrAdmin } from './route-auth.tsx';

const app = new Hono();

// Subscription tier definitions
// NOTE: Live tutoring sessions are now paid directly (not included in subscriptions)
// Subscriptions provide access to books, resources, content library, and platform features
const SUBSCRIPTION_TIERS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 19.99,
    currency: 'GBP',
    billingCycle: 'monthly',
    maxChildren: 1,
    booksIncluded: 10, // Number of books accessible
    benefits: [
      '1 child profile',
      'Access to 10 educational books',
      'Basic progress tracking',
      'Email support',
      'Standard tutor matching',
      'Session recordings (7 days retention)',
      'Access to content library',
      'Pay-as-you-go for live tutoring sessions'
    ],
    color: '#625d9c'
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 39.99,
    currency: 'GBP',
    billingCycle: 'monthly',
    maxChildren: 2,
    booksIncluded: 50, // More books accessible
    benefits: [
      'Up to 2 child profiles',
      'Access to 50+ educational books',
      'Advanced progress tracking with analytics',
      'Priority email & chat support',
      'Priority tutor matching',
      'Session recordings (30 days retention)',
      'Full content library access',
      'Personalized learning plans',
      'Homework assignment tracking',
      '10% discount on live tutoring sessions'
    ],
    popular: true,
    color: '#5d9827'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79.99,
    currency: 'GBP',
    billingCycle: 'monthly',
    maxChildren: 4,
    booksIncluded: 999, // Unlimited books
    benefits: [
      'Up to 4 child profiles',
      'Unlimited access to all educational books',
      'Full analytics dashboard',
      '24/7 priority support',
      'Dedicated tutor matching specialist',
      'Unlimited session recordings',
      'Advanced personalized learning plans',
      'Homework & assignment tracking',
      'Quarterly progress reviews',
      'Early access to new features',
      '20% discount on live tutoring sessions',
      'Free monthly webinar access'
    ],
    color: '#625d9c'
  }
];

// Get all subscription tiers
app.get('/subscription-tiers', async (c) => {
  console.log('=== /subscription-tiers endpoint called ===');
  console.log('SUBSCRIPTION_TIERS length:', SUBSCRIPTION_TIERS.length);
  
  try {
    // Map backend tier structure to frontend expected structure
    const frontendTiers = SUBSCRIPTION_TIERS.map(tier => ({
      id: tier.id,
      name: tier.name,
      price: tier.price,
      currency: tier.currency,
      billingCycle: tier.billingCycle,
      maxChildren: tier.maxChildren,
      sessionsPerChild: tier.sessionsPerChild,
      sessions: tier.sessionsPerChild, // For display compatibility
      benefits: tier.benefits,
      popular: tier.popular || false,
      color: tier.color
    }));

    console.log('Returning tiers:', frontendTiers.length, 'tiers');
    console.log('First tier:', frontendTiers[0]);

    return c.json({
      success: true,
      tiers: frontendTiers
    });
  } catch (error) {
    console.error('Error fetching subscription tiers:', error);
    return c.json({ success: false, error: 'Failed to fetch subscription tiers' }, 500);
  }
});

// Get current subscription for a parent
app.get('/subscription/:parentId', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('parentId'));
    if (auth instanceof Response) return auth;
    const parentId = c.req.param('parentId');
    
    const subscription = await kv.get(`subscription_parent_${parentId}`);
    
    if (!subscription) {
      return c.json({
        success: true,
        subscription: null
      });
    }

    // Check if subscription needs renewal reminder
    const daysUntilRenewal = Math.floor(
      (new Date(subscription.nextBillingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return c.json({
      success: true,
      subscription: {
        ...subscription,
        daysUntilRenewal,
        needsRenewalReminder: daysUntilRenewal <= 7 && daysUntilRenewal > 0
      }
    });
  } catch (error) {
    console.error(`Error fetching subscription for parent ${c.req.param('parentId')}:`, error);
    return c.json({ success: false, error: 'Failed to fetch subscription' }, 500);
  }
});

// Subscribe to a tier (new subscription)
// Disabled pending real payment integration: this used to activate a paid
// tier off a client-supplied `paymentMethodId` (a hardcoded 'pm_demo_...'
// string — nothing was ever actually charged or verified). The UI path that
// reached this is already unreachable (ParentContentLibrary, its only
// renderer, isn't mounted anywhere), but the route itself was still directly
// callable by anyone with a valid token, handing out paid entitlements for
// free. Re-enable by restoring the body below once this charges via
// Flutterwave and verifies the charge server-side before activating, the
// same way session bookings do.
app.post('/subscription/subscribe', async (c) => {
  return c.json(
    { success: false, error: 'Subscriptions are not available yet.' },
    503,
  );
});

/* Previous implementation, kept for when real payment is wired in:

app.post('/subscription/subscribe', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.parentId);
    if (auth instanceof Response) return auth;
    const { parentId, tierId, paymentMethodId } = await c.req.json();

    if (!parentId || !tierId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId);
    if (!tier) {
      return c.json({ success: false, error: 'Invalid tier ID' }, 400);
    }

    // Check if already has active subscription
    const existingSubscription = await kv.get(`subscription_parent_${parentId}`);
    if (existingSubscription && existingSubscription.status === 'active') {
      return c.json({ success: false, error: 'Already has an active subscription' }, 400);
    }

    const now = new Date();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      parentId,
      tierId: tier.id,
      tierName: tier.name,
      price: tier.price,
      currency: tier.currency,
      billingCycle: tier.billingCycle,
      maxChildren: tier.maxChildren,
      sessionsPerChild: tier.sessionsPerChild,
      sessionsUsed: 0,
      status: 'active',
      startDate: now.toISOString(),
      nextBillingDate: nextBillingDate.toISOString(),
      paymentMethodId,
      autoRenew: true,
      createdAt: now.toISOString()
    };

    await kv.set(`subscription_parent_${parentId}`, subscription);

    // Add to subscription history
    const historyKey = `subscription_history_${parentId}`;
    const history = await kv.get(historyKey) || [];
    history.unshift({
      type: 'subscription',
      tierId: tier.id,
      tierName: tier.name,
      price: tier.price,
      date: now.toISOString()
    });
    await kv.set(historyKey, history);

    return c.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    return c.json({ success: false, error: 'Failed to create subscription' }, 500);
  }
});

*/

// Calculate pro-rata charge for upgrade
function calculateProRataCharge(currentTier: any, newTier: any, daysRemaining: number, totalDaysInCycle: number) {
  const currentDailyRate = currentTier.price / totalDaysInCycle;
  const newDailyRate = newTier.price / totalDaysInCycle;
  const unusedCredit = currentDailyRate * daysRemaining;
  const newCharge = newDailyRate * daysRemaining;
  const proRataCharge = newCharge - unusedCredit;
  
  return {
    unusedCredit: Math.round(unusedCredit * 100) / 100,
    newCharge: Math.round(newCharge * 100) / 100,
    proRataCharge: Math.max(0, Math.round(proRataCharge * 100) / 100),
    daysRemaining,
    totalDaysInCycle
  };
}

// Upgrade subscription (with pro-rata billing)
app.post('/subscription/upgrade', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.parentId);
    if (auth instanceof Response) return auth;
    const { parentId, newTierId } = await c.req.json();

    if (!parentId || !newTierId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const currentSubscription = await kv.get(`subscription_parent_${parentId}`);
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return c.json({ success: false, error: 'No active subscription found' }, 400);
    }

    const newTier = SUBSCRIPTION_TIERS.find(t => t.id === newTierId);
    if (!newTier) {
      return c.json({ success: false, error: 'Invalid tier ID' }, 400);
    }

    const currentTier = SUBSCRIPTION_TIERS.find(t => t.id === currentSubscription.tierId);
    if (!currentTier) {
      return c.json({ success: false, error: 'Current tier not found' }, 400);
    }

    // Check if it's actually an upgrade
    if (newTier.price <= currentTier.price) {
      return c.json({ success: false, error: 'New tier must be higher than current tier for upgrade' }, 400);
    }

    // Calculate pro-rata charges
    const now = new Date();
    const nextBillingDate = new Date(currentSubscription.nextBillingDate);
    const startDate = new Date(currentSubscription.startDate);
    const daysRemaining = Math.ceil((nextBillingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const totalDaysInCycle = Math.ceil((nextBillingDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const proRataCalculation = calculateProRataCharge(currentTier, newTier, daysRemaining, totalDaysInCycle);

    // Update subscription
    const updatedSubscription = {
      ...currentSubscription,
      tierId: newTier.id,
      tierName: newTier.name,
      price: newTier.price,
      maxChildren: newTier.maxChildren,
      sessionsPerChild: newTier.sessionsPerChild,
      // Adjust sessions used proportionally
      sessionsUsed: Math.floor((currentSubscription.sessionsUsed / currentTier.sessionsPerChild) * newTier.sessionsPerChild),
      updatedAt: now.toISOString()
    };

    await kv.set(`subscription_parent_${parentId}`, updatedSubscription);

    // Add to subscription history
    const historyKey = `subscription_history_${parentId}`;
    const history = await kv.get(historyKey) || [];
    history.unshift({
      type: 'upgrade',
      fromTierId: currentTier.id,
      fromTierName: currentTier.name,
      toTierId: newTier.id,
      toTierName: newTier.name,
      proRataCharge: proRataCalculation.proRataCharge,
      date: now.toISOString()
    });
    await kv.set(historyKey, history);

    return c.json({
      success: true,
      subscription: updatedSubscription,
      proRataCalculation
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return c.json({ success: false, error: 'Failed to upgrade subscription' }, 500);
  }
});

// Downgrade subscription (credit for next cycle)
app.post('/subscription/downgrade', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.parentId);
    if (auth instanceof Response) return auth;
    const { parentId, newTierId } = await c.req.json();

    if (!parentId || !newTierId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const currentSubscription = await kv.get(`subscription_parent_${parentId}`);
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return c.json({ success: false, error: 'No active subscription found' }, 400);
    }

    const newTier = SUBSCRIPTION_TIERS.find(t => t.id === newTierId);
    if (!newTier) {
      return c.json({ success: false, error: 'Invalid tier ID' }, 400);
    }

    const currentTier = SUBSCRIPTION_TIERS.find(t => t.id === currentSubscription.tierId);
    if (!currentTier) {
      return c.json({ success: false, error: 'Current tier not found' }, 400);
    }

    // Check if it's actually a downgrade
    if (newTier.price >= currentTier.price) {
      return c.json({ success: false, error: 'New tier must be lower than current tier for downgrade' }, 400);
    }

    const now = new Date();
    const nextBillingDate = new Date(currentSubscription.nextBillingDate);

    // Calculate credit for next cycle
    const priceDifference = currentTier.price - newTier.price;

    // Schedule downgrade for next billing cycle
    const updatedSubscription = {
      ...currentSubscription,
      scheduledDowngrade: {
        tierId: newTier.id,
        tierName: newTier.name,
        newPrice: newTier.price,
        creditAmount: priceDifference,
        effectiveDate: nextBillingDate.toISOString()
      },
      updatedAt: now.toISOString()
    };

    await kv.set(`subscription_parent_${parentId}`, updatedSubscription);

    // Add to subscription history
    const historyKey = `subscription_history_${parentId}`;
    const history = await kv.get(historyKey) || [];
    history.unshift({
      type: 'downgrade_scheduled',
      fromTierId: currentTier.id,
      fromTierName: currentTier.name,
      toTierId: newTier.id,
      toTierName: newTier.name,
      creditAmount: priceDifference,
      effectiveDate: nextBillingDate.toISOString(),
      date: now.toISOString()
    });
    await kv.set(historyKey, history);

    return c.json({
      success: true,
      subscription: updatedSubscription,
      message: `Downgrade scheduled for ${nextBillingDate.toLocaleDateString()}. You'll receive a £${priceDifference.toFixed(2)} credit on your next billing cycle.`
    });
  } catch (error) {
    console.error('Error scheduling downgrade:', error);
    return c.json({ success: false, error: 'Failed to schedule downgrade' }, 500);
  }
});

// Cancel subscription
app.post('/subscription/cancel', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.parentId);
    if (auth instanceof Response) return auth;
    const { parentId, reason, feedback } = await c.req.json();

    if (!parentId) {
      return c.json({ success: false, error: 'Missing parent ID' }, 400);
    }

    const currentSubscription = await kv.get(`subscription_parent_${parentId}`);
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return c.json({ success: false, error: 'No active subscription found' }, 400);
    }

    const now = new Date();
    const nextBillingDate = new Date(currentSubscription.nextBillingDate);

    // Schedule cancellation for end of billing period
    const updatedSubscription = {
      ...currentSubscription,
      status: 'cancelling',
      autoRenew: false,
      cancellation: {
        reason,
        feedback,
        requestedAt: now.toISOString(),
        effectiveDate: nextBillingDate.toISOString()
      },
      updatedAt: now.toISOString()
    };

    await kv.set(`subscription_parent_${parentId}`, updatedSubscription);

    // Add to subscription history
    const historyKey = `subscription_history_${parentId}`;
    const history = await kv.get(historyKey) || [];
    history.unshift({
      type: 'cancellation_scheduled',
      tierId: currentSubscription.tierId,
      tierName: currentSubscription.tierName,
      reason,
      effectiveDate: nextBillingDate.toISOString(),
      date: now.toISOString()
    });
    await kv.set(historyKey, history);

    return c.json({
      success: true,
      subscription: updatedSubscription,
      message: `Subscription will be cancelled on ${nextBillingDate.toLocaleDateString()}. You'll retain access until then.`
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return c.json({ success: false, error: 'Failed to cancel subscription' }, 500);
  }
});

// Get subscription history
app.get('/subscription/:parentId/history', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('parentId'));
    if (auth instanceof Response) return auth;
    const parentId = c.req.param('parentId');
    
    const history = await kv.get(`subscription_history_${parentId}`) || [];

    return c.json({
      success: true,
      history
    });
  } catch (error) {
    console.error(`Error fetching subscription history for parent ${c.req.param('parentId')}:`, error);
    return c.json({ success: false, error: 'Failed to fetch subscription history' }, 500);
  }
});

// Reactivate/renew subscription
app.post('/subscription/reactivate', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.parentId);
    if (auth instanceof Response) return auth;
    const { parentId } = await c.req.json();

    if (!parentId) {
      return c.json({ success: false, error: 'Missing parent ID' }, 400);
    }

    const currentSubscription = await kv.get(`subscription_parent_${parentId}`);
    if (!currentSubscription) {
      return c.json({ success: false, error: 'No subscription found' }, 400);
    }

    if (currentSubscription.status !== 'cancelling') {
      return c.json({ success: false, error: 'Subscription is not scheduled for cancellation' }, 400);
    }

    const now = new Date();

    // Reactivate subscription
    const updatedSubscription = {
      ...currentSubscription,
      status: 'active',
      autoRenew: true,
      cancellation: undefined,
      updatedAt: now.toISOString()
    };

    await kv.set(`subscription_parent_${parentId}`, updatedSubscription);

    // Add to subscription history
    const historyKey = `subscription_history_${parentId}`;
    const history = await kv.get(historyKey) || [];
    history.unshift({
      type: 'reactivated',
      tierId: currentSubscription.tierId,
      tierName: currentSubscription.tierName,
      date: now.toISOString()
    });
    await kv.set(historyKey, history);

    return c.json({
      success: true,
      subscription: updatedSubscription,
      message: 'Subscription reactivated successfully!'
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return c.json({ success: false, error: 'Failed to reactivate subscription' }, 500);
  }
});

// Update auto-renew setting
app.post('/subscription/auto-renew', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.parentId);
    if (auth instanceof Response) return auth;
    const { parentId, autoRenew } = await c.req.json();

    if (!parentId || typeof autoRenew !== 'boolean') {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const currentSubscription = await kv.get(`subscription_parent_${parentId}`);
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return c.json({ success: false, error: 'No active subscription found' }, 400);
    }

    const now = new Date();

    const updatedSubscription = {
      ...currentSubscription,
      autoRenew,
      updatedAt: now.toISOString()
    };

    await kv.set(`subscription_parent_${parentId}`, updatedSubscription);

    return c.json({
      success: true,
      subscription: updatedSubscription,
      message: `Auto-renew ${autoRenew ? 'enabled' : 'disabled'} successfully!`
    });
  } catch (error) {
    console.error('Error updating auto-renew:', error);
    return c.json({ success: false, error: 'Failed to update auto-renew setting' }, 500);
  }
});

// Check if parent can add more children based on subscription tier
app.get('/subscription/:parentId/can-add-child', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('parentId'));
    if (auth instanceof Response) return auth;
    const parentId = c.req.param('parentId');
    
    const subscription = await kv.get(`subscription_parent_${parentId}`);
    
    if (!subscription || subscription.status !== 'active') {
      return c.json({
        success: false,
        canAdd: false,
        reason: 'No active subscription. Please subscribe to add children.',
        requiresUpgrade: true
      });
    }

    // Get current number of children
    const children = await kv.get(`parent_children_${parentId}`) || [];
    const currentChildCount = children.length;

    const tier = SUBSCRIPTION_TIERS.find(t => t.id === subscription.tierId);
    if (!tier) {
      return c.json({ success: false, error: 'Subscription tier not found' }, 500);
    }

    const canAdd = currentChildCount < tier.maxChildren;

    return c.json({
      success: true,
      canAdd,
      currentChildren: currentChildCount,
      maxChildren: tier.maxChildren,
      tierName: tier.name,
      reason: canAdd 
        ? `You can add ${tier.maxChildren - currentChildCount} more child(ren)`
        : `Your ${tier.name} plan supports up to ${tier.maxChildren} child${tier.maxChildren > 1 ? 'ren' : ''}. Upgrade to add more.`,
      requiresUpgrade: !canAdd,
      availableTiers: canAdd ? [] : SUBSCRIPTION_TIERS.filter(t => t.maxChildren > tier.maxChildren)
    });
  } catch (error) {
    console.error(`Error checking child limit for parent ${c.req.param('parentId')}:`, error);
    return c.json({ success: false, error: 'Failed to check child limit' }, 500);
  }
});

export default app;