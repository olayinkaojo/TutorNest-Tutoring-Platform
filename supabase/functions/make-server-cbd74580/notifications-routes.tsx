import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { sendEmail, emailTemplates } from './email-service.tsx';

export const notificationsRoutes = (app: Hono, getUserId: Function) => {

  // Get user notifications
  app.get('/make-server-cbd74580/notifications/:userId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      
      if (!accessToken) {
        console.log('❌ Notifications request - No access token provided');
        return c.json({ 
          code: 401,
          message: 'No access token provided'
        }, 401);
      }
      
      const currentUserId = await getUserId(accessToken);

      if (!currentUserId) {
        console.log('❌ Notifications request - Token validation failed (invalid or expired)');
        return c.json({ 
          code: 401,
          message: 'Invalid or expired JWT token'
        }, 401);
      }

      const userId = c.req.param('userId');
      
      // Security check: ensure the authenticated user is requesting their own notifications
      if (currentUserId !== userId) {
        console.log('⚠️ User ID mismatch, using authenticated user ID for security');
        console.log('  Token User ID:', currentUserId);
        console.log('  Requested User ID:', userId);
      }
      
      // Always use the authenticated user's ID for security, not the URL parameter
      const safeUserId = currentUserId;
      
      // Get notifications from both KV (legacy) and DB (new) in parallel
      const [kvAllNotifications, dbNotifications] = await Promise.all([
        kv.getByPrefix('notification:'),
        db.getNotificationsByUser(safeUserId).catch(() => [] as any[]),
      ]);

      const kvUserNotifications = kvAllNotifications
        .filter((n: any) => n.userId === safeUserId);

      // Merge: DB notifications take precedence (deduplicate by id)
      const kvIds = new Set(kvUserNotifications.map((n: any) => n.id));
      const userNotifications = [
        ...kvUserNotifications,
        ...dbNotifications.filter((n) => !kvIds.has(n.id)),
      ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('Found', userNotifications.length, 'notifications for user');
      
      // Get upcoming bookings for this user and add them as notifications
      let bookingNotifications: any[] = [];
      
      try {
        // Merge KV bookings (legacy) and DB bookings for reminder generation
        const [kvBookings, dbBookings] = await Promise.all([
          kv.getByPrefix('booking:'),
          db.getBookingsByUserId(safeUserId).catch(() => [] as any[]),
        ]);
        const kvBookingIds = new Set(kvBookings.map((b: any) => b.id));
        const allBookings = [...kvBookings, ...dbBookings.filter((b) => !kvBookingIds.has(b.id))];

        const now = new Date();

        const upcomingBookings = allBookings.filter((booking: any) => {
          try {
            // Validate booking has required fields
            if (!booking.date || !booking.startTime || !booking.status) {
              return false;
            }
            
            const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
            
            // Check if date is valid
            if (isNaN(bookingDateTime.getTime())) {
              return false;
            }
            
            const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            // Include bookings for this user (as tutor, parent, or student) that are upcoming and within 7 days
            const isUserBooking = booking.tutorId === safeUserId || booking.parentId === safeUserId || booking.studentId === safeUserId;
            const isUpcoming = bookingDateTime > now && booking.status === 'confirmed';
            const isWithinWeek = hoursUntil <= 168; // 7 days
            
            return isUserBooking && isUpcoming && isWithinWeek;
          } catch (err) {
            console.error('Error filtering booking:', err, booking);
            return false;
          }
        });

        // Create dynamic booking notifications
        bookingNotifications = upcomingBookings.map((booking: any) => {
          try {
            const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
            const hoursUntil = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
            
            let timeText = '';
            if (hoursUntil < 1) {
              const minutesUntil = Math.floor(hoursUntil * 60);
              timeText = minutesUntil > 0 ? `in ${minutesUntil} minutes` : 'now';
            } else if (hoursUntil < 24) {
              timeText = `in ${Math.floor(hoursUntil)} hours`;
            } else {
              const daysUntil = Math.floor(hoursUntil / 24);
              timeText = `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
            }

            const isTutor = booking.tutorId === safeUserId;
            const isStudent = booking.studentId === safeUserId;
            const isParent = booking.parentId === safeUserId;
            
            const title = hoursUntil <= 2 
              ? '🔔 Lesson Starting Soon!' 
              : '📅 Upcoming Lesson';
            
            const studentName = booking.studentName || 'Student';
            const tutorName = booking.tutorName || 'Tutor';
            const subject = booking.subject || 'session';
            
            let message = '';
            if (isTutor) {
              message = `Session with ${studentName} ${timeText} (${booking.startTime})`;
            } else if (isStudent) {
              message = `Your ${subject} session with ${tutorName} ${timeText} (${booking.startTime})`;
            } else if (isParent) {
              message = `${studentName}'s session with ${tutorName} ${timeText} (${booking.startTime})`;
            }

            return {
              id: `booking-notification:${booking.id}`,
              userId: safeUserId,
              type: 'reminder',
              title,
              message,
              read: false,
              priority: hoursUntil <= 2 ? 'high' : 'medium',
              createdAt: bookingDateTime.toISOString(),
              actionUrl: booking.googleMeetLink || undefined,
              metadata: {
                bookingId: booking.id,
                date: booking.date,
                startTime: booking.startTime,
                endTime: booking.endTime,
                subject: booking.subject,
                tutorName: booking.tutorName,
                studentName: booking.studentName,
                isUpcoming: true,
                hoursUntil: Math.floor(hoursUntil)
              }
            };
          } catch (err) {
            console.error('Error creating booking notification:', err, booking);
            return null;
          }
        }).filter((n: any) => n !== null); // Remove any failed notifications
      } catch (bookingErr) {
        console.error('Error processing bookings for notifications:', bookingErr);
        // Continue with empty booking notifications if there's an error
        bookingNotifications = [];
      }

      // Combine regular notifications with booking notifications
      const combinedNotifications = [...userNotifications, ...bookingNotifications]
        .sort((a: any, b: any) => {
          // Prioritize by: 1) high priority, 2) unread, 3) most recent
          if (a.priority === 'high' && b.priority !== 'high') return -1;
          if (b.priority === 'high' && a.priority !== 'high') return 1;
          if (!a.read && b.read) return -1;
          if (a.read && !b.read) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      return c.json({ notifications: combinedNotifications });
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Mark notification as read
  app.post('/make-server-cbd74580/notifications/:notificationId/read', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const notificationId = c.req.param('notificationId');

      // Try KV first, then DB
      const kvNotification = await kv.get(notificationId) as any;
      if (kvNotification) {
        kvNotification.read = true;
        await kv.set(notificationId, kvNotification);
      } else {
        // May be a UUID from the notifications table
        await db.markNotificationRead(notificationId).catch(() => {
          // Silent fail — booking-generated notifications (booking-notification:xxx) are ephemeral
        });
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Mark all notifications as read
  app.post('/make-server-cbd74580/notifications/:userId/read-all', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const currentUserId = await getUserId(accessToken ?? null);

      if (!currentUserId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = c.req.param('userId');
      const allNotifications = await kv.getByPrefix('notification:');
      const userNotifications = allNotifications.filter((n: any) => n.userId === userId);

      for (const notification of userNotifications) {
        notification.read = true;
        await kv.set(notification.id, notification);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Delete notification
  app.delete('/make-server-cbd74580/notifications/:notificationId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const notificationId = c.req.param('notificationId');
      await kv.del(notificationId);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get notification preferences
  app.get('/make-server-cbd74580/notification-preferences/:userId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const currentUserId = await getUserId(accessToken ?? null);

      if (!currentUserId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = c.req.param('userId');
      let preferences = await kv.get(`notification-preferences:${userId}`) as any;

      // Default preferences if not set
      if (!preferences) {
        preferences = {
          email: {
            bookingConfirmed: true,
            bookingRescheduled: true,
            bookingCancelled: true,
            sessionReminder24h: true,
            sessionReminder1h: true,
            sessionReport: true,
            messages: true,
            paymentUpdates: true,
          },
          inApp: {
            bookingConfirmed: true,
            bookingRescheduled: true,
            bookingCancelled: true,
            sessionReminder24h: true,
            sessionReminder1h: true,
            sessionReport: true,
            messages: true,
            paymentUpdates: true,
          },
        };
        await kv.set(`notification-preferences:${userId}`, preferences);
      }

      return c.json({ preferences });
    } catch (error: any) {
      console.error('Error fetching preferences:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Update notification preferences
  app.put('/make-server-cbd74580/notification-preferences/:userId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const currentUserId = await getUserId(accessToken ?? null);

      if (!currentUserId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const userId = c.req.param('userId');
      const { preferences } = await c.req.json();

      await kv.set(`notification-preferences:${userId}`, preferences);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Helper function to create notification
  const createNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
    priority: string = 'medium',
    data?: any
  ) => {
    const notification = {
      id: `notification:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      priority,
      createdAt: new Date().toISOString(),
    };

    await kv.set(notification.id, notification);

    // TODO: Send email notification based on user preferences
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    
    return notification;
  };

  // Schedule notification reminders (called by cron job or scheduler)
  app.post('/make-server-cbd74580/notifications/schedule-reminders', async (c) => {
    try {
      // This would be called by a scheduled job
      const allBookings = await kv.getByPrefix('booking:');
      const now = new Date();

      let remindersCreated = 0;

      for (const booking of allBookings) {
        if (booking.status !== 'confirmed') continue;

        const sessionDate = new Date(booking.date);
        const timeDiff = sessionDate.getTime() - now.getTime();

        // Check for 24-hour reminder
        if (timeDiff > 23 * 60 * 60 * 1000 && timeDiff <= 25 * 60 * 60 * 1000) {
          // Get user preferences
          const tutorPrefs = await kv.get(`notification-preferences:${booking.tutorId}`) as any;
          const parentPrefs = await kv.get(`notification-preferences:${booking.parentId}`) as any;
          const studentPrefs = await kv.get(`notification-preferences:${booking.studentId}`) as any;

          if (!tutorPrefs || tutorPrefs.inApp.sessionReminder24h) {
            await createNotification(
              booking.tutorId,
              'session_reminder',
              'Session Reminder - Tomorrow',
              `You have a session with ${booking.studentName} tomorrow at ${new Date(booking.date).toLocaleTimeString()}`,
              'medium',
              { bookingId: booking.id }
            );
            remindersCreated++;
          }
          // 24h email — tutor
          if (!tutorPrefs || tutorPrefs.email?.sessionReminder24h !== false) {
            const tutorProfile = await kv.get(`user:${booking.tutorId}`) as any;
            const tutorEmail = tutorProfile?.email;
            if (tutorEmail) {
              const roomLink = booking.googleMeetLink || booking.meetLink || '';
              await sendEmail({
                to: tutorEmail,
                ...emailTemplates.sessionReminder(
                  tutorProfile?.firstName || tutorProfile?.name || 'Tutor',
                  booking.studentName || 'Student',
                  booking.date,
                  booking.startTime || '',
                  roomLink
                ),
              }).catch(e => console.warn('24h reminder email (tutor):', e));
            }
          }

          if (!parentPrefs || parentPrefs.inApp.sessionReminder24h) {
            await createNotification(
              booking.parentId,
              'session_reminder',
              'Session Reminder - Tomorrow',
              `${booking.studentName} has a session with ${booking.tutorName} tomorrow at ${new Date(booking.date).toLocaleTimeString()}`,
              'medium',
              { bookingId: booking.id }
            );
            remindersCreated++;
          }
          // 24h email — parent
          if (!parentPrefs || parentPrefs.email?.sessionReminder24h !== false) {
            const parentProfile = await kv.get(`user:${booking.parentId}`) as any;
            const parentEmail = parentProfile?.email;
            if (parentEmail) {
              const roomLink = booking.googleMeetLink || booking.meetLink || '';
              await sendEmail({
                to: parentEmail,
                ...emailTemplates.sessionReminder(
                  parentProfile?.firstName || parentProfile?.name || 'Parent',
                  booking.tutorName || 'Tutor',
                  booking.date,
                  booking.startTime || '',
                  roomLink
                ),
              }).catch(e => console.warn('24h reminder email (parent):', e));
            }
          }

          if (booking.studentId && (!studentPrefs || studentPrefs.inApp.sessionReminder24h)) {
            await createNotification(
              booking.studentId,
              'session_reminder',
              'Session Reminder - Tomorrow',
              `Your ${booking.subject || 'tutoring'} session with ${booking.tutorName} is tomorrow at ${new Date(booking.date).toLocaleTimeString()}`,
              'medium',
              { bookingId: booking.id }
            );
            remindersCreated++;
          }
          // 24h email — student
          if (booking.studentId && (!studentPrefs || studentPrefs.email?.sessionReminder24h !== false)) {
            const studentProfile = await kv.get(`user:${booking.studentId}`) as any;
            const studentEmail = studentProfile?.email;
            if (studentEmail) {
              const roomLink = booking.googleMeetLink || booking.meetLink || '';
              await sendEmail({
                to: studentEmail,
                ...emailTemplates.sessionReminder(
                  studentProfile?.firstName || studentProfile?.name || 'Student',
                  booking.tutorName || 'Tutor',
                  booking.date,
                  booking.startTime || '',
                  roomLink
                ),
              }).catch(e => console.warn('24h reminder email (student):', e));
            }
          }
        }

        // Check for 1-hour reminder
        if (timeDiff > 0 && timeDiff <= 60 * 60 * 1000) {
          const tutorPrefs = await kv.get(`notification-preferences:${booking.tutorId}`) as any;
          const parentPrefs = await kv.get(`notification-preferences:${booking.parentId}`) as any;
          const studentPrefs = await kv.get(`notification-preferences:${booking.studentId}`) as any;

          if (!tutorPrefs || tutorPrefs.inApp.sessionReminder1h) {
            await createNotification(
              booking.tutorId,
              'session_reminder',
              'Session Starting Soon',
              `Your session with ${booking.studentName} starts in 1 hour`,
              'high',
              { bookingId: booking.id }
            );
            remindersCreated++;
          }
          // 1h email — tutor
          if (!tutorPrefs || tutorPrefs.email?.sessionReminder1h !== false) {
            const tutorProfile = await kv.get(`user:${booking.tutorId}`) as any;
            const tutorEmail = tutorProfile?.email;
            if (tutorEmail) {
              const roomLink = booking.googleMeetLink || booking.meetLink || '';
              await sendEmail({
                to: tutorEmail,
                ...emailTemplates.sessionReminder(
                  tutorProfile?.firstName || tutorProfile?.name || 'Tutor',
                  booking.studentName || 'Student',
                  booking.date,
                  booking.startTime || '',
                  roomLink
                ),
              }).catch(e => console.warn('1h reminder email (tutor):', e));
            }
          }

          if (!parentPrefs || parentPrefs.inApp.sessionReminder1h) {
            await createNotification(
              booking.parentId,
              'session_reminder',
              'Session Starting Soon',
              `${booking.studentName}'s session with ${booking.tutorName} starts in 1 hour`,
              'high',
              { bookingId: booking.id }
            );
            remindersCreated++;
          }
          // 1h email — parent
          if (!parentPrefs || parentPrefs.email?.sessionReminder1h !== false) {
            const parentProfile = await kv.get(`user:${booking.parentId}`) as any;
            const parentEmail = parentProfile?.email;
            if (parentEmail) {
              const roomLink = booking.googleMeetLink || booking.meetLink || '';
              await sendEmail({
                to: parentEmail,
                ...emailTemplates.sessionReminder(
                  parentProfile?.firstName || parentProfile?.name || 'Parent',
                  booking.tutorName || 'Tutor',
                  booking.date,
                  booking.startTime || '',
                  roomLink
                ),
              }).catch(e => console.warn('1h reminder email (parent):', e));
            }
          }

          if (booking.studentId && (!studentPrefs || studentPrefs.inApp.sessionReminder1h)) {
            await createNotification(
              booking.studentId,
              'session_reminder',
              '🔔 Session Starting Soon!',
              `Your ${booking.subject || 'tutoring'} session with ${booking.tutorName} starts in 1 hour`,
              'high',
              { bookingId: booking.id }
            );
            remindersCreated++;
          }
          // 1h email — student
          if (booking.studentId && (!studentPrefs || studentPrefs.email?.sessionReminder1h !== false)) {
            const studentProfile = await kv.get(`user:${booking.studentId}`) as any;
            const studentEmail = studentProfile?.email;
            if (studentEmail) {
              const roomLink = booking.googleMeetLink || booking.meetLink || '';
              await sendEmail({
                to: studentEmail,
                ...emailTemplates.sessionReminder(
                  studentProfile?.firstName || studentProfile?.name || 'Student',
                  booking.tutorName || 'Tutor',
                  booking.date,
                  booking.startTime || '',
                  roomLink
                ),
              }).catch(e => console.warn('1h reminder email (student):', e));
            }
          }
        }
      }

      return c.json({ remindersCreated });
    } catch (error: any) {
      console.error('Error scheduling reminders:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};