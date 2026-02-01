import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Prohibited keywords and patterns
const PROHIBITED_KEYWORDS = [
  // Contact sharing
  'email', 'gmail', 'yahoo', 'hotmail', 'outlook',
  'whatsapp', 'telegram', 'signal', 'discord',
  'phone', 'mobile', 'call me', 'text me',
  'skype', 'zoom', 'meet outside',
  // Payment circumvention
  'pay me directly', 'cash only', 'venmo', 'paypal', 'cashapp',
  'pay outside', 'off platform', 'avoid fees',
  // Inappropriate content
  'explicit', 'sexual', 'drugs', 'illegal',
];

const CONTACT_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone (US format)
  /\b\d{10,}\b/, // Phone (international)
  /\b0\d{9,10}\b/, // UK phone
  /\+\d{1,3}\s?\d{1,14}\b/, // International with +
];

// Content moderation function
function moderateContent(text: string, type: 'message' | 'bio' | 'profile'): {
  allowed: boolean;
  violations: string[];
  severity: 'low' | 'medium' | 'high';
  flaggedPatterns: string[];
} {
  const violations: string[] = [];
  const flaggedPatterns: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';

  const lowerText = text.toLowerCase();

  // Check prohibited keywords
  for (const keyword of PROHIBITED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      violations.push(`Prohibited keyword: ${keyword}`);
      flaggedPatterns.push(keyword);
    }
  }

  // Check contact patterns - HARD BLOCK
  for (const pattern of CONTACT_PATTERNS) {
    if (pattern.test(text)) {
      violations.push('Contact information detected');
      flaggedPatterns.push(pattern.toString());
      severity = 'high';
    }
  }

  // Determine severity
  if (violations.length === 0) {
    severity = 'low';
  } else if (severity !== 'high') {
    severity = violations.length > 2 ? 'medium' : 'low';
  }

  // Hard block for high severity
  const allowed = severity !== 'high';

  return {
    allowed,
    violations,
    severity,
    flaggedPatterns,
  };
}

// Moderate content endpoint
app.post('/moderate', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { content, type, userId, contextId } = await c.req.json();

    if (!content || !type) {
      return c.json({ error: 'Content and type required' }, 400);
    }

    const result = moderateContent(content, type);

    // Log moderation check
    const logId = `moderation-log:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await kv.set(logId, {
      id: logId,
      userId,
      content,
      type,
      contextId,
      result,
      timestamp: new Date().toISOString(),
    });

    // If violations detected, create moderation queue item
    if (result.violations.length > 0) {
      const queueId = `moderation-queue:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(queueId, {
        id: queueId,
        userId,
        content,
        type,
        contextId,
        violations: result.violations,
        severity: result.severity,
        status: result.allowed ? 'flagged' : 'blocked',
        timestamp: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
        outcome: null,
      });
    }

    return c.json(result);
  } catch (error: any) {
    console.error('Error moderating content:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get moderation queue for admins
app.get('/queue', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const status = c.req.query('status') || 'pending';
    const allItems = await kv.getByPrefix('moderation-queue:');
    
    const filteredItems = allItems
      .filter((item: any) => !status || item.status === status || status === 'all')
      .sort((a: any, b: any) => {
        // Sort by severity first, then timestamp
        const severityOrder = { high: 3, medium: 2, low: 1 };
        const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
        const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
        
        if (aSeverity !== bSeverity) {
          return bSeverity - aSeverity;
        }
        
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

    return c.json({ items: filteredItems });
  } catch (error: any) {
    console.error('Error fetching moderation queue:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Review moderation item
app.post('/queue/:itemId/review', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const itemId = c.req.param('itemId');
    const { outcome, reviewerId, notes, actionTaken } = await c.req.json();

    const item = await kv.get(itemId);
    if (!item) {
      return c.json({ error: 'Item not found' }, 404);
    }

    const updatedItem = {
      ...item,
      status: 'reviewed',
      outcome,
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes,
      actionTaken,
    };

    await kv.set(itemId, updatedItem);

    // If action taken, record strike or sanction
    if (actionTaken && actionTaken !== 'no-action') {
      const strikeId = `strike:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await kv.set(strikeId, {
        id: strikeId,
        userId: (item as any).userId,
        reason: outcome,
        moderationItemId: itemId,
        severity: (item as any).severity,
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        active: true,
      });
    }

    return c.json({ success: true, item: updatedItem });
  } catch (error: any) {
    console.error('Error reviewing moderation item:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// Get user strikes
app.get('/strikes/:userId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const allStrikes = await kv.getByPrefix('strike:');
    
    const now = new Date();
    const userStrikes = allStrikes
      .filter((strike: any) => {
        if (strike.userId !== userId) return false;
        
        // Check if expired
        if (new Date(strike.expiresAt) < now) {
          // Mark as inactive
          strike.active = false;
          kv.set(strike.id, strike);
          return false;
        }
        
        return strike.active;
      })
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ strikes: userStrikes });
  } catch (error: any) {
    console.error('Error fetching strikes:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

export default app;
