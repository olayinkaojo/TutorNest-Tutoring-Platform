import { Hono } from 'npm:hono@4';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const tutorSearchRoutes = new Hono();

// Duplicated from index.ts — shared helper
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Duplicated from index.ts — shared helper
const getUserId = async (accessToken: string | null): Promise<string | null> => {
  if (!accessToken) return null;

  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;
    return user.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('getUserId: token verification failed:', msg);
    return null;
  }
};

// Search tutors with filters
tutorSearchRoutes.get('/search/tutors', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);

    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const keyword = c.req.query('keyword') || '';
    const subject = c.req.query('subject') || '';
    const level = c.req.query('level') || '';
    const availability = c.req.query('availability') || '';
    const minPrice = parseFloat(c.req.query('minPrice') || '0');
    const maxPrice = parseFloat(c.req.query('maxPrice') || '10000');
    const minRating = parseFloat(c.req.query('minRating') || '0');
    const dbsRequired = c.req.query('dbsRequired') === 'true';

    // Get all tutors (removed verification status filter to make all tutors live and visible)
    const allUsers = await kv.getByPrefix('user:');
    let tutors = allUsers.filter((user: any) =>
      user.role === 'tutor'
    );

    // tutor.rating on the raw KV profile is never written by anything — real
    // reviews update a separate cache (tutor:rating:<id>, see
    // updateTutorRating in reviews-disputes-routes.tsx) that this endpoint
    // never read. Every tutor showed whatever rating.rating happened to be
    // seeded at signup (usually nothing, falling back to a flat "5.0"),
    // completely disconnected from actual submitted reviews — overwrite it
    // with the real number before anything below filters or sorts by it.
    tutors = await Promise.all(tutors.map(async (tutor: any) => {
      const tutorId = tutor.id ?? tutor.userId;
      const stats = tutorId ? await kv.get(`tutor:rating:${tutorId}`) as any : null;
      return {
        ...tutor,
        rating: stats ? stats.averageRating : null,
        reviewCount: stats ? stats.totalReviews : 0,
      };
    }));

    // Apply filters
    if (keyword) {
      const keywordLower = keyword.toLowerCase();
      tutors = tutors.filter((tutor: any) =>
        tutor.firstName?.toLowerCase().includes(keywordLower) ||
        tutor.lastName?.toLowerCase().includes(keywordLower) ||
        tutor.bio?.toLowerCase().includes(keywordLower) ||
        tutor.subjects?.some((s: string) => s.toLowerCase().includes(keywordLower))
      );
    }

    if (subject) {
      tutors = tutors.filter((tutor: any) =>
        tutor.subjects?.includes(subject)
      );
    }

    if (level) {
      tutors = tutors.filter((tutor: any) =>
        tutor.yearGroups?.includes(level)
      );
    }

    if (availability) {
      tutors = tutors.filter((tutor: any) =>
        tutor.availability === availability || tutor.availability === 'flexible'
      );
    }

    tutors = tutors.filter((tutor: any) => {
      const rate = parseFloat(tutor.hourlyRate || '0');
      return rate >= minPrice && rate <= maxPrice;
    });

    if (minRating > 0) {
      // tutor.rating was overwritten above with the real cached average (or
      // null when a tutor has no reviews yet) — defaulting a missing rating
      // to '5' here meant an unrated, unproven tutor passed every minimum-
      // rating filter as if verified excellent. Default to 0 instead: no
      // reviews yet genuinely doesn't meet a stated minimum.
      tutors = tutors.filter((tutor: any) =>
        parseFloat(tutor.rating ?? '0') >= minRating
      );
    }

    if (dbsRequired) {
      tutors = tutors.filter((tutor: any) =>
        tutor.dbsStatus === 'verified'
      );
    }

    // Sort by rating (descending) and response rate
    tutors.sort((a: any, b: any) => {
      const ratingA = parseFloat(a.rating || '0');
      const ratingB = parseFloat(b.rating || '0');
      return ratingB - ratingA;
    });

    return c.json({ tutors, count: tutors.length });
  } catch (error: any) {
    console.error('Error searching tutors:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// A second, simpler match-scoring implementation used to live here at
// POST /search/recommendations — a separate, disconnected scoring engine
// from the real one in smart-matching-routes.tsx (GET /match/student/:id),
// which the same screen (ParentDashboard.tsx's "Try Smart Match" toggle)
// already offers side by side with this one. Two engines meant a parent
// could see two different match scores for the same tutor depending which
// toggle they clicked. It's removed rather than fixed in place: nothing
// live ever called it (ParentDashboard.tsx never actually passed the
// studentProfile prop TutorSearch.tsx needed to trigger the request, so the
// "Recommended Match" badge it powered was permanently inert), and
// consolidating onto the one real engine is better than maintaining two.
// See smart-matching-routes.tsx for the current Smart Match implementation.

export { tutorSearchRoutes };
