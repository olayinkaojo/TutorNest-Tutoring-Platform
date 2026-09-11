import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { processSessionAttendance } from './payment-routes.tsx';
import { createNotification as brokerCreateNotification } from './notification-broker.tsx';
import { collectBookingsForUser } from './messaging-access.tsx';
import { resolveProfiles, resolveName } from './profile-resolution.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

// Create a route handler function that can receive getUserId
/**
 * Batch-fetches the report:<bookingId> record for each given booking (if
 * one exists) and enriches it with tutor/student names + session details
 * pulled off the booking itself, since a report record doesn't carry those.
 * Shared by GET /my-session-reports and admin's per-user family overview
 * (admin-routes.tsx) — extracted so this exact resolution logic doesn't
 * drift the way it already had across three near-identical copies before
 * profile-resolution.tsx existed.
 */
export async function getReportsForBookings(bookings: any[]): Promise<any[]> {
  const bookingIds = bookings.map((b: any) => b.id).filter(Boolean);
  if (bookingIds.length === 0) return [];

  const reportValues = await kv.mget(bookingIds.map((id: string) => `report:${id}`));
  const bookingById = new Map(bookings.map((b: any) => [b.id, b]));

  const profileIds = bookings.flatMap((b: any) => [
    b.tutorId ?? b.tutor_id,
    b.studentId ?? b.student_id,
    b.userId ?? b.user_id ?? b.parentId,
  ]);
  const profileMap = await resolveProfiles(profileIds);

  const reports = bookingIds
    .map((id: string, i: number) => {
      const report = reportValues[i] as any;
      if (!report) return null;
      const booking: any = bookingById.get(id) || {};
      const tutorId = booking.tutorId ?? booking.tutor_id;
      const studentId = booking.studentId ?? booking.student_id;
      const parentId = booking.userId ?? booking.user_id ?? booking.parentId;
      return {
        ...report,
        bookingId: id,
        tutorId,
        studentId,
        parentId,
        tutorName: resolveName(profileMap, tutorId, 'Tutor'),
        studentName: resolveName(profileMap, studentId, 'Student'),
        subject: booking.subject,
        sessionDate: booking.date,
        startTime: booking.startTime ?? booking.start_time,
        endTime: booking.endTime ?? booking.end_time,
      };
    })
    .filter(Boolean) as any[];

  reports.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  return reports;
}

