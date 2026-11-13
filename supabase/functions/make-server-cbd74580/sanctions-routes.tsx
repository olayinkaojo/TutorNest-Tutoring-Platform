import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { requireAdmin, requireSelfOrAdmin, verifyUser } from './route-auth.tsx';
import { createNotification } from './notification-broker.tsx';
import { sendEmail } from './email-service.tsx';

const app = new Hono();

// Every other profile write in this codebase uses `user:${userId}`, not
// `user_${userId}` — this file was the one exception, so a sanction's
// activeSanction/sanctionStatus flags were being written to a key nothing
// ever reads, and the `if (user)` guard silently skipped the write on top
// of that (the key almost never exists). Net effect: sanctions were
// recorded but never actually landed anywhere enforcement could see them.
const userKeyFor = (userId: string) => `user:${userId}`;

/**
 * Returns the caller's active, not-yet-expired sanction, or null. Also the
 * single place that lazily expires a stale sanction (mirrors the
 * self-healing pattern used elsewhere in this codebase for system alerts)
 * so every caller — the enforcement check below, the admin list, the
 * user's own sanction history — sees consistent status without each one
 * reimplementing the expiry check.
 */
export async function getActiveSanction(userId: string): Promise<any | null> {
  const allSanctions = await kv.getByPrefix('sanction:');
  const now = new Date();
  for (const sanction of allSanctions as any[]) {
    if (sanction.userId !== userId || sanction.status !== 'active') continue;
    if (sanction.expiresAt && new Date(sanction.expiresAt) < now) {
      sanction.status = 'expired';
      await kv.set(sanction.id, sanction).catch(() => {});
      await kv.set(userKeyFor(userId), {
        ...((await kv.get(userKeyFor(userId))) as any ?? {}),
        activeSanction: null,
        sanctionStatus: null,
      }).catch(() => {});
      continue;
    }
    return sanction;
  }
  return null;
}

/**
 * Real enforcement check — this is what was missing entirely. Sanctions
 * were being created and shown in the admin UI, but nothing on the
 * messaging-send or booking-initiation hot paths ever called this (or the
 * old dead /check-restriction endpoint, which had zero callers anywhere in
 * the app) before this fix, so a suspended/banned user could keep
 * messaging and booking exactly as if nothing had happened.
 */
export async function isActionRestricted(
  userId: string,
  action: 'messaging' | 'booking' | 'profile_edit',
): Promise<{ restricted: boolean; sanction: any | null }> {
  const sanction = await getActiveSanction(userId);
  if (!sanction) return { restricted: false, sanction: null };
  const restrictions: string[] = sanction.restrictions || [];
  const restricted = restrictions.includes('all') || restrictions.includes(action);
  return { restricted, sanction: restricted ? sanction : null };
}

async function notifySanctionedUser(
  userId: string,
  title: string,
  message: string,
): Promise<void> {
  try {
    await createNotification(kv, {
      userId,
      type: 'account_sanctioned',
      title,
      message,
      priority: 'high',
    });
    const profile = ((await kv.get(userKeyFor(userId))) as any) ?? (await db.getProfile(userId).catch(() => null));
    if (profile?.email) {
      await sendEmail({
        to: profile.email,
        subject: title,
        html: `<p>Hi ${profile.fullName || profile.name || 'there'},</p><p>${message}</p><p>If you believe this is a mistake, you can file an appeal from your account settings.</p>`,
      }).catch((e) => console.warn('Sanction notification email (non-fatal):', e));
    }
  } catch (e: any) {
    console.warn('Sanction notification (non-fatal):', e.message);
  }
}

// Sanction types and durations
const SANCTION_CATALOGUE = {
  warning: {
    name: 'Warning',
    duration: null,
    restrictions: [],
    description: 'Formal warning with no account restrictions',
  },
  suspend_messaging: {
    name: 'Messaging Suspension',
    duration: 7, // days
    restrictions: ['messaging'],
    description: 'Cannot send messages for 7 days',
  },
  suspend_booking: {
    name: 'Booking Suspension',
    duration: 14,
    restrictions: ['booking'],
    description: 'Cannot make or accept bookings for 14 days',
  },
  suspend_account: {
    name: 'Account Suspension',
    duration: 30,
    restrictions: ['messaging', 'booking', 'profile_edit'],
    description: 'Account suspended for 30 days',
  },
  permanent_ban: {
    name: 'Permanent Ban',
    duration: null,
    restrictions: ['all'],
    description: 'Permanent account ban - cannot access platform',
  },
};

const SANCTION_REASONS = [
  'Sharing contact information',
  'Payment circumvention',
  'Inappropriate content',
  'Harassment',
  'No-show pattern (3+ strikes)',
  'Fraudulent activity',
  'Terms of service violation',
  'Safety concern',
  'Other',
];

