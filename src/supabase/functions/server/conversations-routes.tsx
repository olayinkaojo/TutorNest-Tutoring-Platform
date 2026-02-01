import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

export const conversationsRoutes = (app: Hono, getUserId: Function) => {

  // Get or create a conversation between two users
  app.post('/make-server-cbd74580/conversations/get-or-create', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const { participantId, participantName, participantRole } = await c.req.json();

      // Create conversation ID (sorted to ensure consistency)
      const sortedParticipants = [userId, participantId].sort();
      const conversationId = `conversation:${sortedParticipants[0]}:${sortedParticipants[1]}`;

      // Check if conversation exists
      let conversation = await kv.get(conversationId) as any;

      if (!conversation) {
        // Create new conversation
        conversation = {
          id: conversationId,
          participants: sortedParticipants,
          participantRoles: {
            [userId]: 'current_user',
            [participantId]: participantRole,
          },
          participantNames: {
            [participantId]: participantName,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await kv.set(conversationId, conversation);
      }

      return c.json({ conversation });
    } catch (error: any) {
      console.error('Error getting/creating conversation:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get all conversations for a user
  app.get('/make-server-cbd74580/conversations', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get all conversations
      const allConversations = await kv.getByPrefix('conversation:');
      
      // Filter conversations where user is a participant
      const userConversations = allConversations.filter((conv: any) => 
        conv.participants && conv.participants.includes(userId)
      );

      // Get last message and unread count for each conversation
      const allMessages = await kv.getByPrefix('conv-message:');
      
      const conversationsWithDetails = await Promise.all(
        userConversations.map(async (conv: any) => {
          // Get messages for this conversation
          const convMessages = allMessages
            .filter((msg: any) => msg.conversationId === conv.id)
            .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          const lastMessage = convMessages[0];
          const unreadCount = convMessages.filter(
            (msg: any) => msg.receiverId === userId && !msg.read
          ).length;

          return {
            ...conv,
            lastMessage,
            unreadCount,
          };
        })
      );

      // Sort by most recent activity
      conversationsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt;
        const bTime = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      return c.json({ conversations: conversationsWithDetails });
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Get messages for a conversation
  app.get('/make-server-cbd74580/conversations/:conversationId/messages', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const conversationId = c.req.param('conversationId');
      
      // Verify user is part of this conversation
      const conversation = await kv.get(conversationId) as any;
      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
      }

      if (!conversation.participants.includes(userId)) {
        return c.json({ error: 'Unauthorized to view this conversation' }, 403);
      }

      // Get all messages for this conversation
      const allMessages = await kv.getByPrefix('conv-message:');
      const conversationMessages = allMessages
        .filter((m: any) => m.conversationId === conversationId)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      // Mark messages as read
      const unreadMessages = conversationMessages.filter(
        (msg: any) => msg.receiverId === userId && !msg.read
      );
      
      for (const msg of unreadMessages) {
        msg.read = true;
        msg.readAt = new Date().toISOString();
        await kv.set(msg.id, msg);
      }

      return c.json({ messages: conversationMessages });
    } catch (error: any) {
      console.error('Error fetching conversation messages:', error);
      return c.json({ error: error.message || 'Internal server error' }, 500);
    }
  });

  // Send a message in a conversation
  app.post('/make-server-cbd74580/conversations/:conversationId/messages', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const conversationId = c.req.param('conversationId');
      const { content, senderName } = await c.req.json();

      // Verify user is part of this conversation
      const conversation = await kv.get(conversationId) as any;
      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
      }

      if (!conversation.participants.includes(userId)) {
        return c.json({ error: 'Unauthorized to send messages in this conversation' }, 403);
      }

      // Get receiver ID (the other participant)
      const receiverId = conversation.participants.find((id: string) => id !== userId);

      // Check for personal contact info (basic pattern matching)
      const contactInfoPattern = /\b(\d{10,}|[\w.-]+@[\w.-]+\.\w+|(?:whatsapp|telegram|facebook|instagram|twitter)\b)/gi;
      if (contactInfoPattern.test(content)) {
        return c.json({ 
          error: 'Personal contact information detected. Please use the in-app messaging system.' 
        }, 400);
      }

      const message = {
        id: `conv-message:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        senderId: userId,
        senderName,
        receiverId,
        content,
        type: 'text',
        read: false,
        createdAt: new Date().toISOString(),
        deletable: false, // Messages are NOT deletable
      };

      await kv.set(message.id, message);

      // Update conversation's last activity
      conversation.updatedAt = new Date().toISOString();
      await kv.set(conversationId, conversation);

      // Create log entry for audit trail (non-deletable)
      const logEntry = {
        id: `conv-message-log:${Date.now()}`,
        messageId: message.id,
        conversationId,
        senderId: userId,
        receiverId,
        timestamp: new Date().toISOString(),
        action: 'message_sent',
      };
      await kv.set(logEntry.id, logEntry);

      // Notify recipient
      const recipientPrefs = await kv.get(`notification-preferences:${receiverId}`) as any;

      if (!recipientPrefs || recipientPrefs.inApp.messages) {
        const notification = {
          id: `notification:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          userId: receiverId,
          type: 'message',
          title: 'New Message',
          message: `You have a new message from ${senderName}`,
          data: { conversationId, messageId: message.id },
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
  app.post('/make-server-cbd74580/conversations/messages/:messageId/report', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const messageId = c.req.param('messageId');
      const { reportReason } = await c.req.json();

      const message = await kv.get(messageId) as any;
      if (!message) {
        return c.json({ error: 'Message not found' }, 404);
      }

      // Update message with report info (but don't delete it)
      message.reportedByUserId = userId;
      message.reportReason = reportReason;
      message.reportedAt = new Date().toISOString();
      await kv.set(messageId, message);

      // Create system alert for admin
      const alert = {
        id: `system-alert:${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'abuse_report',
        severity: 'high',
        title: 'Message Reported for Abuse',
        description: `A message in conversation ${message.conversationId} has been reported: ${reportReason}`,
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
        reportedBy: userId,
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
};
