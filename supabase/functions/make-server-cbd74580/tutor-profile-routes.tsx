import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

export const tutorProfileRoutes = (app: Hono, getUserId: Function) => {
  // Get tutor reviews
  app.get('/make-server-cbd74580/tutors/:tutorId/reviews', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tutorId = c.req.param('tutorId');

      // Get all reviews for this tutor from KV store
      const allReviews = await kv.getByPrefix('review:');
      const tutorReviews = allReviews
        .filter((r: any) => r.tutorId === tutorId)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

      // Get all bookings for this tutor to calculate stats
      const allBookings = await kv.getByPrefix('booking:');
      const tutorBookings = allBookings.filter((b: any) => b.tutorId === tutorId && b.status === 'completed');

      // Get all reviews to calculate rating
      const allReviews = await kv.getByPrefix('review:');
      const tutorReviews = allReviews.filter((r: any) => r.tutorId === tutorId);

      // Get unique students
      const studentIds = new Set(tutorBookings.map((b: any) => b.userId));
      const studentCount = studentIds.size;

      // Calculate totals
      const totalLessons = tutorBookings.length;
      const hoursTeaching = totalLessons * 1; // Assuming 1 hour per lesson (can be customized)
      const averageRating = tutorReviews.length > 0
        ? (tutorReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / tutorReviews.length).toFixed(1)
        : '5.0';

      return c.json({
        studentCount,
        totalLessons,
        hoursTeaching,
        averageRating,
        reviewCount: tutorReviews.length,
        responseRate: tutor.responseRate || 95,
        joinedDate: tutor.createdAt,
      });
    } catch (error: any) {
      console.error('Error fetching tutor stats:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Create a review
  app.post('/make-server-cbd74580/tutors/:tutorId/reviews', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tutorId = c.req.param('tutorId');
      const { rating, comment, bookingId, subject } = await c.req.json();

      if (!rating || rating < 1 || rating > 5) {
        return c.json({ error: 'Invalid rating' }, 400);
      }

      if (!comment || comment.trim().length === 0) {
        return c.json({ error: 'Comment is required' }, 400);
      }

      // Get student name
      const student = await kv.get(`user:${userId}`) as any;
      const studentName = student?.firstName ? `${student.firstName} ${student.lastName || ''}` : 'Anonymous';

      // Create review
      const review = {
        id: `review:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tutorId,
        studentId: userId,
        studentName,
        bookingId,
        subject,
        rating,
        comment,
        date: new Date().toISOString(),
      };

      await kv.set(review.id, review);

      // Notify tutor
      const notification = {
        id: `notification:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: tutorId,
        type: 'review',
        title: 'New Review Received',
        message: `${studentName} left a ${rating}-star review: "${comment.substring(0, 50)}..."`,
        data: { reviewId: review.id },
        read: false,
        priority: 'medium',
        createdAt: new Date().toISOString(),
      };
      await kv.set(notification.id, notification);

      return c.json({ review });
    } catch (error: any) {
      console.error('Error creating review:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};
