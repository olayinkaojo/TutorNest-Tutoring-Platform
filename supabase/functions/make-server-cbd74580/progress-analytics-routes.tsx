import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { createNotification } from './notification-broker.tsx';
import { isAdmin } from './route-auth.tsx';

// None of these endpoints previously checked anything beyond "is the
// caller some valid authenticated user" — never that they were actually
// the tutor/student/parent/admin the requested data belongs to. Any
// logged-in user could read another family's session reports/progress or
// another tutor's private coaching feedback by swapping the URL's id.

async function resolveBooking(bookingId: string): Promise<any | null> {
  const kvBooking = await kv.get(`booking:${bookingId}`) as any;
  if (kvBooking) return kvBooking;
  return await db.getBooking(bookingId).catch(() => null);
}

function isBookingParticipant(booking: any, userId: string): boolean {
  const parentId = booking.userId ?? booking.parentId;
  return booking.tutorId === userId || booking.studentId === userId || parentId === userId;
}

async function canViewStudentData(callerId: string, studentId: string): Promise<boolean> {
  if (callerId === studentId) return true;
  if (await isAdmin(callerId)) return true;
  const child = await kv.get(`child:${studentId}`) as any;
  if (child?.parentId === callerId) return true;
  // Also allow a tutor who has actually had this student — the data being
  // viewed is built entirely from that tutor's own session reports.
  const dbBookings = await db.getBookingsByStudentId(studentId).catch(() => []);
  if (dbBookings.some((b: any) => b.tutorId === callerId)) return true;
  const kvBookings = await kv.getByPrefix('booking:').catch(() => []) as any[];
  return kvBookings.some((b: any) => b.studentId === studentId && b.tutorId === callerId);
}

