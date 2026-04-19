import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

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
      const notification = {
        id: `notification:${Date.now()}`,
        userId: booking.parentId,
        type: 'session_report',
        title: 'New Session Report Available',
        message: `${booking.tutorName} has completed a report for ${booking.studentName}'s session.`,
        data: { bookingId, reportId: report.id },
        read: false,
        createdAt: new Date().toISOString(),
      };
      await kv.set(notification.id, notification);

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

      // Get all bookings for student
      const allBookings = await kv.getByPrefix('booking:');
      const studentBookings = allBookings.filter((b: any) => b.studentId === studentId);

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

      // Get all bookings for tutor
      const allBookings = await kv.getByPrefix('booking:');
      const tutorBookings = allBookings.filter((b: any) => b.tutorId === tutorId);

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

      // On-time start percentage
      const sessionsWithTime = tutorBookings.filter((b: any) => b.actualStartTime);
      const onTimeSessions = sessionsWithTime.filter((b: any) => {
        const scheduled = new Date(b.date).getTime();
        const actual = new Date(b.actualStartTime).getTime();
        return Math.abs(actual - scheduled) <= 5 * 60 * 1000; // Within 5 minutes
      });
      const onTimeStartPercentage = sessionsWithTime.length > 0 
        ? Math.round((onTimeSessions.length / sessionsWithTime.length) * 100) 
        : 100;

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

      // Report completion rate
      const completedSessions = tutorBookings.filter((b: any) => b.status === 'completed');
      const sessionsWithReports = completedSessions.filter((b: any) => {
        const report = tutorReports.find((r: any) => r.bookingId === b.id);
        if (!report) return false;
        // Check if completed within 48 hours
        const sessionEnd = new Date(b.date).getTime() + (b.duration || 60) * 60 * 1000;
        const reportTime = new Date(report.completedAt).getTime();
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

      // Strengths (from positive feedback)
      const strengths = [
        'Clear explanations and patient teaching style',
        'Excellent preparation and structured lessons',
        'Strong rapport with students',
      ];

      // Improvement areas based on metrics
      const improvementAreas: string[] = [];
      if (onTimeStartPercentage < 95) {
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

      if (onTimeStartPercentage < 95) {
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
