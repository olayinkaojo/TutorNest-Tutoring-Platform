import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// TEST ROUTE - Verify notifications endpoint is accessible
app.get('/notifications/test', async (c) => {
  console.log('=== NOTIFICATIONS TEST ENDPOINT CALLED ===');
  return c.json({
    success: true,
    message: 'Notifications endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Submit post-session report
app.post('/bookings/:bookingId/report', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const bookingId = c.req.param('bookingId');
    const reportData = await c.req.json() as Record<string, unknown>;

    // Validate report data
    const validationError = validateReportSubmission(reportData);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    // Get the booking
    const booking = await kv.get(`booking:${bookingId}`) as any;
    if (!booking) {
      return c.json({ error: 'Booking not found' }, 404);
    }

    // Sanitize text fields to prevent XSS
    const sanitizedData = {
      ...reportData,
      summary: sanitizeReportText(reportData.summary as string),
      topicsCovered: reportData.topicsCovered ? sanitizeReportText(reportData.topicsCovered as string) : undefined,
      areasForImprovement: reportData.areasForImprovement ? sanitizeReportText(reportData.areasForImprovement as string) : undefined,
      homework: reportData.homework ? sanitizeReportText(reportData.homework as string) : undefined,
      nextSessionPlan: reportData.nextSessionPlan ? sanitizeReportText(reportData.nextSessionPlan as string) : undefined,
    };

    // Create report
    const report = {
      id: `report:${bookingId}`,
      bookingId,
      ...sanitizedData,
      submittedAt: new Date().toISOString(),
    };

    await kv.set(`report:${bookingId}`, report);

    // Update booking with report flag
    booking.hasReport = true;
    await kv.set(`booking:${bookingId}`, booking);

    // Create notification for parent
    await createNotification({
      userId: booking.parentId,
      type: 'report',
      title: 'New Session Report',
      message: `${booking.tutorName} has submitted a report for ${booking.studentName}'s session.`,
      actionUrl: `#bookings-report-${bookingId}`,
      metadata: { bookingId, reportId: report.id }
    });

    // Create notification for student
    await createNotification({
      userId: booking.studentId,
      type: 'report',
      title: 'Session Report Submitted',
      message: `${booking.tutorName} has submitted a report for your session.`,
      actionUrl: `#report-${bookingId}`,
      metadata: { bookingId, reportId: report.id }
    });

    // Send email notification
    await sendEmailNotification({
      to: booking.parentId,
      subject: 'New Session Report Available',
      template: 'session-report',
      data: { booking, report }
    });

    return c.json({ 
      success: true, 
      report,
      message: 'Report submitted successfully' 
    });
  } catch (error: any) {
    console.error('Error submitting report:', error);
    return c.json({ error: error.message || 'Failed to submit report' }, 500);
  }
});

// Get report for a booking
app.get('/bookings/:bookingId/report', async (c) => {
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

// Rate a session (parent feedback)
app.post('/bookings/:bookingId/rate-session', async (c) => {
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
app.get('/notifications/:userId', async (c) => {
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
app.post('/notifications/:notificationId/read', async (c) => {
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
app.post('/notifications/:userId/read-all', async (c) => {
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
app.delete('/notifications/:notificationId', async (c) => {
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
app.post('/notifications/:userId/create-test', async (c) => {
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
app.get('/users/:userId/notification-preferences', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const preferences = await kv.get(`notification-preferences:${userId}`) as any;

    return c.json({ preferences: preferences || null });
  } catch (error: any) {
    console.error('Error fetching preferences:', error);
    return c.json({ error: error.message || 'Failed to fetch preferences' }, 500);
  }
});

// Save notification preferences
app.post('/users/:userId/notification-preferences', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = c.req.param('userId');
    const { preferences } = await c.req.json();

    await kv.set(`notification-preferences:${userId}`, preferences);

    return c.json({ success: true });
  } catch (error: any) {
    console.error('Error saving preferences:', error);
    return c.json({ error: error.message || 'Failed to save preferences' }, 500);
  }
});

// Get student progress data
app.get('/students/:studentId/progress', async (c) => {
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
async function createNotification(data: any) {
  // Use the same ID format as notifications-routes.tsx for consistency
  const notificationId = `notification:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const notification = {
    id: notificationId,
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await kv.set(notificationId, notification);
  return notification;
}

async function sendEmailNotification(data: any) {
  // In production, integrate with SendGrid, Mailgun, etc.
  console.log('Email notification:', data);
  // TODO: Implement email sending
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

export default app;