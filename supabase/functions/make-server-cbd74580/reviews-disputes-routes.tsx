import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Simple profanity filter (basic list)
const profanityList = ['badword1', 'badword2', 'profanity']; // Extend as needed
function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return profanityList.some(word => lowerText.includes(word));
}

// Create a review (Parent only)
app.post('/reviews', async (c) => {
  try {
    const body = await c.req.json();
    const { sessionId, tutorId, parentId, studentId, rating, comment } = body;

    if (!sessionId || !tutorId || !parentId || rating === undefined) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }

    // Check if review already exists for this session
    const existingReviews = await kv.getByPrefix(`review:session:${sessionId}`);
    if (existingReviews && existingReviews.length > 0) {
      return c.json({ error: 'Review already exists for this session' }, 400);
    }

    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    // Detect profanity
    const hasProfanity = comment ? containsProfanity(comment) : false;

    const review = {
      id: reviewId,
      sessionId,
      tutorId,
      parentId,
      studentId: studentId || null,
      rating,
      comment: comment || '',
      createdAt: now,
      flagged: false,
      profanityDetected: hasProfanity,
      resolved: false,
      reply: null,
    };

    // Store review
    await kv.set(`review:${reviewId}`, review);
    await kv.set(`review:session:${sessionId}:${reviewId}`, reviewId);
    await kv.set(`review:tutor:${tutorId}:${reviewId}`, reviewId);
    await kv.set(`review:parent:${parentId}:${reviewId}`, reviewId);

    // Update tutor's average rating
    await updateTutorRating(tutorId);

    return c.json({ 
      success: true, 
      review,
      warning: hasProfanity ? 'Review flagged for profanity - pending moderation' : null 
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return c.json({ error: 'Failed to create review', details: String(error) }, 500);
  }
});

// Get reviews
app.get('/reviews', async (c) => {
  try {
    const tutorId = c.req.query('tutorId');
    const parentId = c.req.query('parentId');
    const sessionId = c.req.query('sessionId');

    let reviewIds: string[] = [];

    if (sessionId) {
      const keys = await kv.getByPrefix(`review:session:${sessionId}`);
      reviewIds = keys.map((k: any) => k.value);
    } else if (tutorId) {
      const keys = await kv.getByPrefix(`review:tutor:${tutorId}`);
      reviewIds = keys.map((k: any) => k.value);
    } else if (parentId) {
      const keys = await kv.getByPrefix(`review:parent:${parentId}`);
      reviewIds = keys.map((k: any) => k.value);
    } else {
      // Get all reviews
      const allReviews = await kv.getByPrefix('review:review_');
      return c.json({ reviews: allReviews.map((r: any) => r.value) });
    }

    // Fetch all reviews
    const reviews = [];
    for (const id of reviewIds) {
      const review = await kv.get(`review:${id}`);
      if (review) {
        reviews.push(review);
      }
    }

    return c.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return c.json({ error: 'Failed to fetch reviews', details: String(error) }, 500);
  }
});

// Add reply to review (Tutor only)
app.post('/reviews/:reviewId/reply', async (c) => {
  try {
    const { reviewId } = c.req.param();
    const body = await c.req.json();
    const { tutorId, replyText } = body;

    if (!replyText) {
      return c.json({ error: 'Reply text is required' }, 400);
    }

    const review = await kv.get(`review:${reviewId}`);
    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    // Verify tutor owns this review
    if (review.tutorId !== tutorId) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Check if reply already exists
    if (review.reply) {
      return c.json({ error: 'Reply already exists for this review' }, 400);
    }

    // Check for profanity in reply
    const hasProfanity = containsProfanity(replyText);

    const reply = {
      tutorId,
      text: replyText,
      createdAt: new Date().toISOString(),
      flagged: false,
      profanityDetected: hasProfanity,
    };

    review.reply = reply;
    await kv.set(`review:${reviewId}`, review);

    return c.json({ 
      success: true, 
      review,
      warning: hasProfanity ? 'Reply flagged for profanity - pending moderation' : null 
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    return c.json({ error: 'Failed to add reply', details: String(error) }, 500);
  }
});

// Mark review as resolved
app.patch('/reviews/:reviewId/resolve', async (c) => {
  try {
    const { reviewId } = c.req.param();

    const review = await kv.get(`review:${reviewId}`);
    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    review.resolved = true;
    review.resolvedAt = new Date().toISOString();
    await kv.set(`review:${reviewId}`, review);

    return c.json({ success: true, review });
  } catch (error) {
    console.error('Error resolving review:', error);
    return c.json({ error: 'Failed to resolve review', details: String(error) }, 500);
  }
});

// Flag review for admin (by tutor)
app.post('/reviews/:reviewId/flag', async (c) => {
  try {
    const { reviewId } = c.req.param();
    const body = await c.req.json();
    const { reason } = body;

    const review = await kv.get(`review:${reviewId}`);
    if (!review) {
      return c.json({ error: 'Review not found' }, 404);
    }

    review.flagged = true;
    review.flagReason = reason || 'No reason provided';
    review.flaggedAt = new Date().toISOString();
    await kv.set(`review:${reviewId}`, review);

    return c.json({ success: true, review });
  } catch (error) {
    console.error('Error flagging review:', error);
    return c.json({ error: 'Failed to flag review', details: String(error) }, 500);
  }
});

// Get tutor's average rating
app.get('/tutor/:tutorId/rating', async (c) => {
  try {
    const { tutorId } = c.req.param();
    const ratingData = await kv.get(`tutor:rating:${tutorId}`);

    if (!ratingData) {
      return c.json({ 
        averageRating: 0, 
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      });
    }

    return c.json(ratingData);
  } catch (error) {
    console.error('Error fetching tutor rating:', error);
    return c.json({ error: 'Failed to fetch rating', details: String(error) }, 500);
  }
});

// Helper function to update tutor's average rating
async function updateTutorRating(tutorId: string) {
  try {
    const reviewKeys = await kv.getByPrefix(`review:tutor:${tutorId}`);
    const reviewIds = reviewKeys.map((k: any) => k.value);

    const reviews = [];
    for (const id of reviewIds) {
      const review = await kv.get(`review:${id}`);
      if (review) {
        reviews.push(review);
      }
    }

    const totalReviews = reviews.length;
    const sumRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

    // Rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r) => {
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      }
    });

    const ratingData = {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews,
      ratingDistribution,
      lastUpdated: new Date().toISOString(),
    };

    await kv.set(`tutor:rating:${tutorId}`, ratingData);
    return ratingData;
  } catch (error) {
    console.error('Error updating tutor rating:', error);
  }
}