export function reportsNotificationsRoutes(app: Hono, getUserId: Function) {
  
// TEST ROUTE - Verify notifications endpoint is accessible
app.get('/make-server-cbd74580/notifications/test', async (c) => {
  console.log('=== NOTIFICATIONS TEST ENDPOINT CALLED ===');
  return c.json({
    success: true,
    message: 'Notifications endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Submit post-session report
app.post('/make-server-cbd74580/bookings/:bookingId/report', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Verify user and get their ID
    const currentUserId = await getUserId(accessToken);
    if (!currentUserId) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const reportData = await c.req.json() as Record<string, unknown>;

    // Validate report data
    const validationError = validateReportSubmission(reportData);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    // Get the booking — single-session bookings live in KV, plan bookings
    // (the flow BookingManager.tsx/PostSessionReport.tsx actually use today,
    // since GET /bookings?tutorId= sources from db.getBookingsByTutorId)
    // live in Postgres. This only ever checked KV, so submitting a report
    // for any real, live booking 404'd here.
    let booking: any = await kv.get(`booking:${bookingId}`);
    let isDbBooking = false;
    if (!booking) {
      const dbBooking = await db.getBooking(bookingId);
      if (dbBooking) { booking = dbBooking; isDbBooking = true; }
    }
    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Security: Verify that only the tutor for this booking can submit reports
    if (booking.tutorId !== currentUserId) {
      console.warn(`⚠️ Unauthorized report submission attempt - User ${currentUserId} tried to submit report for tutor ${booking.tutorId}`);
      return c.json({ error: 'Only the tutor assigned to this booking can submit reports' }, 403);
    }

    // DB bookings don't carry parentId/tutorName/studentName the way KV
    // booking objects do — the paying party is userId, and display names get
    // resolved below only where actually needed (best-effort, non-fatal).
    const parentId = isDbBooking ? booking.userId : booking.parentId;

    // Sanitize text fields to prevent XSS
    const sanitizedData = {
      ...reportData,
      summary: sanitizeReportText(reportData.summary as string),
      topicsCovered: reportData.topicsCovered ? sanitizeReportText(reportData.topicsCovered as string) : undefined,
      areasForImprovement: reportData.areasForImprovement ? sanitizeReportText(reportData.areasForImprovement as string) : undefined,
      homework: reportData.homework ? sanitizeReportText(reportData.homework as string) : undefined,
      nextSessionPlan: reportData.nextSessionPlan ? sanitizeReportText(reportData.nextSessionPlan as string) : undefined,
    };

    // Create report. tutorId/studentId/parentId are stored on the record
    // itself (not just derivable from the booking) because POST
    // /reports/:reportId/mark-viewed's ownership check
    // (report.studentId !== callerId && report.parentId !== callerId) reads
    // straight off the report — without these fields that check failed
    // unconditionally for every real report, so no caller could ever mark
    // one viewed, and the tutor "your report was viewed" notification
    // (which also reads report.tutorId) could never fire.
    const report = {
      ...sanitizedData,
      // These come after the spread, not before, so nothing in the
      // client's own request body can override the server-resolved values
      // used for later authorization checks.
      id: `report:${bookingId}`,
      bookingId,
      tutorId: booking.tutorId,
      studentId: booking.studentId,
      parentId,
      submittedAt: new Date().toISOString(),
    };

    await kv.set(`report:${bookingId}`, report);

    if (isDbBooking) {
      // DB bookings have no KV object to flag — the release/no-show status
      // flip below (via processSessionAttendance) is what marks this
      // resolved, so there's nothing to write back here.
    } else {
      // Update booking with report flag
      booking.hasReport = true;
      await kv.set(`booking:${bookingId}`, booking);
    }

    // This is the actual attendance signal payouts wait for — see
    // processSessionAttendance in payment-routes.tsx. studentAttended
    // defaults to true (matching the frontend form's default) unless
    // explicitly reported false. Only meaningful for plan-based (DB)
    // bookings — the KV single-session flow has no live release path to
    // hook into.
    let attendanceResult: { released: boolean; amount?: number; reason?: string } | null = null;
    if (isDbBooking) {
      const attended = reportData.studentAttended !== false;
      try {
        attendanceResult = await processSessionAttendance(bookingId, booking.tutorId, attended);
      } catch (e: any) {
        console.warn('processSessionAttendance failed (non-fatal, releaseMaturedEarnings will retry later):', e.message);
      }
    }

    // Notifications/emails are best-effort — a failure here shouldn't undo
    // the report (and, more importantly, the attendance/payout processing)
    // that already succeeded above.
    try {
      let tutorName = booking.tutorName;
      let studentName = booking.studentName;
      if (isDbBooking) {
        const resolveName = (p: any, fb: string): string =>
          p?.fullName || p?.full_name || p?.name ||
          (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) || fb;
        const [tutorProfile, studentProfile] = await Promise.all([
          db.getProfile(booking.tutorId).catch(() => null),
          db.getProfile(booking.studentId).catch(() => null),
        ]);
        tutorName = resolveName(tutorProfile, 'Your tutor');
        studentName = resolveName(studentProfile ?? await kv.get(`child:${booking.studentId}`).catch(() => null), 'the student');
      }

      // Create notification for parent
      await createNotification({
        userId: parentId,
        type: 'report',
        title: 'New Session Report',
        message: `${tutorName} has submitted a report for ${studentName}'s session.`,
        actionUrl: `#bookings-report-${bookingId}`,
        metadata: { bookingId, reportId: report.id }
      });

      // Create notification for student
      await createNotification({
        userId: booking.studentId,
        type: 'report',
        title: 'Session Report Submitted',
        message: `${tutorName} has submitted a report for your session.`,
        actionUrl: `#report-${bookingId}`,
        metadata: { bookingId, reportId: report.id }
      });

      // Send the parent a real email — this used to call a local
      // sendEmailNotification stub that only ever console.log'd, so a
      // report being submitted produced an in-app notification but no
      // actual email (removed that stub now that this calls the real
      // sendEmail/emailTemplates pipeline instead). Includes a review CTA
      // per Olayinka's request: the most natural moment to ask a parent to
      // rate the session is right when they're told it's done and there's
      // something to read.
      const parentProfileMap = await resolveProfiles([parentId]);
      const parentProfile = parentProfileMap[parentId];
      const parentEmail = parentProfile?.email;
      if (parentEmail) {
        const parentName = resolveName(parentProfileMap, parentId, 'there');
        const appUrl = Deno.env.get('VITE_APP_URL') || Deno.env.get('FRONTEND_URL') || 'https://app.knowledgefonsacademy.com';
        const formattedDate = booking.date
          ? new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : '';
        const engagementLabels: Record<string, string> = {
          excellent: 'Excellent',
          good: 'Good',
          satisfactory: 'Satisfactory',
          needs_improvement: 'Needs Improvement',
        };
        const engagementLabel = engagementLabels[report.studentEngagement as string] || 'Not specified';
        const tpl = emailTemplates.sessionReportNotification(
          parentName,
          tutorName,
          studentName,
          booking.subject || booking.notes || 'Tutoring session',
          formattedDate,
          engagementLabel,
          `${appUrl}/dashboard/parent/session-reports`,
          `${appUrl}/dashboard/parent/reviews`,
        );
        await sendEmail({ to: parentEmail, ...tpl }).catch((e) => console.warn('session report email (parent):', e));
      }
    } catch (e: any) {
      console.warn('Report notification/email (non-fatal):', e.message);
    }

    return c.json({
      success: true,
      report,
      attendance: attendanceResult,
      message: 'Report submitted successfully'
    });
  } catch (error: any) {
    console.error('Error submitting report:', error);
    return c.json({ error: error.message || 'Failed to submit report' }, 500);
  }
});

// Get report for a booking
app.get('/make-server-cbd74580/bookings/:bookingId/report', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const report = await kv.get(`report:${bookingId}`) as any;

    return c.json({ report: report || null });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    return c.json({ error: error.message || 'Failed to fetch report' }, 500);
  }
});

// Get every real session report relevant to the caller — as a tutor
// (reports they wrote), a student (reports about them), or a parent
// (reports for any of their children's sessions). One implementation
// serves all three roles because collectBookingsForUser already resolves
// "every booking touching this identity" however that identity relates to
// it (booking.tutorId / booking.studentId / booking.userId, plus a
// dependent student's linked child profile) — the exact same resolution
// GET /bookings and the messaging system already rely on.
//
// This exists because StudentDashboard.tsx and ParentDashboard.tsx's
// "Session Reports" tab (SessionReportsViewer.tsx) was wired to a
// completely different, disconnected report system
// (tutor-session-reports-routes.tsx's freeform notebook) that no tutor
// actually writes to any more — a student could see "2 new reports" (that
// badge count IS wired to the real system, via /bookings/:ids/reports) and
// then open the tab to find nothing there.
app.get('/make-server-cbd74580/my-session-reports', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const callerId = await getUserId(accessToken ?? null);
    if (!callerId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookings = await collectBookingsForUser(callerId);
    const reports = await getReportsForBookings(bookings);
    return c.json({ reports });
  } catch (error: any) {
    console.error('Error fetching my-session-reports:', error);
    return c.json({ error: error.message || 'Failed to fetch session reports' }, 500);
  }
});

