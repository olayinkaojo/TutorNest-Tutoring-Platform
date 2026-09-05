import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { requireAdmin, requireSelfOrAdmin, verifyUser } from './route-auth.tsx';
import { logAuditEvent } from './activity-log.tsx';
import { processSessionAttendance } from './payment-routes.tsx';

const app = new Hono();

// ── Profanity filter (extend list as needed) ──────────────────────
const PROFANITY_LIST = ['badword1', 'badword2', 'profanity'];
function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY_LIST.some(w => lower.includes(w));
}

// ── Auth helper ───────────────────────────────────────────────────
async function getAuthUserId(accessToken: string | undefined): Promise<string | null> {
  if (!accessToken) return null;
  try {
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Name resolver ─────────────────────────────────────────────────
function resolveName(profile: any, fallback = 'Unknown'): string {
  if (!profile) return fallback;
  return (
    profile.fullName || profile.full_name || profile.name ||
    (profile.firstName ? `${profile.firstName} ${profile.lastName ?? ''}`.trim() : null) ||
    fallback
  );
}

// ─────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────

// POST /reviews — Create a review (authenticated parent only)
app.post('/reviews', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getAuthUserId(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const body = await c.req.json();
    const { sessionId, tutorId, parentId, studentId, rating, comment } = body;

    if (!sessionId || !tutorId || !parentId || rating === undefined) {
      return c.json({ error: 'Missing required fields: sessionId, tutorId, parentId, rating' }, 400);
    }
    if (rating < 1 || rating > 5) {
      return c.json({ error: 'Rating must be between 1 and 5' }, 400);
    }
    if (userId !== parentId) {
      return c.json({ error: 'Forbidden: you can only submit reviews as yourself' }, 403);
    }

    // Duplicate prevention per session
    const existingKeys = await kv.getByPrefix(`review:session:${sessionId}`);
    if (existingKeys.length > 0) {
      return c.json({ error: 'A review already exists for this session' }, 409);
    }

    // Enrich with context from the booking record
    let tutorName = 'Tutor';
    let studentName = 'Student';
    let subject = '';
    let sessionDate = '';
    try {
      let booking: any = await db.getBooking(sessionId);
      if (!booking) booking = await kv.get(`booking:${sessionId}`);
      if (booking) {
        sessionDate = booking.date || '';
        subject = booking.notes || booking.subject || '';
        tutorName = booking.tutorName || resolveName(
          await kv.get(`user:${tutorId}`) || await db.getProfile(tutorId),
          'Tutor',
        );
        if (studentId) {
          studentName = booking.studentName || resolveName(
            await kv.get(`child:${studentId}`) ||
            await kv.get(`user:${studentId}`) ||
            await db.getProfile(studentId),
            'Student',
          );
        } else {
          studentName = booking.studentName || 'Student';
        }
      }
    } catch (e) {
      console.warn('Could not enrich review with booking data:', e);
    }

    const reviewId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    const hasProfanity = comment ? containsProfanity(comment) : false;

    const review = {
      id: reviewId,
      sessionId,
      tutorId,
      parentId,
      studentId: studentId || null,
      rating,
      comment: comment?.trim() || '',
      tutorName,
      studentName,
      subject,
      sessionDate,
      createdAt: now,
      updatedAt: now,
      flagged: false,
      profanityDetected: hasProfanity,
      resolved: false,
      reply: null,
    };

    await kv.set(`review:${reviewId}`, review);
    await kv.set(`review:session:${sessionId}:${reviewId}`, reviewId);
    await kv.set(`review:tutor:${tutorId}:${reviewId}`, reviewId);
    await kv.set(`review:parent:${parentId}:${reviewId}`, reviewId);

    await updateTutorRating(tutorId);

    return c.json({
      success: true,
      review,
      warning: hasProfanity ? 'Your review has been submitted and is under moderation' : null,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    return c.json({ error: 'Failed to create review', details: String(error) }, 500);
  }
});

// Same field every profile-photo upload writes (see profile-avatar-routes.tsx)
// — resolved live rather than baked into the review at submission time, so a
// photo added later still shows up on old reviews.
const reviewPhotoCache = new Map<string, string | null>();
async function resolveReviewerPhoto(id: string | undefined | null): Promise<string | null> {
  if (!id) return null;
  if (reviewPhotoCache.has(id)) return reviewPhotoCache.get(id)!;
  const p = ((await kv.get(`user:${id}`)) as any) ?? (await db.getProfile(id).catch(() => null));
  const photo = p?.photoUrl || p?.photo_url || null;
  reviewPhotoCache.set(id, photo);
  return photo;
}

async function enrichReviewsWithPhotos(reviews: any[]): Promise<any[]> {
  return Promise.all(reviews.map(async (r) => ({
    ...r,
    studentPhoto: await resolveReviewerPhoto(r.studentId),
    parentPhoto: await resolveReviewerPhoto(r.parentId),
    tutorPhoto: await resolveReviewerPhoto(r.tutorId),
  })));
}

// GET /reviews — Fetch reviews filtered by tutorId, parentId, or sessionId
app.get('/reviews', async (c) => {
  try {
    const { tutorId, parentId, sessionId } = c.req.query() as Record<string, string>;

    let reviewIds: string[] = [];

    if (sessionId) {
      const keys = await kv.getByPrefix(`review:session:${sessionId}`);
      reviewIds = keys.map((k: any) => (typeof k === 'string' ? k : k.value ?? k.key?.split(':').pop())).filter(Boolean);
    } else if (tutorId) {
      const keys = await kv.getByPrefix(`review:tutor:${tutorId}`);
      reviewIds = keys.map((k: any) => (typeof k === 'string' ? k : k.value ?? k.key?.split(':').pop())).filter(Boolean);
    } else if (parentId) {
      const keys = await kv.getByPrefix(`review:parent:${parentId}`);
      reviewIds = keys.map((k: any) => (typeof k === 'string' ? k : k.value ?? k.key?.split(':').pop())).filter(Boolean);
    } else {
      const all = await kv.getByPrefix('review:review_');
      const reviews = all.map((r: any) => (typeof r === 'object' && r.value ? r.value : r)).filter(Boolean);
      reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return c.json({ reviews: await enrichReviewsWithPhotos(reviews) });
    }

    const reviews = (
      await Promise.all(reviewIds.map((id: string) => kv.get(`review:${id}`)))
    ).filter(Boolean);

    reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ reviews: await enrichReviewsWithPhotos(reviews) });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return c.json({ error: 'Failed to fetch reviews', details: String(error) }, 500);
  }
});

// GET /reviews/stats — Aggregate rating stats for a tutor
app.get('/reviews/stats', async (c) => {
  try {
    const tutorId = c.req.query('tutorId');
    if (!tutorId) return c.json({ error: 'tutorId is required' }, 400);
    const cached = await kv.get(`tutor:rating:${tutorId}`);
    if (cached) return c.json(cached);
    const stats = await updateTutorRating(tutorId);
    return c.json(stats || { averageRating: 0, totalReviews: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  } catch (error) {
    return c.json({ error: 'Failed to fetch stats', details: String(error) }, 500);
  }
});

// POST /reviews/:reviewId/reply — Add tutor reply
app.post('/reviews/:reviewId/reply', async (c) => {
  try {
    const { reviewId } = c.req.param();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getAuthUserId(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { tutorId, replyText } = await c.req.json();
    if (!replyText?.trim()) return c.json({ error: 'Reply text is required' }, 400);
    if (replyText.trim().length > 500) return c.json({ error: 'Reply must be 500 characters or less' }, 400);

    const review = await kv.get(`review:${reviewId}`);
    if (!review) return c.json({ error: 'Review not found' }, 404);

    const effectiveTutorId = tutorId || userId;
    if (review.tutorId !== effectiveTutorId) return c.json({ error: 'Forbidden' }, 403);
    if (review.reply) return c.json({ error: 'A reply already exists for this review' }, 409);

    const hasProfanity = containsProfanity(replyText);
    review.reply = {
      tutorId: effectiveTutorId,
      tutorName: review.tutorName || 'Tutor',
      text: replyText.trim(),
      createdAt: new Date().toISOString(),
      flagged: false,
      profanityDetected: hasProfanity,
    };
    await kv.set(`review:${reviewId}`, review);

    return c.json({
      success: true,
      review,
      warning: hasProfanity ? 'Reply is under moderation review' : null,
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    return c.json({ error: 'Failed to add reply', details: String(error) }, 500);
  }
});

// PUT /reviews/:reviewId/reply — Edit tutor reply
app.put('/reviews/:reviewId/reply', async (c) => {
  try {
    const { reviewId } = c.req.param();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getAuthUserId(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { replyText } = await c.req.json();
    if (!replyText?.trim()) return c.json({ error: 'Reply text is required' }, 400);
    if (replyText.trim().length > 500) return c.json({ error: 'Reply must be 500 characters or less' }, 400);

    const review = await kv.get(`review:${reviewId}`);
    if (!review) return c.json({ error: 'Review not found' }, 404);
    if (review.tutorId !== userId) return c.json({ error: 'Forbidden' }, 403);
    if (!review.reply) return c.json({ error: 'No reply exists to edit' }, 404);

    const hasProfanity = containsProfanity(replyText);
    review.reply = {
      ...review.reply,
      text: replyText.trim(),
      updatedAt: new Date().toISOString(),
      profanityDetected: hasProfanity,
    };
    await kv.set(`review:${reviewId}`, review);

    return c.json({ success: true, review });
  } catch (error) {
    return c.json({ error: 'Failed to edit reply', details: String(error) }, 500);
  }
});

// DELETE /reviews/:reviewId — Parent deletes own review (within 24h)
app.delete('/reviews/:reviewId', async (c) => {
  try {
    const { reviewId } = c.req.param();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getAuthUserId(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const review = await kv.get(`review:${reviewId}`);
    if (!review) return c.json({ error: 'Review not found' }, 404);
    if (review.parentId !== userId) return c.json({ error: 'Forbidden' }, 403);

    const ageHours = (Date.now() - new Date(review.createdAt).getTime()) / 3_600_000;
    if (ageHours > 24) {
      return c.json({ error: 'Reviews can only be deleted within 24 hours of submission' }, 400);
    }

    await kv.del(`review:${reviewId}`);
    await kv.del(`review:session:${review.sessionId}:${reviewId}`);
    await kv.del(`review:tutor:${review.tutorId}:${reviewId}`);
    await kv.del(`review:parent:${review.parentId}:${reviewId}`);

    await updateTutorRating(review.tutorId);

    return c.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    return c.json({ error: 'Failed to delete review', details: String(error) }, 500);
  }
});

// PATCH /reviews/:reviewId/resolve — Mark as resolved
app.patch('/reviews/:reviewId/resolve', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { reviewId } = c.req.param();
    const review = await kv.get(`review:${reviewId}`);
    if (!review) return c.json({ error: 'Review not found' }, 404);
    review.resolved = true;
    review.resolvedAt = new Date().toISOString();
    await kv.set(`review:${reviewId}`, review);

    await logAuditEvent({
      userId: auth as string,
      action: 'review_flag_resolved',
      category: 'disputes',
      description: `Flagged review resolved (${reviewId})`,
      metadata: { reviewId },
    });

    return c.json({ success: true, review });
  } catch (error) {
    return c.json({ error: 'Failed to resolve review', details: String(error) }, 500);
  }
});

// POST /reviews/:reviewId/flag — Tutor flags a review for admin
app.post('/reviews/:reviewId/flag', async (c) => {
  try {
    const { reviewId } = c.req.param();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getAuthUserId(accessToken);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);

    const { reason } = await c.req.json();
    const review = await kv.get(`review:${reviewId}`);
    if (!review) return c.json({ error: 'Review not found' }, 404);
    if (review.tutorId !== userId) return c.json({ error: 'Forbidden' }, 403);
    if (review.flagged) return c.json({ error: 'Review is already flagged' }, 409);

    review.flagged = true;
    review.flagReason = reason?.trim() || 'No reason provided';
    review.flaggedAt = new Date().toISOString();
    review.flaggedBy = userId;
    await kv.set(`review:${reviewId}`, review);

    return c.json({ success: true, review });
  } catch (error) {
    return c.json({ error: 'Failed to flag review', details: String(error) }, 500);
  }
});

// GET /tutor/:tutorId/rating — Get tutor rating summary
app.get('/tutor/:tutorId/rating', async (c) => {
  try {
    const { tutorId } = c.req.param();
    const cached = await kv.get(`tutor:rating:${tutorId}`);
    if (cached) return c.json(cached);
    const stats = await updateTutorRating(tutorId);
    return c.json(stats || { averageRating: 0, totalReviews: 0, ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  } catch (error) {
    return c.json({ error: 'Failed to fetch rating', details: String(error) }, 500);
  }
});

// ── Helper: recompute and cache tutor rating ──────────────────────
async function updateTutorRating(tutorId: string) {
  try {
    const reviewKeys = await kv.getByPrefix(`review:tutor:${tutorId}`);
    const reviewIds = reviewKeys.map((k: any) => (typeof k === 'string' ? k : k.value ?? k.key?.split(':').pop())).filter(Boolean);
    const reviews = (await Promise.all(reviewIds.map((id: string) => kv.get(`review:${id}`)))).filter(Boolean);

    const total = reviews.length;
    const sum = reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0);
    const avg = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r: any) => {
      if (r.rating >= 1 && r.rating <= 5) dist[r.rating]++;
    });

    const stats = {
      averageRating: avg,
      totalReviews: total,
      ratingDistribution: dist,
      lastUpdated: new Date().toISOString(),
    };
    await kv.set(`tutor:rating:${tutorId}`, stats);
    return stats;
  } catch (e) {
    console.error('Error updating tutor rating:', e);
  }
}

// ─────────────────────────────────────────────────────────────────
// DISPUTES
// ─────────────────────────────────────────────────────────────────

// POST /disputes — Create a dispute
app.post('/disputes', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ error: 'Unauthorized' }, 401);
    const body = await c.req.json();
    // A dispute is filed under the caller's own identity.
    if (body?.submittedBy && body.submittedBy !== callerId) {
      return c.json({ error: 'Can only file disputes under your own account' }, 403);
    }
    const {
      type,
      sessionId,
      submittedBy,
      submittedByRole,
      submittedAgainst,
      submittedAgainstRole,
      description,
      evidence,
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
      status: 'pending',
      outcome: null,
      outcomeDetails: null,
      createdAt: now,
      resolvedAt: null,
      slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      assignedTo: null,
      notes: [],
    };

    await kv.set(`dispute:${disputeId}`, dispute);
    await kv.set(`dispute:submittedBy:${submittedBy}:${disputeId}`, disputeId);
    await kv.set(`dispute:submittedAgainst:${submittedAgainst}:${disputeId}`, disputeId);
    await kv.set(`dispute:status:${dispute.status}:${disputeId}`, disputeId);
    // Lets payment-routes.tsx cheaply check "does this booking have an open
    // dispute?" before releasing earnings, instead of scanning every dispute.
    if (sessionId) {
      await kv.set(`dispute:session:${sessionId}:${disputeId}`, disputeId);
    }

    await logAuditEvent({
      userId: submittedAgainst,
      action: 'dispute_created',
      category: 'disputes',
      description: `Dispute filed against ${submittedAgainstRole || 'user'} — type: ${type}`,
      severity: 'warning',
      metadata: { disputeId, type, submittedBy, submittedAgainst, sessionId },
    });

    return c.json({ success: true, dispute });
  } catch (error) {
    console.error('Error creating dispute:', error);
    return c.json({ error: 'Failed to create dispute', details: String(error) }, 500);
  }
});