// Create sanction
app.post('/', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { userId, sanctionType, reason, notes, issuedBy } = await c.req.json();

    if (!userId || !sanctionType || !reason) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const catalogue = SANCTION_CATALOGUE[sanctionType as keyof typeof SANCTION_CATALOGUE];
    if (!catalogue) {
      return c.json({ error: 'Invalid sanction type' }, 400);
    }

    const sanctionId = `sanction:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const expiresAt = catalogue.duration 
      ? new Date(Date.now() + catalogue.duration * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const sanction = {
      id: sanctionId,
      userId,
      sanctionType,
      reason,
      notes,
      issuedBy,
      issuedAt: new Date().toISOString(),
      expiresAt,
      restrictions: catalogue.restrictions,
      status: 'active',
      appealStatus: null,
      appealedAt: null,
      appealNotes: null,
      appealReviewedAt: null,
      appealOutcome: null,
    };

    await kv.set(sanctionId, sanction);

    // Update user record
    const userKey = userKeyFor(userId);
    const user = await kv.get(userKey);
    if (user) {
      await kv.set(userKey, {
        ...user,
        activeSanction: sanctionId,
        sanctionStatus: 'active',
      });
    }

    await notifySanctionedUser(
      userId,
      `Account action: ${catalogue.name}`,
      `${catalogue.description}. Reason: ${reason}.${expiresAt ? ` This expires on ${new Date(expiresAt).toLocaleDateString('en-GB')}.` : ''}`,
    );

    return c.json({ success: true, sanction });
  } catch (error: any) {
    console.error('Error creating sanction:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get user sanctions
app.get('/user/:userId', async (c) => {
  try {
    const auth = await requireSelfOrAdmin(c, c.req.param('userId'));
    if (auth instanceof Response) return auth;
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const allSanctions = await kv.getByPrefix('sanction:');
    
    const now = new Date();
    const userSanctions = allSanctions
      .filter((sanction: any) => {
        if (sanction.userId !== userId) return false;
        
        // Check if expired
        if (sanction.expiresAt && new Date(sanction.expiresAt) < now) {
          sanction.status = 'expired';
          kv.set(sanction.id, sanction);
        }
        
        return true;
      })
      .sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    const activeSanction = userSanctions.find((s: any) => s.status === 'active');

    return c.json({ 
      sanctions: userSanctions,
      activeSanction: activeSanction || null,
    });
  } catch (error: any) {
    console.error('Error fetching sanctions:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Check if user can perform action. This had zero callers anywhere in the
// app before this fix (confirmed by audit) — real enforcement now also
// happens inline via isActionRestricted() in conversations-routes.tsx
// (messaging) and payment-routes.tsx (booking initiation), which don't
// need an extra HTTP round-trip since they run in the same process. This
// endpoint stays for any client that wants to check before attempting an
// action. It used to call c.req.json() twice on the same request (once for
// an "authBody", again for the real body) — the second call would have
// thrown on a real request body stream, which is likely *why* nothing
// ever ended up calling this successfully.
app.post('/check-restriction', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, action } = body;
    const auth = await requireSelfOrAdmin(c, userId);
    if (auth instanceof Response) return auth;

    const { restricted, sanction } = await isActionRestricted(userId, action);

    return c.json({
      allowed: !restricted,
      reason: restricted ? sanction.reason : null,
      sanctionType: restricted ? sanction.sanctionType : null,
      expiresAt: restricted ? sanction.expiresAt : null,
    });
  } catch (error: any) {
    console.error('Error checking restriction:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Appeal sanction
app.post('/:sanctionId/appeal', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ success: false, error: 'Unauthorized' }, 401);
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sanctionId = c.req.param('sanctionId');
    const { appealNotes } = await c.req.json();

    const sanction = await kv.get(sanctionId);
    if (!sanction) {
      return c.json({ error: 'Sanction not found' }, 404);
    }

    const updatedSanction = {
      ...sanction,
      appealStatus: 'pending',
      appealedAt: new Date().toISOString(),
      appealNotes,
    };

    await kv.set(sanctionId, updatedSanction);

    return c.json({ success: true, sanction: updatedSanction });
  } catch (error: any) {
    console.error('Error appealing sanction:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Review appeal
app.post('/:sanctionId/appeal/review', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const sanctionId = c.req.param('sanctionId');
    const { outcome, reviewNotes, reviewedBy } = await c.req.json();

    const sanction = await kv.get(sanctionId);
    if (!sanction) {
      return c.json({ error: 'Sanction not found' }, 404);
    }

    const updatedSanction = {
      ...sanction,
      appealStatus: outcome, // 'approved' | 'denied'
      appealReviewedAt: new Date().toISOString(),
      appealReviewNotes: reviewNotes,
      appealReviewedBy: reviewedBy,
      status: outcome === 'approved' ? 'lifted' : sanction.status,
    };

    await kv.set(sanctionId, updatedSanction);

    // If approved, update user record
    if (outcome === 'approved') {
      const userKey = userKeyFor((sanction as any).userId);
      const user = await kv.get(userKey);
      if (user) {
        await kv.set(userKey, {
          ...user,
          activeSanction: null,
          sanctionStatus: null,
        });
      }
    }

    await notifySanctionedUser(
      (sanction as any).userId,
      outcome === 'approved' ? 'Your appeal was approved' : 'Your appeal was denied',
      outcome === 'approved'
        ? 'Your account sanction has been lifted.'
        : `Your appeal was reviewed and denied.${reviewNotes ? ` Note: ${reviewNotes}` : ''}`,
    );

    return c.json({ success: true, sanction: updatedSanction });
  } catch (error: any) {
    console.error('Error reviewing appeal:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get all sanctions (admin)
app.get('/', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const status = c.req.query('status') || 'all';
    const allSanctions = await kv.getByPrefix('sanction:');
    
    const filteredSanctions = allSanctions
      .filter((s: any) => status === 'all' || s.status === status)
      .sort((a: any, b: any) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

    return c.json({ 
      sanctions: filteredSanctions,
      catalogue: SANCTION_CATALOGUE,
      reasons: SANCTION_REASONS,
    });
  } catch (error: any) {
    console.error('Error fetching sanctions:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;
