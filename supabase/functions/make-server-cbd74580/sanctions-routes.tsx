import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const app = new Hono();

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
    const userKey = `user_${userId}`;
    const user = await kv.get(userKey);
    if (user) {
      await kv.set(userKey, {
        ...user,
        activeSanction: sanctionId,
        sanctionStatus: 'active',
      });
    }

    return c.json({ success: true, sanction });
  } catch (error: any) {
    console.error('Error creating sanction:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get user sanctions
app.get('/user/:userId', async (c) => {
  try {
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

// Check if user can perform action
app.post('/check-restriction', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { userId, action } = await c.req.json();

    const allSanctions = await kv.getByPrefix('sanction:');
    const now = new Date();
    
    const activeSanction = allSanctions.find((sanction: any) => {
      if (sanction.userId !== userId || sanction.status !== 'active') {
        return false;
      }
      
      // Check if expired
      if (sanction.expiresAt && new Date(sanction.expiresAt) < now) {
        sanction.status = 'expired';
        kv.set(sanction.id, sanction);
        return false;
      }
      
      return true;
    });

    if (!activeSanction) {
      return c.json({ allowed: true, reason: null });
    }

    const restrictions = activeSanction.restrictions || [];
    
    // Check if action is restricted
    const isRestricted = restrictions.includes('all') || restrictions.includes(action);

    return c.json({
      allowed: !isRestricted,
      reason: isRestricted ? activeSanction.reason : null,
      sanctionType: isRestricted ? activeSanction.sanctionType : null,
      expiresAt: isRestricted ? activeSanction.expiresAt : null,
    });
  } catch (error: any) {
    console.error('Error checking restriction:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Appeal sanction
app.post('/:sanctionId/appeal', async (c) => {
  try {
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
      const userKey = `user_${(sanction as any).userId}`;
      const user = await kv.get(userKey);
      if (user) {
        await kv.set(userKey, {
          ...user,
          activeSanction: null,
          sanctionStatus: null,
        });
      }
    }

    return c.json({ success: true, sanction: updatedSanction });
  } catch (error: any) {
    console.error('Error reviewing appeal:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get all sanctions (admin)
app.get('/', async (c) => {
  try {
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