// GET /disputes — Fetch disputes for a user or admin
app.get('/disputes', async (c) => {
  try {
    const filterUserId = c.req.query('userId');
    if (filterUserId) {
      const auth = await requireSelfOrAdmin(c, filterUserId);
      if (auth instanceof Response) return auth;
    } else {
      const auth = await requireAdmin(c);
      if (auth instanceof Response) return auth;
    }
    const userId = c.req.query('userId');
    const status = c.req.query('status');
    const role = c.req.query('role');

    let disputeIds: string[] = [];

    if (role === 'admin') {
      const all = await kv.getByPrefix('dispute:dispute_');
      const disputes = all.map((d: any) => (typeof d === 'object' && d.value ? d.value : d)).filter(Boolean);
      disputes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return c.json({ disputes });
    }

    if (status) {
      const keys = await kv.getByPrefix(`dispute:status:${status}`);
      disputeIds = keys.map((k: any) => (typeof k === 'string' ? k : k.value)).filter(Boolean);
    } else if (userId) {
      const submittedKeys = await kv.getByPrefix(`dispute:submittedBy:${userId}`);
      const againstKeys = await kv.getByPrefix(`dispute:submittedAgainst:${userId}`);
      const sIds = submittedKeys.map((k: any) => (typeof k === 'string' ? k : k.value)).filter(Boolean);
      const aIds = againstKeys.map((k: any) => (typeof k === 'string' ? k : k.value)).filter(Boolean);
      disputeIds = [...new Set([...sIds, ...aIds])];
    }

    const disputes = (
      await Promise.all(disputeIds.map((id: string) => kv.get(`dispute:${id}`)))
    ).filter(Boolean);

    disputes.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ disputes });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return c.json({ error: 'Failed to fetch disputes', details: String(error) }, 500);
  }
});

