import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import { requireAdmin, requireSelfOrAdmin, verifyUser } from './route-auth.tsx';
import { logAuditEvent } from './activity-log.tsx';

const app = new Hono();

// Type definitions
interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed'; // % off or £ off
  value: number;
  description: string;
  expiryDate: string;
  usageLimit: number; // Maximum total uses
  usageCount: number; // Current usage count
  eligibleTiers: string[]; // ['starter', 'plus', 'premium'] or ['all']
  isActive: boolean;
  createdAt: string;
  createdBy: string; // Admin/marketing user ID
}

interface CouponUsage {
  couponId: string;
  couponCode: string;
  userId: string;
  usedAt: string;
  discountAmount: number;
  tierId: string;
}

interface ReferralCredit {
  id: string;
  inviterId: string; // User who sent referral
  inviterEmail: string;
  inviteeId?: string; // User who signed up
  inviteeEmail: string;
  status: 'pending' | 'completed' | 'expired';
  creditAmount: number;
  appliedAt?: string;
  expiryDate: string;
  createdAt: string;
}

interface UserCredit {
  userId: string;
  totalCredits: number;
  availableCredits: number;
  usedCredits: number;
  history: CreditTransaction[];
}

interface CreditTransaction {
  id: string;
  type: 'earned' | 'applied' | 'expired';
  amount: number;
  source: string; // 'referral', 'promotion', 'compensation', etc.
  description: string;
  date: string;
  referralId?: string;
}

// Abuse protection: Track coupon attempts by IP/email
interface AbuseTracker {
  identifier: string; // IP or email
  attempts: number;
  lastAttempt: string;
  blockedUntil?: string;
}

const REFERRAL_CREDIT_AMOUNT = 25.00; // £25 credit for both inviter and invitee
const REFERRAL_EXPIRY_DAYS = 90; // 90 days to complete signup
const MAX_COUPON_ATTEMPTS = 5; // Max attempts per hour
const RATE_LIMIT_DURATION = 60 * 60 * 1000; // 1 hour in ms

// ========== COUPON MANAGEMENT (ADMIN) ==========