// Mark report as viewed by student
app.post('/make-server-cbd74580/reports/:reportId/mark-viewed', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const currentUserId = await getUserId(accessToken);
    if (!currentUserId) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const reportId = c.req.param('reportId');
    const report = await kv.get(`report:${reportId}`) as any;

    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }

    // Security: Verify user is the student or parent of the student
    if (report.studentId !== currentUserId && report.parentId !== currentUserId) {
      return c.json({ error: 'Only the student or parent can mark reports as viewed' }, 403);
    }

    // Track view
    const viewTracking = report.viewedBy || [];
    if (!viewTracking.includes(currentUserId)) {
      viewTracking.push(currentUserId);
    }

    report.viewedBy = viewTracking;
    report.lastViewedAt = new Date().toISOString();
    report.viewedByStudent = report.studentId === currentUserId;
    report.viewedByParent = report.parentId === currentUserId;

    await kv.set(`report:${reportId}`, report);

    // Notify tutor that report was viewed
    await createNotification({
      userId: report.tutorId,
      type: 'system',
      title: 'Report Viewed',
      message: `${report.viewedByStudent ? 'Student' : 'Parent'} has viewed your report for ${report.studentName}`,
      actionUrl: `#report-${reportId}`,
      metadata: {
        reportId,
        viewedBy: currentUserId,
        studentId: report.studentId,
        timestamp: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      message: 'Report marked as viewed',
      report,
    });
  } catch (error: any) {
    console.error('Error marking report as viewed:', error);
    return c.json({ error: error.message || 'Failed to mark report as viewed' }, 500);
  }
});