// PATCH /disputes/:disputeId — Update dispute (admin)
app.patch('/disputes/:disputeId', async (c) => {
  try {
    const auth = await requireAdmin(c);
    if (auth instanceof Response) return auth;
    const { disputeId } = c.req.param();
    const body = await c.req.json();
    const { status, outcome, outcomeDetails, assignedTo, note } = body;

    const dispute = await kv.get(`dispute:${disputeId}`);
    if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

    const oldStatus = dispute.status;

    if (status) {
      dispute.status = status;
      if (status === 'resolved' || status === 'closed') {
        dispute.resolvedAt = new Date().toISOString();
      }
    }
    if (outcome) dispute.outcome = outcome;
    if (outcomeDetails) dispute.outcomeDetails = outcomeDetails;
    if (assignedTo) dispute.assignedTo = assignedTo;
    if (note) {
      dispute.notes = dispute.notes || [];
      dispute.notes.push({
        text: note,
        addedBy: body.addedBy || 'admin',
        addedAt: new Date().toISOString(),
      });
    }

    dispute.lastUpdated = new Date().toISOString();
    await kv.set(`dispute:${disputeId}`, dispute);

    if (status && status !== oldStatus) {
      await kv.del(`dispute:status:${oldStatus}:${disputeId}`);
      await kv.set(`dispute:status:${status}:${disputeId}`, disputeId);
    }

    if (status && status !== oldStatus) {
      await logAuditEvent({
        userId: dispute.submittedAgainst || dispute.submittedBy,
        adminId: auth as string,
        action: status === 'resolved' || status === 'closed' ? 'dispute_resolved' : 'dispute_status_changed',
        category: 'disputes',
        description: `Dispute ${disputeId} ${oldStatus} → ${status}${outcome ? ` (outcome: ${outcome})` : ''}`,
        metadata: { disputeId, oldStatus, newStatus: status, outcome, outcomeDetails },
      });
    }

    // A dispute tied to a specific session holds that session's earnings —
    // see hasOpenDisputeForBooking in payment-routes.tsx, checked by both
    // processSessionAttendance and the grace-period sweep. Once resolved
    // with a payout-relevant outcome, act on it immediately rather than
    // leaving the tutor to wonder whether the freeze ever lifts.
    let attendanceResult: { released: boolean; amount?: number; reason?: string } | null = null;
    if (
      dispute.sessionId &&
      (status === 'resolved' || status === 'closed') &&
      (outcome === 'session-confirmed-release-earnings' || outcome === 'no-show-confirmed-withhold-earnings')
    ) {
      try {
        const booking = await db.getBooking(dispute.sessionId);
        if (booking) {
          attendanceResult = await processSessionAttendance(
            dispute.sessionId,
            booking.tutorId,
            outcome === 'session-confirmed-release-earnings',
          );
        }
      } catch (e: any) {
        console.warn('Dispute resolution: processSessionAttendance failed (non-fatal):', e.message);
      }
    }

    return c.json({ success: true, dispute, attendanceResult });
  } catch (error) {
    return c.json({ error: 'Failed to update dispute', details: String(error) }, 500);
  }
});

// POST /disputes/:disputeId/evidence — Add evidence
app.post('/disputes/:disputeId/evidence', async (c) => {
  try {
    const callerId = await verifyUser(c);
    if (!callerId) return c.json({ error: 'Unauthorized' }, 401);
    const { disputeId } = c.req.param();
    const { type, description, url } = await c.req.json();

    const dispute = await kv.get(`dispute:${disputeId}`);
    if (!dispute) return c.json({ error: 'Dispute not found' }, 404);

    dispute.evidence = dispute.evidence || [];
    dispute.evidence.push({
      id: `evidence_${Date.now()}`,
      type,
      description,
      url,
      addedAt: new Date().toISOString(),
    });

    await kv.set(`dispute:${disputeId}`, dispute);
    return c.json({ success: true, dispute });
  } catch (error) {
    return c.json({ error: 'Failed to add evidence', details: String(error) }, 500);
  }
});

export default app;
