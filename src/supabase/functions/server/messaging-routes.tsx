import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const messagingRoutes = (app: Hono, getUserId: Function) => {

  // Get messages for a booking
  app.get('/make-server-cbd74580/messages/:bookingId', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const bookingId = c.req.param('bookingId');
      
      // Verify user is part of this booking
      const booking = await kv.get(bookingId) as any;
      if (!booking) {
        return c.json({ error: 'Booking not found' }, 404);
      }

      if (booking.tutorId !== userId && booking.parentId !== userId) {
        return c.json({ error: 'Unauthorized to view these messages' }, 403);
      }

      // Get all messages for this booking
      const allMessages = await kv.getByPrefix('message:');
      const bookingMessages = allMessages
        .filter((m: any) => m.bookingId === bookingId)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      return c.json({ messages: bookingMessages });
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Send a message
  app.post('/make-server-cbd74580/messages', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Parse form data (for file uploads)
      const formData = await c.req.formData();
      const bookingId = formData.get('bookingId') as string;
      const content = formData.get('content') as string;
      const senderId = formData.get('senderId') as string;
      const senderRole = formData.get('senderRole') as string;

      // Verify user is part of this booking
      const booking = await kv.get(bookingId) as any;
      if (!booking) {
        return c.json({ error: 'Booking not found' }, 404);
      }

      if (booking.tutorId !== userId && booking.parentId !== userId) {
        return c.json({ error: 'Unauthorized to send messages for this booking' }, 403);
      }

      // Check for personal contact info (basic pattern matching)
      const contactInfoPattern = /\b(\d{10,}|[\w.-]+@[\w.-]+\.\w+|(?:whatsapp|telegram|facebook|instagram|twitter)\b)/gi;
      if (contactInfoPattern.test(content)) {
        return c.json({ 
          error: 'Personal contact information detected. Please use the in-app messaging system.' 
        }, 400);
      }

      // Get sender name (masked for privacy)
      const senderName = senderRole === 'tutor' ? booking.tutorName : 'Parent';

      // Handle attachments
      const attachments: any[] = [];
      const attachmentFiles = formData.getAll('attachments') as File[];

      if (attachmentFiles.length > 3) {
        return c.json({ error: 'Maximum 3 attachments allowed' }, 400);
      }

      for (const file of attachmentFiles) {
        if (file.size > 10 * 1024 * 1024) {
          return c.json({ error: `File ${file.name} exceeds 10MB limit` }, 400);
        }

        // TODO: In production, upload to Supabase Storage and scan for malware
        // For now, create a mock attachment
        const attachment = {
          id: `attachment:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          filename: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: `/attachments/${Date.now()}-${file.name}`, // Mock URL
        };
        attachments.push(attachment);
      }

      const message = {
        id: `message:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        bookingId,
        senderId,
        senderRole,
        senderName,
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
        createdAt: new Date().toISOString(),
      };

      await kv.set(message.id, message);

      // Create log entry for audit trail
      const logEntry = {
        id: `message-log:${Date.now()}`,
        messageId: message.id,
        bookingId,
        senderId,
        recipientId: senderRole === 'tutor' ? booking.parentId : booking.tutorId,
        timestamp: new Date().toISOString(),
        action: 'message_sent',
      };
      await kv.set(logEntry.id, logEntry);

      // Notify recipient
      const recipientId = senderRole === 'tutor' ? booking.parentId : booking.tutorId;
      const recipientPrefs = await kv.get(`notification-preferences:${recipientId}`) as any;

      if (!recipientPrefs || recipientPrefs.inApp.messages) {
        const notification = {
          id: `notification:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: recipientId,
          type: 'message',
          title: 'New Message',
          message: `You have a new message from ${senderName}`,
          data: { bookingId, messageId: message.id },
          read: false,
          priority: 'medium',
          createdAt: new Date().toISOString(),
        };
        await kv.set(notification.id, notification);
      }

      return c.json({ message });
    } catch (error: any) {
      console.error('Error sending message:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Report a message
  app.post('/make-server-cbd74580/messages/:messageId/report', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const messageId = c.req.param('messageId');
      const { reportedByUserId, reportReason } = await c.req.json();

      const message = await kv.get(messageId) as any;
      if (!message) {
        return c.json({ error: 'Message not found' }, 404);
      }

      // Update message with report info
      message.reportedByUserId = reportedByUserId;
      message.reportReason = reportReason;
      message.reportedAt = new Date().toISOString();
      await kv.set(messageId, message);

      // Create system alert for admin
      const alert = {
        id: `system-alert:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'abuse_report',
        severity: 'high',
        title: 'Message Reported for Abuse',
        description: `A message in booking ${message.bookingId} has been reported: ${reportReason}`,
        relatedUserId: message.senderId,
        relatedEntityId: messageId,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        auditTrail: [],
      };
      await kv.set(alert.id, alert);

      // Create audit log
      const logEntry = {
        id: `message-report-log:${Date.now()}`,
        messageId,
        reportedBy: reportedByUserId,
        reason: reportReason,
        timestamp: new Date().toISOString(),
        action: 'message_reported',
      };
      await kv.set(logEntry.id, logEntry);

      return c.json({ success: true });
    } catch (error: any) {
      console.error('Error reporting message:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get message logs (admin only)
  app.get('/make-server-cbd74580/admin/message-logs', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // TODO: Verify admin role
      
      const allLogs = await kv.getByPrefix('message-log:');
      const allReportLogs = await kv.getByPrefix('message-report-log:');

      return c.json({ 
        messageLogs: allLogs,
        reportLogs: allReportLogs 
      });
    } catch (error: any) {
      console.error('Error fetching message logs:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });
};