// Create a new coupon (admin only)
app.post('/coupons/create', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { 
      code, 
      type, 
      value, 
      description, 
      expiryDate, 
      usageLimit, 
      eligibleTiers,
      createdBy 
    } = await c.req.json();

    // Validation
    if (!code || !type || !value || !expiryDate || !usageLimit || !eligibleTiers || !createdBy) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    if (type !== 'percentage' && type !== 'fixed') {
      return c.json({ success: false, error: 'Type must be "percentage" or "fixed"' }, 400);
    }

    if (type === 'percentage' && (value <= 0 || value > 100)) {
      return c.json({ success: false, error: 'Percentage must be between 0 and 100' }, 400);
    }

    if (type === 'fixed' && value <= 0) {
      return c.json({ success: false, error: 'Fixed amount must be greater than 0' }, 400);
    }

    // Check if code already exists
    const normalizedCode = code.toUpperCase().trim();
    const existingCoupon = await kv.get(`coupon_code_${normalizedCode}`);
    if (existingCoupon) {
      return c.json({ success: false, error: 'Coupon code already exists' }, 400);
    }

    const coupon: Coupon = {
      id: `cpn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: normalizedCode,
      type,
      value,
      description: description || '',
      expiryDate,
      usageLimit,
      usageCount: 0,
      eligibleTiers: eligibleTiers.includes('all') ? ['all'] : eligibleTiers,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy
    };

    await kv.set(`coupon_${coupon.id}`, coupon);
    await kv.set(`coupon_code_${normalizedCode}`, coupon);

    // Add to admin's created coupons list
    const adminCouponsKey = `admin_coupons_${createdBy}`;
    const adminCoupons = await kv.get(adminCouponsKey) || [];
    adminCoupons.unshift(coupon.id);
    await kv.set(adminCouponsKey, adminCoupons);

    console.log(`Coupon created: ${coupon.code} by admin ${createdBy}`);

    await logAuditEvent({
      userId: auth as string,
      action: 'coupon_created',
      category: 'coupons',
      description: `Coupon created: ${coupon.code} (${type === 'percentage' ? `${value}%` : `₦${value}`} off)`,
      metadata: { couponId: coupon.id, code: coupon.code, type, value, usageLimit },
    });

    return c.json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    return c.json({ success: false, error: 'Failed to create coupon' }, 500);
  }
});

// Get all coupons (admin only)
app.get('/coupons/all', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    // kv.getByPrefix() already returns unwrapped values, not {key, value}
    // pairs (that's Deno-native-KV convention, not this shim's) — mapping
    // .value off each item silently produced an array of undefined.
    const coupons = await kv.getByPrefix('coupon_cpn_');

    return c.json({
      success: true,
      coupons
    });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return c.json({ success: false, error: 'Failed to fetch coupons' }, 500);
  }
});

// Update coupon (admin only)
app.put('/coupons/:couponId', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const couponId = c.req.param('couponId');
    const updates = await c.req.json();

    const coupon = await kv.get(`coupon_${couponId}`);
    if (!coupon) {
      return c.json({ success: false, error: 'Coupon not found' }, 404);
    }

    const updatedCoupon = {
      ...coupon,
      ...updates,
      id: coupon.id, // Prevent ID change
      code: coupon.code, // Prevent code change
      usageCount: coupon.usageCount, // Prevent manual usage count change
      updatedAt: new Date().toISOString()
    };

    await kv.set(`coupon_${couponId}`, updatedCoupon);
    await kv.set(`coupon_code_${coupon.code}`, updatedCoupon);

    await logAuditEvent({
      userId: auth as string,
      action: 'coupon_updated',
      category: 'coupons',
      description: `Coupon ${coupon.code} updated`,
      metadata: { couponId, code: coupon.code, updates },
    });

    return c.json({
      success: true,
      coupon: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    return c.json({ success: false, error: 'Failed to update coupon' }, 500);
  }
});

// Deactivate coupon (admin only)
app.post('/coupons/:couponId/deactivate', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const couponId = c.req.param('couponId');

    const coupon = await kv.get(`coupon_${couponId}`);
    if (!coupon) {
      return c.json({ success: false, error: 'Coupon not found' }, 404);
    }

    coupon.isActive = false;
    coupon.updatedAt = new Date().toISOString();

    await kv.set(`coupon_${couponId}`, coupon);
    await kv.set(`coupon_code_${coupon.code}`, coupon);

    await logAuditEvent({
      userId: auth as string,
      action: 'coupon_deactivated',
      category: 'coupons',
      description: `Coupon ${coupon.code} deactivated`,
      metadata: { couponId, code: coupon.code },
    });

    return c.json({
      success: true,
      coupon
    });
  } catch (error) {
    console.error('Error deactivating coupon:', error);
    return c.json({ success: false, error: 'Failed to deactivate coupon' }, 500);
  }
});

// ========== COUPON VALIDATION & APPLICATION ==========

// Check if user/IP is rate limited
async function checkRateLimit(identifier: string): Promise<{ allowed: boolean; message?: string }> {
  const trackerKey = `abuse_tracker_${identifier}`;
  const tracker: AbuseTracker | null = await kv.get(trackerKey);
  const now = new Date();

  if (!tracker) {
    // First attempt
    await kv.set(trackerKey, {
      identifier,
      attempts: 1,
      lastAttempt: now.toISOString()
    });
    return { allowed: true };
  }

  // Check if blocked
  if (tracker.blockedUntil && new Date(tracker.blockedUntil) > now) {
    const minutesRemaining = Math.ceil((new Date(tracker.blockedUntil).getTime() - now.getTime()) / 60000);
    return { 
      allowed: false, 
      message: `Too many attempts. Please try again in ${minutesRemaining} minutes.` 
    };
  }

  // Reset if last attempt was more than rate limit duration ago
  const lastAttemptTime = new Date(tracker.lastAttempt).getTime();
  if (now.getTime() - lastAttemptTime > RATE_LIMIT_DURATION) {
    await kv.set(trackerKey, {
      identifier,
      attempts: 1,
      lastAttempt: now.toISOString()
    });
    return { allowed: true };
  }

  // Check if exceeded max attempts
  if (tracker.attempts >= MAX_COUPON_ATTEMPTS) {
    const blockedUntil = new Date(now.getTime() + RATE_LIMIT_DURATION);
    await kv.set(trackerKey, {
      ...tracker,
      blockedUntil: blockedUntil.toISOString()
    });
    return { 
      allowed: false, 
      message: `Too many coupon attempts. Please try again in 60 minutes.` 
    };
  }

  // Increment attempts
  await kv.set(trackerKey, {
    ...tracker,
    attempts: tracker.attempts + 1,
    lastAttempt: now.toISOString()
  });

  return { allowed: true };
}

// Validate coupon code
app.post('/coupons/validate', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const { code, tierId, userId, userEmail, userIp } = await c.req.json();

    if (!code || !tierId || !userId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Rate limiting by email and IP
    const emailCheck = await checkRateLimit(`email_${userEmail}`);
    if (!emailCheck.allowed) {
      return c.json({ success: false, error: emailCheck.message }, 429);
    }

    if (userIp) {
      const ipCheck = await checkRateLimit(`ip_${userIp}`);
      if (!ipCheck.allowed) {
        return c.json({ success: false, error: ipCheck.message }, 429);
      }
    }

    const normalizedCode = code.toUpperCase().trim();
    const coupon: Coupon | null = await kv.get(`coupon_code_${normalizedCode}`);

    if (!coupon) {
      return c.json({ success: false, error: 'Invalid coupon code' }, 404);
    }

    // Check if active
    if (!coupon.isActive) {
      return c.json({ success: false, error: 'This coupon is no longer active' }, 400);
    }

    // Check expiry
    if (new Date(coupon.expiryDate) < new Date()) {
      return c.json({ success: false, error: 'This coupon has expired' }, 400);
    }

    // Check usage limit
    if (coupon.usageCount >= coupon.usageLimit) {
      return c.json({ success: false, error: 'This coupon has reached its usage limit' }, 400);
    }

    // Check if tier is eligible
    if (!coupon.eligibleTiers.includes('all') && !coupon.eligibleTiers.includes(tierId)) {
      return c.json({ 
        success: false, 
        error: `This coupon is only valid for ${coupon.eligibleTiers.join(', ')} tiers` 
      }, 400);
    }

    // Check if user already used this coupon
    const userUsageKey = `coupon_usage_${userId}_${coupon.id}`;
    const existingUsage = await kv.get(userUsageKey);
    if (existingUsage) {
      return c.json({ success: false, error: 'You have already used this coupon' }, 400);
    }

    return c.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    return c.json({ success: false, error: 'Failed to validate coupon' }, 500);
  }
});

// Apply coupon to subscription
app.post('/coupons/apply', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.userId);
    if (auth instanceof Response) return auth;
    const { code, tierId, tierPrice, userId, userEmail } = await c.req.json();

    if (!code || !tierId || !tierPrice || !userId || !userEmail) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const normalizedCode = code.toUpperCase().trim();
    const coupon: Coupon | null = await kv.get(`coupon_code_${normalizedCode}`);

    if (!coupon || !coupon.isActive) {
      return c.json({ success: false, error: 'Invalid or inactive coupon' }, 400);
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (tierPrice * coupon.value) / 100;
    } else {
      discountAmount = Math.min(coupon.value, tierPrice);
    }

    const finalPrice = Math.max(0, tierPrice - discountAmount);

    // Record usage
    const usage: CouponUsage = {
      couponId: coupon.id,
      couponCode: coupon.code,
      userId,
      usedAt: new Date().toISOString(),
      discountAmount: Math.round(discountAmount * 100) / 100,
      tierId
    };

    await kv.set(`coupon_usage_${userId}_${coupon.id}`, usage);

    // Increment usage count
    coupon.usageCount += 1;
    await kv.set(`coupon_${coupon.id}`, coupon);
    await kv.set(`coupon_code_${normalizedCode}`, coupon);

    // Add to user's coupon history
    const userCouponHistoryKey = `user_coupon_history_${userId}`;
    const userHistory = await kv.get(userCouponHistoryKey) || [];
    userHistory.unshift(usage);
    await kv.set(userCouponHistoryKey, userHistory);

    console.log(`Coupon ${coupon.code} applied by user ${userId}. Discount: £${discountAmount.toFixed(2)}`);

    await logAuditEvent({
      userId,
      action: 'coupon_applied',
      category: 'coupons',
      description: `Coupon ${coupon.code} applied — discount ₦${discountAmount.toFixed(2)} on ${tierId}`,
      metadata: { couponId: coupon.id, code: coupon.code, discountAmount, tierId, finalPrice },
    });

    return c.json({
      success: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      coupon: {
        code: coupon.code,
        description: coupon.description
      }
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    return c.json({ success: false, error: 'Failed to apply coupon' }, 500);
  }
});

// ========== REFERRAL SYSTEM ==========

// Create referral (when user invites someone)
app.post('/referrals/create', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const { inviterId, inviterEmail, inviteeEmail } = await c.req.json();

    if (!inviterId || !inviterEmail || !inviteeEmail) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    // Check if invitee email already exists as a user
    const existingUser = await kv.get(`user_email_${inviteeEmail.toLowerCase()}`);
    if (existingUser) {
      return c.json({ success: false, error: 'This email is already registered' }, 400);
    }

    // Check if referral already exists for this invitee
    const existingReferral = await kv.get(`referral_invitee_${inviteeEmail.toLowerCase()}`);
    if (existingReferral) {
      return c.json({ success: false, error: 'A referral has already been sent to this email' }, 400);
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + REFERRAL_EXPIRY_DAYS);

    const referral: ReferralCredit = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inviterId,
      inviterEmail,
      inviteeEmail: inviteeEmail.toLowerCase(),
      status: 'pending',
      creditAmount: REFERRAL_CREDIT_AMOUNT,
      expiryDate: expiryDate.toISOString(),
      createdAt: new Date().toISOString()
    };

    await kv.set(`referral_${referral.id}`, referral);
    await kv.set(`referral_invitee_${inviteeEmail.toLowerCase()}`, referral);

    // Add to inviter's referral list
    const inviterReferralsKey = `user_referrals_${inviterId}`;
    const inviterReferrals = await kv.get(inviterReferralsKey) || [];
    inviterReferrals.unshift(referral.id);
    await kv.set(inviterReferralsKey, inviterReferrals);

    console.log(`Referral created: ${inviterEmail} -> ${inviteeEmail}`);

    return c.json({
      success: true,
      referral
    });
  } catch (error) {
    console.error('Error creating referral:', error);
    return c.json({ success: false, error: 'Failed to create referral' }, 500);
  }
});

// Complete referral (when invitee signs up and subscribes)
app.post('/referrals/complete', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { inviteeId, inviteeEmail } = await c.req.json();

    if (!inviteeId || !inviteeEmail) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const referral: ReferralCredit | null = await kv.get(`referral_invitee_${inviteeEmail.toLowerCase()}`);

    if (!referral) {
      return c.json({ success: false, error: 'No referral found for this email' }, 404);
    }

    if (referral.status !== 'pending') {
      return c.json({ success: false, error: 'Referral has already been processed' }, 400);
    }

    // Check if expired
    if (new Date(referral.expiryDate) < new Date()) {
      referral.status = 'expired';
      await kv.set(`referral_${referral.id}`, referral);
      return c.json({ success: false, error: 'Referral has expired' }, 400);
    }

    // Update referral status
    referral.status = 'completed';
    referral.inviteeId = inviteeId;
    referral.appliedAt = new Date().toISOString();
    await kv.set(`referral_${referral.id}`, referral);
    await kv.set(`referral_invitee_${inviteeEmail.toLowerCase()}`, referral);

    // Award credits to both inviter and invitee
    await addCredit(referral.inviterId, REFERRAL_CREDIT_AMOUNT, 'referral', 
      `Referral credit for inviting ${inviteeEmail}`, referral.id);
    
    await addCredit(inviteeId, REFERRAL_CREDIT_AMOUNT, 'referral', 
      `Welcome credit from referral by ${referral.inviterEmail}`, referral.id);

    console.log(`Referral completed: ${referral.inviterEmail} -> ${inviteeEmail}. Credits awarded.`);

    await logAuditEvent({
      userId: inviteeId,
      adminId: auth as string,
      action: 'referral_completed',
      category: 'coupons',
      description: `Referral completed: ${referral.inviterEmail} → ${inviteeEmail}. ₦${REFERRAL_CREDIT_AMOUNT} credited to both.`,
      metadata: { referralId: referral.id, inviterId: referral.inviterId, inviteeId, creditAmount: REFERRAL_CREDIT_AMOUNT },
    });

    return c.json({
      success: true,
      referral,
      creditsAwarded: REFERRAL_CREDIT_AMOUNT
    });
  } catch (error) {
    console.error('Error completing referral:', error);
    return c.json({ success: false, error: 'Failed to complete referral' }, 500);
  }
});

// Get user's referrals
app.get('/referrals/user/:userId', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('userId'));
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');

    const referralIds = await kv.get(`user_referrals_${userId}`) || [];
    const referrals = [];

    for (const refId of referralIds) {
      const ref = await kv.get(`referral_${refId}`);
      if (ref) {
        referrals.push(ref);
      }
    }

    return c.json({
      success: true,
      referrals
    });
  } catch (error) {
    console.error('Error fetching user referrals:', error);
    return c.json({ success: false, error: 'Failed to fetch referrals' }, 500);
  }
});

// ========== CREDITS SYSTEM ==========

// Helper function to add credit to user
async function addCredit(
  userId: string, 
  amount: number, 
  source: string, 
  description: string,
  referralId?: string
): Promise<void> {
  const creditsKey = `user_credits_${userId}`;
  let userCredits: UserCredit = await kv.get(creditsKey) || {
    userId,
    totalCredits: 0,
    availableCredits: 0,
    usedCredits: 0,
    history: []
  };

  const transaction: CreditTransaction = {
    id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'earned',
    amount,
    source,
    description,
    date: new Date().toISOString(),
    referralId
  };

  userCredits.totalCredits += amount;
  userCredits.availableCredits += amount;
  userCredits.history.unshift(transaction);

  await kv.set(creditsKey, userCredits);
}

// Get user's credits
app.get('/credits/:userId', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('userId'));
    if (auth instanceof Response) return auth;
    const userId = c.req.param('userId');

    const userCredits: UserCredit | null = await kv.get(`user_credits_${userId}`);

    if (!userCredits) {
      return c.json({
        success: true,
        credits: {
          userId,
          totalCredits: 0,
          availableCredits: 0,
          usedCredits: 0,
          history: []
        }
      });
    }

    return c.json({
      success: true,
      credits: userCredits
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return c.json({ success: false, error: 'Failed to fetch credits' }, 500);
  }
});

// Apply credits to payment
app.post('/credits/apply', async (c) => {
  try {
    const authBody = await c.req.json();
    const auth = await requireSelfOrAdmin(c, authBody?.userId);
    if (auth instanceof Response) return auth;
    const { userId, amount, description } = await c.req.json();

    if (!userId || !amount) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    const creditsKey = `user_credits_${userId}`;
    const userCredits: UserCredit | null = await kv.get(creditsKey);

    if (!userCredits || userCredits.availableCredits < amount) {
      return c.json({ success: false, error: 'Insufficient credits' }, 400);
    }

    const transaction: CreditTransaction = {
      id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'applied',
      amount,
      source: 'payment',
      description: description || 'Applied to subscription payment',
      date: new Date().toISOString()
    };

    userCredits.availableCredits -= amount;
    userCredits.usedCredits += amount;
    userCredits.history.unshift(transaction);

    await kv.set(creditsKey, userCredits);

    console.log(`Credits applied for user ${userId}: £${amount.toFixed(2)}`);

    await logAuditEvent({
      userId,
      action: 'credit_applied',
      category: 'coupons',
      description: `₦${Number(amount).toFixed(2)} credit applied — ${description || 'subscription payment'}`,
      metadata: { amount, description },
    });

    return c.json({
      success: true,
      credits: userCredits,
      appliedAmount: amount
    });
  } catch (error) {
    console.error('Error applying credits:', error);
    return c.json({ success: false, error: 'Failed to apply credits' }, 500);
  }
});

// Add manual credit (admin only - for compensation, promotions, etc.)
app.post('/credits/add', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { userId, amount, source, description, adminId } = await c.req.json();

    if (!userId || !amount || !source || !description || !adminId) {
      return c.json({ success: false, error: 'Missing required fields' }, 400);
    }

    await addCredit(userId, amount, source, description);

    console.log(`Manual credit added by admin ${adminId} for user ${userId}: £${amount.toFixed(2)}`);

    await logAuditEvent({
      userId,
      adminId,
      action: 'credit_added',
      category: 'coupons',
      description: `₦${Number(amount).toFixed(2)} credit added manually (${source}): ${description}`,
      metadata: { amount, source, description },
    });

    const userCredits = await kv.get(`user_credits_${userId}`);

    return c.json({
      success: true,
      credits: userCredits
    });
  } catch (error) {
    console.error('Error adding manual credit:', error);
    return c.json({ success: false, error: 'Failed to add credit' }, 500);
  }
});

export default app;