export const progressAnalyticsRoutes = (app: Hono, getUserId: Function) => {

  // Get or create session report
  app.get('/make-server-cbd74580/reports/:bookingId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const bookingId = c.req.param('bookingId');
      const report = await kv.get(`report:${bookingId}`) as any;

      // Prefer the booking as the source of truth for who's allowed to see
      // this, falling back to the report's own tutorId/studentId/parentId
      // (which the real report-creation endpoint — reports-notifications-
      // routes.tsx — stores directly on the record) if the booking can't
      // be resolved for some reason.
      const booking = await resolveBooking(bookingId);
      const participant = booking
        ? isBookingParticipant(booking, userId)
        : report
        ? (report.tutorId === userId || report.studentId === userId || report.parentId === userId)
        : true; // nothing to protect if neither exists
      if (!participant && !(await isAdmin(userId))) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      return c.json({ report: report || null });
    } catch (error: any) {
      console.error('Error fetching report:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Submit post-session report
  app.post('/make-server-cbd74580/reports', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const reportData = await c.req.json();
      const { bookingId, topicsCovered, strengths, areasForImprovement, homework, studentEngagement, progressRating, additionalNotes } = reportData;

      // Get booking details
      const booking = await kv.get(bookingId) as any;
      if (!booking) {
        return c.json({ error: 'Booking not found' }, 404);
      }

      // Check if tutor is authorized
      if (booking.tutorId !== userId) {
        return c.json({ error: 'Unauthorized to submit report for this session' }, 403);
      }

      // Check if report already locked
      const existingReport = await kv.get(`report:${bookingId}`) as any;
      if (existingReport && (existingReport.lockedAt || existingReport.viewedByParent)) {
        return c.json({ error: 'Report is locked and cannot be modified' }, 403);
      }

      const report = {
        id: `report:${bookingId}`,
        bookingId,
        tutorId: userId,
        studentId: booking.studentId,
        sessionDate: booking.date,
        topicsCovered,
        strengths,
        areasForImprovement,
        homework,
        studentEngagement,
        progressRating,
        additionalNotes,
        completedAt: new Date().toISOString(),
        lockedAt: null,
        viewedByParent: false,
        parentViewedAt: null,
      };

      await kv.set(`report:${bookingId}`, report);

      // Create notification for parent
      await createNotification(kv, {
        userId: booking.parentId,
        type: 'session_report',
        title: 'New Session Report Available',
        message: `${booking.tutorName} has completed a report for ${booking.studentName}'s session.`,
        data: { bookingId, reportId: report.id },
      });

      // Schedule auto-lock after 48 hours
      const lockTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      report.scheduledLockTime = lockTime;
      await kv.set(`report:${bookingId}`, report);

      return c.json({ report });
    } catch (error: any) {
      console.error('Error submitting report:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Mark report as viewed by parent (locks it)
  app.post('/make-server-cbd74580/reports/:bookingId/view', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const bookingId = c.req.param('bookingId');
      const report = await kv.get(`report:${bookingId}`) as any;

      if (!report) {
        return c.json({ error: 'Report not found' }, 404);
      }

      // Mark as viewed and lock
      report.viewedByParent = true;
      report.parentViewedAt = new Date().toISOString();
      report.lockedAt = new Date().toISOString();

      await kv.set(`report:${bookingId}`, report);

      return c.json({ report });
    } catch (error: any) {
      console.error('Error marking report as viewed:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get student progress overview
  app.get('/make-server-cbd74580/progress/:studentId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const studentId = c.req.param('studentId');
      if (!(await canViewStudentData(userId, studentId))) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      // Bookings created via the real (plan-based) payment flow live in
      // Postgres — the free single-session booking endpoint that used to
      // write kv `booking:*` records has been disabled, so that prefix
      // scan alone misses every real booking made since. Legacy KV
      // bookings (if any remain) are still merged in.
      const dbBookings = await db.getBookingsByStudentId(studentId).catch(() => []);
      const allBookings = await kv.getByPrefix('booking:');
      const kvBookingsForStudent = allBookings.filter((b: any) => b.studentId === studentId && !dbBookings.some((d: any) => d.id === b.id));
      const studentBookings = [...dbBookings, ...kvBookingsForStudent];

      // Get all reports for student
      const allReports = await kv.getByPrefix('report:');
      const studentReports = allReports.filter((r: any) => r.studentId === studentId);

      // Calculate metrics
      const sessionsAttended = studentBookings.filter((b: any) => b.status === 'completed').length;
      const totalSessions = studentBookings.length;
      const attendanceRate = totalSessions > 0 ? Math.round((sessionsAttended / totalSessions) * 100) : 0;

      // Extract topics
      const allTopicsCovered = studentReports.flatMap((r: any) => r.topicsCovered || []);
      const topicFrequency: { [key: string]: number } = {};
      allTopicsCovered.forEach((topic: string) => {
        topicFrequency[topic] = (topicFrequency[topic] || 0) + 1;
      });

      // Topics mastered (covered 3+ times)
      const topicsMastered = Object.keys(topicFrequency).filter(topic => topicFrequency[topic] >= 3);
      // Current topics (covered 1-2 times)
      const currentTopics = Object.keys(topicFrequency).filter(topic => topicFrequency[topic] < 3 && topicFrequency[topic] > 0);

      // Calculate average ratings
      const engagementScores = studentReports.map((r: any) => r.studentEngagement || 0).filter((s: number) => s > 0);
      const progressScores = studentReports.map((r: any) => r.progressRating || 0).filter((s: number) => s > 0);
      
      const averageEngagement = engagementScores.length > 0 
        ? engagementScores.reduce((a: number, b: number) => a + b, 0) / engagementScores.length 
        : 0;
      const averageProgress = progressScores.length > 0 
        ? progressScores.reduce((a: number, b: number) => a + b, 0) / progressScores.length 
        : 0;

      // Feedback trends (last 10 sessions)
      const feedbackTrends = studentReports
        .sort((a: any, b: any) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
        .slice(-10)
        .map((r: any) => ({
          date: r.sessionDate,
          engagement: r.studentEngagement || 0,
          progress: r.progressRating || 0,
        }));

      // Recent reports (last 5)
      const recentReports = studentReports
        .sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
        .slice(0, 5)
        .map((r: any) => {
          const booking = studentBookings.find((b: any) => b.id === r.bookingId);
          return {
            id: r.id,
            date: r.sessionDate,
            tutorName: booking?.tutorName || 'Unknown',
            subject: booking?.subject || 'General',
            topicsCovered: r.topicsCovered || [],
            strengths: r.strengths || [],
            engagement: r.studentEngagement || 0,
            progress: r.progressRating || 0,
          };
        });

      // Performance by subject
      const subjectGroups: { [key: string]: any } = {};
      studentBookings.forEach((b: any) => {
        const subject = b.subject || 'General';
        if (!subjectGroups[subject]) {
          subjectGroups[subject] = { sessions: 0, totalRating: 0, topicsCovered: new Set() };
        }
        subjectGroups[subject].sessions++;
        
        const report = studentReports.find((r: any) => r.bookingId === b.id);
        if (report) {
          subjectGroups[subject].totalRating += report.progressRating || 0;
          (report.topicsCovered || []).forEach((t: string) => subjectGroups[subject].topicsCovered.add(t));
        }
      });

      const performanceBySubject = Object.keys(subjectGroups).map(subject => ({
        subject,
        sessions: subjectGroups[subject].sessions,
        avgRating: subjectGroups[subject].sessions > 0 
          ? subjectGroups[subject].totalRating / subjectGroups[subject].sessions 
          : 0,
        topicsCovered: subjectGroups[subject].topicsCovered.size,
      }));

      // Improvement areas (most mentioned)
      const allImprovements = studentReports.flatMap((r: any) => r.areasForImprovement || []);
      const improvementFrequency: { [key: string]: number } = {};
      allImprovements.forEach((area: string) => {
        improvementFrequency[area] = (improvementFrequency[area] || 0) + 1;
      });
      const improvementAreas = Object.entries(improvementFrequency)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
        .map(([area]) => area);

      const progressData = {
        sessionsAttended,
        totalSessions,
        attendanceRate,
        topicsMastered,
        currentTopics,
        averageEngagement,
        averageProgress,
        feedbackTrends,
        recentReports,
        performanceBySubject,
        improvementAreas,
      };

      return c.json(progressData);
    } catch (error: any) {
      console.error('Error fetching progress data:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Export progress to PDF
  app.get('/make-server-cbd74580/progress/:studentId/export', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      const studentId = c.req.param('studentId');
      if (!(await canViewStudentData(userId, studentId))) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      // In production, generate actual PDF
      // For now, return mock data
      const pdfContent = 'Mock PDF content for progress report';
      
      return new Response(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="progress-report.pdf"`,
        },
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get tutor performance data
  app.get('/make-server-cbd74580/tutor-performance/:tutorId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const tutorId = c.req.param('tutorId');
      if (userId !== tutorId && !(await isAdmin(userId))) {
        return c.json({ error: 'Forbidden' }, 403);
      }

      // Same stale-store fix as /progress/:studentId above — the free
      // single-session booking endpoint that used to write kv `booking:*`
      // records was disabled a while ago, so this prefix scan alone has
      // been missing every real (plan-based) booking since. This is the
      // live endpoint real tutors see (TutorPerformanceDashboard.tsx,
      // AdvancedReporting.tsx) — it's been showing zero/stale numbers for
      // any booking made since that endpoint was disabled.
      const dbBookings = await db.getBookingsByTutorId(tutorId).catch(() => []);
      const allBookings = await kv.getByPrefix('booking:');
      const kvBookingsForTutor = allBookings.filter((b: any) => b.tutorId === tutorId && !dbBookings.some((d: any) => d.id === b.id));
      const tutorBookings = [...dbBookings, ...kvBookingsForTutor];

      // Get all reports by tutor
      const allReports = await kv.getByPrefix('report:');
      const tutorReports = allReports.filter((r: any) => r.tutorId === tutorId);

      // Get tutor reviews
      const allReviews = await kv.getByPrefix('review:');
      const tutorReviews = allReviews.filter((r: any) => r.tutorId === tutorId);

      // Calculate metrics
      const totalSessions = tutorBookings.filter((b: any) => b.status === 'completed').length;
      const activeStudents = new Set(tutorBookings.map((b: any) => b.studentId)).size;

      // Average rating
      const ratings = tutorReviews.map((r: any) => r.rating || 0).filter((r: number) => r > 0);
      const averageRating = ratings.length > 0
        ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        : 0;
      const totalReviews = ratings.length;

      // On-time start percentage. `actualStartTime` is never written
      // anywhere in this codebase (confirmed by audit) — this used to
      // default to a hardcoded 100 whenever sessionsWithTime was empty,
      // which given that field is never populated meant every tutor was
      // always shown as perfectly punctual regardless of reality. Return
      // null (no real data) instead of fabricating a number — the
      // frontend now shows "Not enough data yet" for this.
      const sessionsWithTime = tutorBookings.filter((b: any) => b.actualStartTime);
      const onTimeSessions = sessionsWithTime.filter((b: any) => {
        const scheduled = new Date(`${b.date}T${b.startTime}+01:00`).getTime();
        const actual = new Date(b.actualStartTime).getTime();
        return Math.abs(actual - scheduled) <= 5 * 60 * 1000; // Within 5 minutes
      });
      const onTimeStartPercentage = sessionsWithTime.length > 0
        ? Math.round((onTimeSessions.length / sessionsWithTime.length) * 100)
        : null;

      // Re-booking rate
      const studentBookingCounts: { [key: string]: number } = {};
      tutorBookings.forEach((b: any) => {
        studentBookingCounts[b.studentId] = (studentBookingCounts[b.studentId] || 0) + 1;
      });
      const studentsWithMultipleBookings = Object.values(studentBookingCounts).filter((count: any) => count > 1).length;
      const totalStudents = Object.keys(studentBookingCounts).length;
      const rebookingRate = totalStudents > 0
        ? Math.round((studentsWithMultipleBookings / totalStudents) * 100)
        : 0;

      // Report completion rate. Two real bugs here, not just a timezone
      // skew: (1) report.completedAt doesn't exist on a real report
      // record — the live report-creation endpoint (reports-notifications-
      // routes.tsx) stores `submittedAt` — so this was computing
      // `NaN - sessionEnd`, which is never <= anything, so a report was
      // NEVER counted as on-time no matter how promptly it was filed.
      // (2) `new Date(b.date)` parses a bare YYYY-MM-DD as UTC midnight
      // (1am WAT) rather than the session's real WAT start time, which
      // for an afternoon session understated how much of the 48h window
      // had elapsed by ~12-14 hours on top of bug (1).
      const completedSessions = tutorBookings.filter((b: any) => b.status === 'completed');
      const sessionsWithReports = completedSessions.filter((b: any) => {
        const report = tutorReports.find((r: any) => r.bookingId === b.id);
        if (!report) return false;
        const sessionEnd = new Date(`${b.date}T${b.startTime}+01:00`).getTime() + (b.duration || 60) * 60 * 1000;
        const reportTime = new Date(report.submittedAt || report.completedAt).getTime();
        return (reportTime - sessionEnd) <= 48 * 60 * 60 * 1000;
      });
      const reportCompletionRate = completedSessions.length > 0
        ? Math.round((sessionsWithReports.length / completedSessions.length) * 100)
        : 100;

      // Response time (mock - in production, track actual message response times)
      const responseTime = 15; // minutes

      // Rating trend (last 10 reviews)
      const ratingTrend = tutorReviews
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-10)
        .map((r: any) => ({
          date: r.createdAt,
          rating: r.rating || 0,
        }));

      // Strengths, pulled from the tutor's own post-session report notes
      // (report.strengths — a free-text field, not tags). Note: this is
      // NOT frequency-aggregated like improvementAreas below is, on
      // purpose — strengths/areasForImprovement are freeform paragraphs,
      // so counting exact-string repeats would mostly just return each
      // one once anyway (rarely typed identically twice) and misleadingly
      // imply a "most common" ranking that doesn't really apply to prose.
      // Most recent distinct notes, newest first, is the honest version.
      const strengths = Array.from(
        new Set(
          tutorReports
            .filter((r: any) => r.strengths?.trim())
            .sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
            .map((r: any) => r.strengths.trim())
        )
      ).slice(0, 5);

      // Improvement areas based on metrics. onTimeStartPercentage can be
      // null (no real attendance-timing data) — `null < 95` is true in JS
      // (null coerces to 0), so this must check for a real number first
      // or every tutor would get flagged for punctuality with zero
      // evidence either way.
      const improvementAreas: string[] = [];
      if (onTimeStartPercentage !== null && onTimeStartPercentage < 95) {
        improvementAreas.push('Improve punctuality for session starts');
      }
      if (reportCompletionRate < 95) {
        improvementAreas.push('Complete post-session reports more promptly');
      }
      if (rebookingRate < 80) {
        improvementAreas.push('Focus on building stronger student relationships');
      }

      // Coaching tips based on performance
      const coachingTips: any[] = [];
      
      if (averageRating < 4.5) {
        coachingTips.push({
          id: 'tip-rating',
          category: 'Student Satisfaction',
          tip: 'Ask for feedback during sessions and adapt your teaching style. Consider using more interactive activities.',
          priority: 'high',
          relatedMetric: 'Rating',
        });
      }

      if (onTimeStartPercentage !== null && onTimeStartPercentage < 95) {
        coachingTips.push({
          id: 'tip-punctuality',
          category: 'Punctuality',
          tip: 'Set reminders 15 minutes before sessions. Punctuality builds trust and shows professionalism.',
          priority: onTimeStartPercentage < 85 ? 'high' : 'medium',
          relatedMetric: 'On-Time Start',
        });
      }

      if (reportCompletionRate < 95) {
        coachingTips.push({
          id: 'tip-reports',
          category: 'Communication',
          tip: 'Complete reports immediately after sessions while details are fresh. Use templates to save time.',
          priority: reportCompletionRate < 85 ? 'high' : 'medium',
          relatedMetric: 'Report Completion',
        });
      }

      if (rebookingRate < 80) {
        coachingTips.push({
          id: 'tip-retention',
          category: 'Student Retention',
          tip: 'Build rapport by showing genuine interest in student progress. Follow up between sessions with encouragement.',
          priority: rebookingRate < 60 ? 'high' : 'medium',
          relatedMetric: 'Re-booking Rate',
        });
      }

      if (coachingTips.length === 0) {
        coachingTips.push({
          id: 'tip-excellence',
          category: 'Continued Excellence',
          tip: 'You\'re performing exceptionally! Consider mentoring newer tutors or creating lesson templates to share.',
          priority: 'low',
          relatedMetric: 'Overall Performance',
        });
      }

      const performanceData = {
        averageRating,
        totalReviews,
        onTimeStartPercentage,
        rebookingRate,
        reportCompletionRate,
        totalSessions,
        activeStudents,
        responseTime,
        ratingTrend,
        strengths,
        improvementAreas,
        coachingTips,
      };

      return c.json(performanceData);
    } catch (error: any) {
      console.error('Error fetching tutor performance:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};