// Rate a session (parent feedback)
app.post('/make-server-cbd74580/bookings/:bookingId/rate-session', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const body = await c.req.json() as Record<string, unknown>;

    // Validate rating data
    const validationError = validateSessionRating(body);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const report = await kv.get(`report:${bookingId}`) as any;
    if (!report) {
      return c.json({ error: 'Report not found' }, 404);
    }

    report.parentRating = Number(body.rating);
    report.parentFeedback = body.feedback ? sanitizeReportText(body.feedback as string) : undefined;
    report.ratedAt = new Date().toISOString();

    await kv.set(`report:${bookingId}`, report);

    // Update tutor's average rating
    const booking = await kv.get(`booking:${bookingId}`) as any;
    if (booking) {
      await updateTutorRating(booking.tutorId, Number(body.rating));

      // Create notification for tutor about parent rating
      await createNotification({
        userId: booking.tutorId,
        type: 'rating',
        title: 'Session Rated',
        message: `${booking.parentName} rated your session with ${booking.studentName} ${body.rating} stars.`,
        actionUrl: `#feedback-${bookingId}`,
        metadata: { 
          bookingId, 
          rating: body.rating, 
          feedback: body.feedback,
          studentName: booking.studentName,
          parentName: booking.parentName
        }
      });

      // Create notification for student about parent rating (optional)
      await createNotification({
        userId: booking.studentId,
        type: 'session-rated',
        title: 'Your Session Was Rated',
        message: `Your parent rated your session with ${booking.tutorName} ${rating} stars.`,
        actionUrl: `#session-feedback-${bookingId}`,
        metadata: { 
          bookingId, 
          rating, 
          tutorName: booking.tutorName
        }
      });
    }

    return c.json({ success: true, message: 'Rating submitted successfully' });
  } catch (error: any) {
    console.error('Error rating session:', error);
    return c.json({ error: error.message || 'Failed to submit rating' }, 500);
  }
});

// Get all notifications for a user
app.get('/make-server-cbd74580/notifications/:userId', async (c) => {
  console.log('=== NOTIFICATIONS ENDPOINT CALLED ===');
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('Access token present:', !!accessToken);
    
    if (!accessToken) {
      console.error('No access token provided');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    console.log('Fetching notifications for user:', userId);
    
    // Fetch all notifications and filter by userId (same as notifications-routes.tsx)
    console.log('Calling kv.getByPrefix("notification:")...');
    const allNotifications = await kv.getByPrefix('notification:');
    console.log('Total notifications in KV store:', allNotifications.length);
    
    const userNotifications = allNotifications.filter((n: any) => n.userId === userId);
    console.log('User notifications found:', userNotifications.length);
    
    // Sort by creation date (newest first)
    const notifications = userNotifications.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    console.log('Returning notifications successfully');
    return c.json({ notifications });
  } catch (error: any) {
    console.error('CRITICAL ERROR in notifications endpoint:', error);
    console.error('Error stack:', error.stack);
    return c.json({ error: error.message || 'Failed to fetch notifications', notifications: [] }, 500);
  }
});

// Mark notification as read
app.post('/make-server-cbd74580/notifications/:notificationId/read', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const notificationId = c.req.param('notificationId');
    const notification = await kv.get(notificationId) as any;

    if (!notification) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    notification.read = true;
    notification.readAt = new Date().toISOString();
    await kv.set(notificationId, notification);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return c.json({ error: error.message || 'Failed to mark as read' }, 500);
  }
});

// Mark all notifications as read
app.post('/make-server-cbd74580/notifications/:userId/read-all', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    // Fetch all notifications and filter by userId (same as GET endpoint)
    const allNotifications = await kv.getByPrefix('notification:');
    const userNotifications = allNotifications.filter((n: any) => n.userId === userId);

    for (const notification of userNotifications) {
      if (!notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        await kv.set(notification.id, notification);
      }
    }

    return c.json({ success: true, count: userNotifications.length });
  } catch (error: any) {
    console.error('Error marking all as read:', error);
    return c.json({ error: error.message || 'Failed to mark all as read' }, 500);
  }
});

// Delete notification
app.delete('/make-server-cbd74580/notifications/:notificationId', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const notificationId = c.req.param('notificationId');
    await kv.del(notificationId);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return c.json({ error: error.message || 'Failed to delete notification' }, 500);
  }
});