// ==================== DISPUTES ====================

// Create a dispute
app.post('/disputes', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      type, 
      sessionId, 
      submittedBy, 
      submittedByRole,
      submittedAgainst, 
      submittedAgainstRole,
      description, 
      evidence 
    } = body;

    if (!type || !submittedBy || !submittedAgainst || !description) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const validTypes = ['no-show', 'quality', 'payment', 'behavior', 'other'];
    if (!validTypes.includes(type)) {
      return c.json({ error: 'Invalid dispute type' }, 400);
    }

    const disputeId = `dispute_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const dispute = {
      id: disputeId,
      type,
      sessionId: sessionId || null,
      submittedBy,
      submittedByRole: submittedByRole || 'unknown',
      submittedAgainst,
      submittedAgainstRole: submittedAgainstRole || 'unknown',
      description,
      evidence: evidence || [],
      status: 'pending', // pending, in-review, resolved, closed
      outcome: null,
      outcomeDetails: null,
      createdAt: now,
      resolvedAt: null,
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days SLA
      assignedTo: null,
      notes: [],
    };

    // Store dispute
    await kv.set(`dispute:${disputeId}`, dispute);
    await kv.set(`dispute:submittedBy:${submittedBy}:${disputeId}`, disputeId);
    await kv.set(`dispute:submittedAgainst:${submittedAgainst}:${disputeId}`, disputeId);
    await kv.set(`dispute:status:${dispute.status}:${disputeId}`, disputeId);

    return c.json({ success: true, dispute });
  } catch (error) {
    console.error('Error creating dispute:', error);
    return c.json({ error: 'Failed to create dispute', details: String(error) }, 500);
  }
});

// Get disputes
app.get('/disputes', async (c) => {
  try {
    const userId = c.req.query('userId');
    const status = c.req.query('status');
    const role = c.req.query('role');

    let disputeIds: string[] = [];

    if (status) {
      const keys = await kv.getByPrefix(`dispute:status:${status}`);
      disputeIds = keys.map((k: any) => k.value);
    } else if (userId && role === 'admin') {
      // Admin sees all disputes
      const allDisputes = await kv.getByPrefix('dispute:dispute_');
      return c.json({ disputes: allDisputes.map((d: any) => d.value) });
    } else if (userId) {
      // Get disputes submitted by or against this user
      const submittedKeys = await kv.getByPrefix(`dispute:submittedBy:${userId}`);
      const againstKeys = await kv.getByPrefix(`dispute:submittedAgainst:${userId}`);
      const submittedIds = submittedKeys.map((k: any) => k.value);
      const againstIds = againstKeys.map((k: any) => k.value);
      disputeIds = [...new Set([...submittedIds, ...againstIds])];
    } else {
      // Get all disputes (admin only)
      const allDisputes = await kv.getByPrefix('dispute:dispute_');
      return c.json({ disputes: allDisputes.map((d: any) => d.value) });
    }

    // Fetch all disputes
    const disputes = [];
    for (const id of disputeIds) {
      const dispute = await kv.get(`dispute:${id}`);
      if (dispute) {
        disputes.push(dispute);
      }
    }

    return c.json({ disputes });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return c.json({ error: 'Failed to fetch disputes', details: String(error) }, 500);
  }
});

// Update dispute (Admin only)
app.patch('/disputes/:disputeId', async (c) => {
  try {
    const { disputeId } = c.req.param();
    const body = await c.req.json();
    const { status, outcome, outcomeDetails, assignedTo, note } = body;

    const dispute = await kv.get(`dispute:${disputeId}`);
    if (!dispute) {
      return c.json({ error: 'Dispute not found' }, 404);
    }

    const oldStatus = dispute.status;

    if (status) {
      dispute.status = status;
      if (status === 'resolved' || status === 'closed') {
        dispute.resolvedAt = new Date().toISOString();
      }
    }

    if (outcome) {
      dispute.outcome = outcome;
    }

    if (outcomeDetails) {
      dispute.outcomeDetails = outcomeDetails;
    }

    if (assignedTo) {
      dispute.assignedTo = assignedTo;
    }

    if (note) {
      dispute.notes = dispute.notes || [];
      dispute.notes.push({
        text: note,
        addedBy: body.addedBy || 'admin',
        addedAt: new Date().toISOString(),
      });
    }

    dispute.lastUpdated = new Date().toISOString();

    // Update storage
    await kv.set(`dispute:${disputeId}`, dispute);
    
    // Update status index if status changed
    if (status && status !== oldStatus) {
      await kv.del(`dispute:status:${oldStatus}:${disputeId}`);
      await kv.set(`dispute:status:${status}:${disputeId}`, disputeId);
    }

    return c.json({ success: true, dispute });
  } catch (error) {
    console.error('Error updating dispute:', error);
    return c.json({ error: 'Failed to update dispute', details: String(error) }, 500);
  }
});

// Add evidence to dispute
app.post('/disputes/:disputeId/evidence', async (c) => {
  try {
    const { disputeId } = c.req.param();
    const body = await c.req.json();
    const { type, description, url } = body;

    const dispute = await kv.get(`dispute:${disputeId}`);
    if (!dispute) {
      return c.json({ error: 'Dispute not found' }, 404);
    }

    const evidence = {
      id: `evidence_${Date.now()}`,
      type,
      description,
      url,
      addedAt: new Date().toISOString(),
    };

    dispute.evidence = dispute.evidence || [];
    dispute.evidence.push(evidence);

    await kv.set(`dispute:${disputeId}`, dispute);

    return c.json({ success: true, dispute });
  } catch (error) {
    console.error('Error adding evidence:', error);
    return c.json({ error: 'Failed to add evidence', details: String(error) }, 500);
  }
});

export default app;
