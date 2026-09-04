import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';

export const tutorProfileRoutes = (app: Hono, getUserId: Function) => {
  // Get tutor reviews — reads the same records reviews-disputes-routes.tsx's
  // POST /reviews writes (review:<id>, indexed at review:tutor:<tutorId>:<id>).
  // Real review objects use `sessionDate`, not `date` — this used to read
  // `r.date` (undefined on every real review) and sort/display "Invalid
  // Date" for every one of them, which is a big part of why reviews looked
  // broken on a tutor's public profile even though submitting one worked.
  app.get('/make-server-cbd74580/tutors/:tutorId/reviews', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tutorId = c.req.param('tutorId');

      const indexKeys = await kv.getByPrefix(`review:tutor:${tutorId}`);
      const reviewIds = indexKeys
        .map((k: any) => (typeof k === 'string' ? k : k.value ?? k.key?.split(':').pop()))
        .filter(Boolean);
      const tutorReviews = (
        await Promise.all(reviewIds.map((id: string) => kv.get(`review:${id}`)))
      )
        .filter(Boolean)
        .map((r: any) => ({ ...r, date: r.sessionDate || r.createdAt || r.date }))
        .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      return c.json({ reviews: tutorReviews });
    } catch (error: any) {
      console.error('Error fetching tutor reviews:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get tutor stats
  app.get('/make-server-cbd74580/tutors/:tutorId/stats', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tutorId = c.req.param('tutorId');

      // Get tutor profile
      const tutor = await kv.get(`user:${tutorId}`) as any;
      if (!tutor) {
        return c.json({ error: 'Tutor not found' }, 404);
      }

      // Bookings only came from KV here, but the live plan-based booking
      // flow (the only one actually in use) lives in Postgres — every real
      // tutor showed close to 0 lessons/students taught on their own public
      // profile. Merge both, same pattern used everywhere else this KV/DB
      // split shows up.
      const [kvBookings, dbBookings] = await Promise.all([
        kv.getByPrefix('booking:'),
        db.getBookingsByTutorId(tutorId).catch(() => []),
      ]);
      const kvIds = new Set(kvBookings.map((b: any) => b.id));
      const tutorBookings = [
        ...kvBookings.filter((b: any) => b.tutorId === tutorId && b.status === 'completed'),
        ...dbBookings.filter((b) => !kvIds.has(b.id) && b.status === 'completed'),
      ];

      // Real aggregate, kept in sync by every review write (see
      // updateTutorRating in reviews-disputes-routes.tsx) — rather than a
      // second, separately-maintained average that could drift from it.
      const ratingStats = (await kv.get(`tutor:rating:${tutorId}`)) as any;

      // Get unique students
      const studentIds = new Set(tutorBookings.map((b: any) => b.userId ?? b.user_id));
      const studentCount = studentIds.size;

      // Calculate totals
      const totalLessons = tutorBookings.length;
      const hoursTeaching = totalLessons * 1; // Assuming 1 hour per lesson (can be customized)
      const averageRating = ratingStats ? ratingStats.averageRating.toFixed(1) : '5.0';

      return c.json({
        studentCount,
        totalLessons,
        hoursTeaching,
        averageRating,
        reviewCount: ratingStats?.totalReviews ?? 0,
        responseRate: tutor.responseRate || 95,
        joinedDate: tutor.createdAt,
      });
    } catch (error: any) {
      console.error('Error fetching tutor stats:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // A second, separate "create a review" endpoint used to live here — no
  // duplicate-prevention, didn't refresh the tutor:rating cache, and had no
  // caller anywhere in the app. The real one is POST /reviews in
  // reviews-disputes-routes.tsx (used by RateSessionDialog.tsx). Removed
  // rather than left as a second, weaker way to write the same data.
};