// Create test notifications (for development/testing)
app.post('/make-server-cbd74580/notifications/:userId/create-test', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    
    // Create sample notifications
    const testNotifications = [
      {
        type: 'booking',
        title: 'New Booking Confirmed',
        message: 'Your session with Sarah Johnson is confirmed for tomorrow at 3:00 PM',
        actionUrl: '#bookings',
        metadata: {}
      },
      {
        type: 'reminder',
        title: '24-Hour Reminder',
        message: 'Your session with Sarah Johnson starts in 24 hours',
        actionUrl: '#bookings',
        metadata: {}
      },
      {
        type: 'report',
        title: 'New Session Report',
        message: 'Sarah Johnson has submitted a report for your child\'s session',
        actionUrl: '#reports',
        metadata: {}
      },
      {
        type: 'message',
        title: 'New Message',
        message: 'You have a new message from Sarah Johnson',
        actionUrl: '#messages',
        metadata: {}
      }
    ];

    const created = [];
    for (const notif of testNotifications) {
      const notification = await createNotification({
        userId,
        ...notif
      });
      created.push(notification);
    }

    return c.json({ success: true, count: created.length, notifications: created });
  } catch (error: any) {
    console.error('Error creating test notifications:', error);
    return c.json({ error: error.message || 'Failed to create test notifications' }, 500);
  }
});

// Get notification preferences
app.get('/make-server-cbd74580/users/:userId/notification-preferences', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const currentUserId = await getUserId(accessToken);
    if (!currentUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== currentUserId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const preferences = await kv.get(`notification-preferences:${userId}`) as any;

    return c.json({ preferences: preferences || null });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return c.json({ error: error.message || 'Failed to fetch preferences' }, 500);
  }
});

// Save notification preferences
app.post('/make-server-cbd74580/users/:userId/notification-preferences', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const currentUserId = await getUserId(accessToken);
    if (!currentUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    if (userId !== currentUserId) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const { preferences } = await c.req.json();

    await kv.set(`notification-preferences:${userId}`, preferences);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving preferences:', error);
    return c.json({ error: error.message || 'Failed to save preferences' }, 500);
  }
});

// Get student progress data
app.get('/make-server-cbd74580/students/:studentId/progress', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const studentId = c.req.param('studentId');
    const timeframe = c.req.query('timeframe') || '30days';

    // Get student data
    const student = await kv.get(`child:${studentId}`) as any;
    if (!student) {
      return c.json({ error: 'Student not found' }, 404);
    }

    // Get all bookings for this student
    const allBookings = await kv.getByPrefix('booking:');
    const studentBookings = allBookings.filter((b: any) => 
      b.studentId === studentId && b.status === 'confirmed'
    );

    // Get all reports for this student
    const allReports = await kv.getByPrefix('report:');
    const studentReports = allReports.filter((r: any) => {
      const booking = studentBookings.find((b: any) => b.id === r.bookingId);
      return !!booking;
    });

    // Calculate stats
    const stats = calculateStudentStats(studentBookings, studentReports, timeframe);
    
    // Subject performance
    const subjectPerformance = calculateSubjectPerformance(studentBookings, student.subjects);
    
    // Learning trend (weekly data)
    const learningTrend = calculateLearningTrend(studentBookings, timeframe);
    
    // Skills mastery
    const skillsMastery = calculateSkillsMastery(studentReports);
    
    // Skills worked on
    const skillsWorkedOn = calculateSkillsFrequency(studentReports);
    
    // Grade progress
    const gradeProgress = calculateGradeProgress(student, studentReports);
    
    // Achievements
    const achievements = generateAchievements(stats, studentBookings);
    
    // Recommendations
    const recommendations = generateRecommendations(stats, studentReports);

    return c.json({
      stats,
      subjectPerformance,
      learningTrend,
      skillsMastery,
      skillsWorkedOn,
      gradeProgress,
      achievements,
      recommendations
    });
  } catch (error: any) {
    console.error('Error fetching progress data:', error);
      return c.json({ error: error.message || 'Failed to fetch progress' }, 500);
  }
});

// Validation functions
function validateReportSubmission(body: Record<string, unknown>): string | null {
  // Required fields
  if (!body.summary || typeof body.summary !== 'string') return 'summary is required and must be a string';
  if (!body.tutorName || typeof body.tutorName !== 'string') return 'tutorName is required';
  if (!body.studentName || typeof body.studentName !== 'string') return 'studentName is required';
  
  // Validate text lengths
  const summary = body.summary as string;
  if (summary.length < 10) return 'summary must be at least 10 characters';
  if (summary.length > 2000) return 'summary cannot exceed 2000 characters';
  
  // Optional fields with length limits
  if (body.topicsCovered && typeof body.topicsCovered === 'string' && body.topicsCovered.length > 1000) {
    return 'topicsCovered cannot exceed 1000 characters';
  }
  
  if (body.areasForImprovement && typeof body.areasForImprovement === 'string' && body.areasForImprovement.length > 1000) {
    return 'areasForImprovement cannot exceed 1000 characters';
  }
  
  if (body.homework && typeof body.homework === 'string' && body.homework.length > 1000) {
    return 'homework cannot exceed 1000 characters';
  }
  
  if (body.nextSessionPlan && typeof body.nextSessionPlan === 'string' && body.nextSessionPlan.length > 1000) {
    return 'nextSessionPlan cannot exceed 1000 characters';
  }
  
  // Validate numeric fields if present
  if (body.studentEngagement !== undefined) {
    const engagement = Number(body.studentEngagement);
    if (!Number.isFinite(engagement) || engagement < 1 || engagement > 5) {
      return 'studentEngagement must be a number between 1 and 5';
    }
  }
  
  if (body.studentComprehension !== undefined) {
    const comprehension = Number(body.studentComprehension);
    if (!Number.isFinite(comprehension) || comprehension < 1 || comprehension > 5) {
      return 'studentComprehension must be a number between 1 and 5';
    }
  }
  
  return null;
}

function validateSessionRating(body: Record<string, unknown>): string | null {
  // Rating is required and must be 1-5
  if (body.rating === undefined || body.rating === null) return 'rating is required';
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return 'rating must be a number between 1 and 5';
  }
  
  // Feedback is optional but if provided, must be reasonable length
  if (body.feedback && typeof body.feedback === 'string') {
    if (body.feedback.length > 1500) {
      return 'feedback cannot exceed 1500 characters';
    }
  }
  
  return null;
}

function sanitizeReportText(text: string): string {
  // Remove potential XSS
  return text
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Helper functions
// Delegates to notification-broker.tsx's createNotification (which
// maintains the user_notifications:<userId> index GET /notifications/:userId
// now reads from — see that file and notifications-routes.tsx — instead of
// duplicating a second, unindexed write path here), while keeping this
// function's own signature/return shape so its 6 call sites in this file
// don't need to change.
async function createNotification(data: any) {
  const result = await brokerCreateNotification(kv, data);
  return { id: result.notificationId, ...data, read: false, createdAt: new Date().toISOString() };
}

async function updateTutorRating(tutorId: string, newRating: number) {
  const tutor = await kv.get(`user:${tutorId}`) as any;
  if (!tutor) return;

  const currentRating = tutor.averageRating || 0;
  const ratingCount = tutor.ratingCount || 0;
  
  const newAverageRating = ((currentRating * ratingCount) + newRating) / (ratingCount + 1);
  
  tutor.averageRating = newAverageRating;
  tutor.ratingCount = ratingCount + 1;
  
  await kv.set(`user:${tutorId}`, tutor);
}

function calculateStudentStats(bookings: any[], reports: any[], timeframe: string) {
  const now = new Date();
  const cutoffDate = new Date();
  
  switch (timeframe) {
    case '7days':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case '30days':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case '90days':
      cutoffDate.setDate(now.getDate() - 90);
      break;
    default:
      cutoffDate.setFullYear(2000); // All time
  }

  const relevantBookings = bookings.filter(b => new Date(b.date) >= cutoffDate);
  
  const totalSessions = relevantBookings.length;
  const totalHours = relevantBookings.reduce((sum, b) => sum + (b.duration / 60), 0);
  const sessionsAttended = relevantBookings.filter(b => {
    const report = reports.find(r => r.bookingId === b.id);
    return report?.studentAttended !== false;
  }).length;
  const attendanceRate = totalSessions > 0 ? Math.round((sessionsAttended / totalSessions) * 100) : 0;
  
  // Calculate streak
  const sortedBookings = [...bookings].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const currentStreak = calculateStreak(sortedBookings);
  const longestStreak = calculateLongestStreak(sortedBookings);
  
  // Average rating
  const ratingsWithScores = reports.filter((r: any) => r.parentRating);
  const averageRating = ratingsWithScores.length > 0
    ? ratingsWithScores.reduce((sum: number, r: any) => sum + r.parentRating, 0) / ratingsWithScores.length
    : 0;

  return {
    totalSessions,
    totalHours: Math.round(totalHours),
    sessionsAttended,
    attendanceRate,
    currentStreak,
    longestStreak,
    sessionsThisMonth: relevantBookings.filter(b => {
      const bookingDate = new Date(b.date);
      return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear();
    }).length,
    avgHoursPerWeek: Math.round((totalHours / (relevantBookings.length / 7)) * 10) / 10,
    averageRating: Math.round(averageRating * 10) / 10,
    totalRatings: ratingsWithScores.length
  };
}

function calculateSubjectPerformance(bookings: any[], subjects: string[]) {
  const subjectData: Record<string, { hours: number; sessions: number }> = {};
  
  subjects.forEach(subject => {
    subjectData[subject] = { hours: 0, sessions: 0 };
  });
  
  bookings.forEach(booking => {
    // Simplified: assign to first subject
    const subject = subjects[0] || 'General';
    if (subjectData[subject]) {
      subjectData[subject].hours += booking.duration / 60;
      subjectData[subject].sessions += 1;
    }
  });
  
  return Object.entries(subjectData).map(([subject, data]) => ({
    subject,
    hours: Math.round(data.hours * 10) / 10,
    sessions: data.sessions
  }));
}

function calculateLearningTrend(bookings: any[], timeframe: string) {
  const weeks: Record<string, number> = {};
  
  bookings.forEach(booking => {
    const date = new Date(booking.date);
    const weekKey = `Week ${Math.floor((Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000))}`;
    weeks[weekKey] = (weeks[weekKey] || 0) + 1;
  });
  
  return Object.entries(weeks)
    .map(([week, sessions]) => ({ week, sessions }))
    .reverse()
    .slice(0, 12);
}

function calculateSkillsMastery(reports: any[]) {
  const skillLevels = {
    'Problem Solving': 0,
    'Critical Thinking': 0,
    'Communication': 0,
    'Focus': 0,
    'Confidence': 0,
    'Independence': 0
  };
  
  // Simplified calculation based on engagement levels
  reports.forEach(report => {
    const baseLevel = report.studentEngagement === 'excellent' ? 85 :
                      report.studentEngagement === 'good' ? 70 :
                      report.studentEngagement === 'satisfactory' ? 55 : 40;
    
    Object.keys(skillLevels).forEach(skill => {
      skillLevels[skill as keyof typeof skillLevels] += baseLevel / reports.length;
    });
  });
  
  return Object.entries(skillLevels).map(([skill, level]) => ({
    skill,
    level: Math.round(level)
  }));
}

function calculateSkillsFrequency(reports: any[]) {
  const skillCount: Record<string, number> = {};
  
  reports.forEach(report => {
    (report.skillsWorked || []).forEach((skill: string) => {
      skillCount[skill] = (skillCount[skill] || 0) + 1;
    });
  });
  
  return Object.entries(skillCount)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateGradeProgress(student: any, reports: any[]) {
  if (!student.targetGrades) return [];
  
  return Object.entries(student.targetGrades).map(([subject, target]) => {
    const current = student.currentGrades?.[subject] || 'N/A';
    
    // Simplified progress calculation
    const gradeValues: Record<string, number> = {
      'U': 0, 'G': 1, 'F': 2, 'E': 3, 'D': 4, 'C': 5, 'B': 6, 'A': 7, 'A*': 8
    };
    
    const currentValue = gradeValues[current as string] || 0;
    const targetValue = gradeValues[target as string] || 8;
    const progress = Math.round((currentValue / targetValue) * 100);
    
    return {
      subject,
      currentGrade: current,
      targetGrade: target,
      progress: Math.min(progress, 100)
    };
  });
}

function calculateStreak(sortedBookings: any[]): number {
  if (sortedBookings.length === 0) return 0;
  
  let streak = 0;
  const now = new Date();
  
  for (const booking of sortedBookings) {
    const bookingDate = new Date(booking.date);
    const daysDiff = Math.floor((now.getTime() - bookingDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysDiff <= 7 * (streak + 1)) {
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
}

function calculateLongestStreak(sortedBookings: any[]): number {
  // Simplified implementation
  return Math.ceil(sortedBookings.length / 4);
}

function generateAchievements(stats: any, bookings: any[]) {
  const achievements = [];
  
  if (stats.totalSessions >= 1) {
    achievements.push({
      id: 'first-session',
      title: 'First Session Complete! 🎉',
      description: 'Completed your first tutoring session',
      date: bookings[0]?.date
    });
  }
  
  if (stats.totalSessions >= 10) {
    achievements.push({
      id: '10-sessions',
      title: '10 Sessions Milestone 🏆',
      description: 'Completed 10 tutoring sessions',
      date: bookings[9]?.date
    });
  }
  
  if (stats.currentStreak >= 4) {
    achievements.push({
      id: 'streak-4',
      title: '4-Week Streak! 🔥',
      description: 'Maintained consistency for 4 weeks',
      date: new Date().toISOString()
    });
  }
  
  if (stats.attendanceRate >= 95) {
    achievements.push({
      id: 'perfect-attendance',
      title: 'Perfect Attendance ⭐',
      description: 'Attended 95%+ of all sessions',
      date: new Date().toISOString()
    });
  }
  
  return achievements;
}

function generateRecommendations(stats: any, reports: any[]) {
  const recommendations = [];
  
  if (stats.attendanceRate < 80) {
    recommendations.push('Try to maintain better attendance - consistency is key to progress!');
  }
  
  if (stats.currentStreak === 0 && stats.totalSessions > 0) {
    recommendations.push('Book a session soon to start building your learning streak!');
  }
  
  if (reports.length > 0) {
    const lastReport = reports[reports.length - 1];
    if (lastReport.nextLessonFocus) {
      recommendations.push(`Focus area: ${lastReport.nextLessonFocus}`);
    }
  }
  
  if (stats.avgHoursPerWeek < 2) {
    recommendations.push('Consider increasing session frequency to 2+ hours per week for better results');
  }
  
  return recommendations;
}

// Notify tutor of student progress improvement
app.post('/make-server-cbd74580/students/:studentId/notify-progress', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const currentUserId = await getUserId(accessToken);
    if (!currentUserId) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const studentId = c.req.param('studentId');
    const body = await c.req.json() as Record<string, unknown>;

    // Validate request
    const { previousScore, currentScore, subject, improvementPercentage, tutorId } = body;

    if (!previousScore || !currentScore || !subject || !improvementPercentage) {
      return c.json({
        error: 'Missing required fields: previousScore, currentScore, subject, improvementPercentage',
      }, 400);
    }

    // Security: the student themselves (or an admin) can notify tutors of
    // progress. :studentId here is the *academic* id the rest of the
    // student dashboard uses (see academicStudentId in
    // StudentDashboard.tsx) — for a dependent student that's their linked
    // child record's id, not their own Supabase Auth user id, so a bare
    // `currentUserId !== studentId` check rejected every dependent student
    // (the majority of students) unconditionally. Accept either identity.
    const callerProfile = await kv.get(`user:${currentUserId}`) as any;
    const isSelf = currentUserId === studentId;
    const isLinkedDependent = callerProfile?.linkedChildId === studentId;
    const isAdmin = callerProfile?.role === 'admin';
    if (!isSelf && !isLinkedDependent && !isAdmin) {
      return c.json({ error: 'Unauthorized to report this student progress' }, 403);
    }

    const improvementPct = Number(improvementPercentage);

    // Only notify if improvement meets threshold (5%)
    if (improvementPct < 5) {
      return c.json({
        success: false,
        reason: 'Improvement below 5% threshold',
        improvementPercentage: improvementPct,
      });
    }

    // Get student info — dependent students are stored at child:<id>
    // (the id this route's :studentId actually is, per academicStudentId
    // in StudentDashboard.tsx); an independent 18+ student's own profile
    // lives at user:<id> instead. student:<id> was never a real key,
    // so this always fell back to the generic name below.
    const student = (await kv.get(`child:${studentId}`)) as any
      ?? (await kv.get(`user:${studentId}`)) as any;
    const studentName = student?.firstName || student?.name || 'Student';

    // Notify tutor(s) of progress
    const targetTutorId = tutorId as string || 'all-tutors';

    const notificationPayload = {
      userId: tutorId || 'admin-group',
      type: 'progress',
      title: 'Student Progress Alert',
      message: `${studentName} improved ${improvementPct.toFixed(1)}% in ${subject}! (${previousScore} → ${currentScore})`,
      priority: improvementPct >= 10 ? 'high' : 'medium',
      actionUrl: `#student/${studentId}/progress`,
      metadata: {
        studentId,
        studentName,
        subject,
        previousScore: Number(previousScore),
        currentScore: Number(currentScore),
        improvementPercentage: improvementPct,
        timestamp: new Date().toISOString(),
        tutorId: tutorId || 'all',
      },
    };
    const notificationResult = await brokerCreateNotification(kv, notificationPayload);
    const notification = { id: notificationResult.notificationId, ...notificationPayload, createdAt: new Date().toISOString() };

    // Also track progress milestone in student record
    const progressRecord = await kv.get(`progress:${studentId}`) as any || {};
    if (!progressRecord.milestones) progressRecord.milestones = [];

    progressRecord.milestones.push({
      date: new Date().toISOString(),
      subject,
      previousScore: Number(previousScore),
      currentScore: Number(currentScore),
      improvementPercentage: improvementPct,
    });

    await kv.set(`progress:${studentId}`, progressRecord);

    return c.json({
      success: true,
      message: 'Progress notification sent to tutor',
      notification,
      improvementPercentage: improvementPct,
    });
  } catch (error: any) {
    console.error('Error notifying progress:', error);
    return c.json({ error: error.message || 'Failed to notify progress' }, 500);
  }
});

}  // Close reportsNotificationsRoutes function

export default reportsNotificationsRoutes;