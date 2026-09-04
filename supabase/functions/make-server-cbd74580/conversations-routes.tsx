import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';
import * as db from './db.tsx';
import { logAuditEvent } from './activity-log.tsx';
import {
  buildConversationId,
  collectBookingsForUser,
  conversationMatchesPersona,
  inferChannelFromRoles,
  isEligibleMessagingPair,
  type MessagingChannel,
} from './messaging-access.tsx';

async function requireAdminProfile(userId: string): Promise<any | null> {
  const profile = ((await kv.get(`user:${userId}`)) as any) ?? (await db.getProfile(userId));
  if (!profile || profile.role !== 'admin') return null;
  return profile;
}

const MAX_MESSAGE_LENGTH = 8000;

function containsContactInfo(content: string): boolean {
  const pattern = /\b(\d{10,}|[\w.-]+@[\w.-]+\.\w+|(?:whatsapp|telegram|facebook|instagram|twitter)\b)/gi;
  return pattern.test(content);
}

export const conversationsRoutes = (app: Hono, getUserId: Function) => {
  // Mark conversation read (no-op compatibility — read receipts happen on GET messages)
  app.post('/make-server-cbd74580/conversations/:conversationId/read', async (c) => {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const userId = await getUserId(accessToken ?? null);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const conversationId = c.req.param('conversationId');
    const conversation = await kv.get(conversationId) as Record<string, unknown> | null;
    if (!conversation) return c.json({ error: 'Conversation not found' }, 404);
    const parts = conversation.participants as string[] | undefined;
    if (!parts?.includes(userId)) return c.json({ error: 'Forbidden' }, 403);
    return c.body(null, 204);
  });

  // Get or create a conversation (booking-scoped personas: parent vs tutor threads stay separate)
  app.post('/make-server-cbd74580/conversations/get-or-create', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const body = await c.req.json();
      const participantId = body.participantId as string;
      const participantName = body.participantName as string;
      const participantRole = String(body.participantRole || '').toLowerCase();
      let channel = body.channel as MessagingChannel | undefined;
      const dashboardRole = String(body.dashboardRole || body.messagingPersona || '').toLowerCase();

      if (!participantId || participantId === userId) {
        return c.json({ error: 'Invalid participant' }, 400);
      }

      if (!channel && dashboardRole) {
        const inferred = inferChannelFromRoles(dashboardRole, participantRole);
        if (inferred) channel = inferred;
      }
      if (!channel || !['parent-tutor', 'tutor-parent', 'tutor-student'].includes(channel)) {
        return c.json(
          {
            error: 'Missing or invalid channel',
            hint: 'Send channel (parent-tutor | tutor-parent | tutor-student) or dashboardRole + participantRole.',
          },
          400,
        );
      }

      const myBookings = await collectBookingsForUser(userId);
      if (!isEligibleMessagingPair(myBookings, userId, participantId, channel as MessagingChannel)) {
        return c.json(
          {
            error: 'Messaging is limited to people you have an active session with.',
            code: 'MESSAGING_NOT_ALLOWED',
          },
          403,
        );
      }

      const conversationId = buildConversationId(userId, participantId, channel as MessagingChannel);
      let conversation = (await kv.get(conversationId)) as Record<string, unknown> | null;

      if (!conversation) {
        const [p1, p2] = [userId, participantId].sort();
        let myRoleLabel = 'user';
        if (channel === 'parent-tutor') myRoleLabel = 'parent';
        else if (channel === 'tutor-parent') myRoleLabel = 'tutor';
        else {
          const hit = myBookings.some((raw) => {
            const b = raw as Record<string, unknown>;
            return b.tutorId === userId && b.studentId === participantId;
          });
          myRoleLabel = hit ? 'tutor' : 'student';
        }

        conversation = {
          id: conversationId,
          participants: [p1, p2],
          channel,
          participantRoles: {
            [userId]: myRoleLabel,
            [participantId]: participantRole || 'user',
          },
          participantNames: {
            [participantId]: participantName || 'User',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await kv.set(conversationId, conversation);
      }

      return c.json({ conversation });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error getting/creating conversation:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
    }
  });

  // Get all conversations for a user (optionally scoped to current dashboard persona)
  app.get('/make-server-cbd74580/conversations', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);

      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const persona = (c.req.query('persona') || 'all').toLowerCase();

      const allConversations = await kv.getByPrefix('conversation:');

      const userConversations = allConversations.filter((conv: Record<string, unknown>) => {
        const parts = conv.participants as string[] | undefined;
        if (!parts?.includes(userId)) return false;
        return conversationMatchesPersona(
          conv as { channel?: string; participantRoles?: Record<string, string> },
          persona,
          userId,
        );
      });

      const allMessages = await kv.getByPrefix('conv-message:');

      const conversationsWithDetails = await Promise.all(
        userConversations.map(async (conv: Record<string, unknown>) => {
          const convId = conv.id as string;
          const convMessages = allMessages
            .filter((msg: Record<string, unknown>) => msg.conversationId === convId)
            .sort(
              (a: Record<string, unknown>, b: Record<string, unknown>) =>
                new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime(),
            );

          const lastMessage = convMessages[0];
          const unreadCount = convMessages.filter(
            (msg: Record<string, unknown>) => msg.receiverId === userId && !msg.read,
          ).length;

          return {
            ...conv,
            lastMessage,
            unreadCount,
          };
        }),
      );

      conversationsWithDetails.sort((a, b) => {
        const aTime = (a.lastMessage as { createdAt?: string } | undefined)?.createdAt || (a.updatedAt as string);
        const bTime = (b.lastMessage as { createdAt?: string } | undefined)?.createdAt || (b.updatedAt as string);
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      return c.json({ conversations: conversationsWithDetails });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error fetching conversations:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
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

      const conversationId = decodeURIComponent(c.req.param('conversationId'));

      const conversation = (await kv.get(conversationId)) as Record<string, unknown> | null;
      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
      }

      const parts = conversation.participants as string[] | undefined;
      if (!parts?.includes(userId)) {
        return c.json({ error: 'Unauthorized to view this conversation' }, 403);
      }

      const allMessages = await kv.getByPrefix('conv-message:');
      const conversationMessages = allMessages
        .filter((m: Record<string, unknown>) => m.conversationId === conversationId)
        .sort(
          (a: Record<string, unknown>, b: Record<string, unknown>) =>
            new Date(String(a.createdAt)).getTime() - new Date(String(b.createdAt)).getTime(),
        );

      const unreadMessages = conversationMessages.filter(
        (msg: Record<string, unknown>) => msg.receiverId === userId && !msg.read,
      );

      for (const msg of unreadMessages) {
        (msg as { read: boolean; readAt?: string }).read = true;
        (msg as { readAt?: string }).readAt = new Date().toISOString();
        await kv.set(msg.id as string, msg);
      }

      return c.json({ messages: conversationMessages });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error fetching conversation messages:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
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

      const conversationId = decodeURIComponent(c.req.param('conversationId'));
      const { content, senderName } = await c.req.json();

      if (!content || typeof content !== 'string' || !content.trim()) {
        return c.json({ error: 'Message content is required' }, 400);
      }
      if (content.length > MAX_MESSAGE_LENGTH) {
        return c.json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` }, 400);
      }

      const conversation = (await kv.get(conversationId)) as Record<string, unknown> | null;
      if (!conversation) {
        return c.json({ error: 'Conversation not found' }, 404);
      }

      const parts = conversation.participants as string[] | undefined;
      if (!parts?.includes(userId)) {
        return c.json({ error: 'Unauthorized to send messages in this conversation' }, 403);
      }

      const channel = conversation.channel as MessagingChannel | undefined;
      if (channel) {
        const receiverId = parts.find((id: string) => id !== userId) || '';
        const myBookings = await collectBookingsForUser(userId);
        if (!isEligibleMessagingPair(myBookings, userId, receiverId, channel)) {
          return c.json({ error: 'This conversation is no longer eligible for messaging.', code: 'STALE_THREAD' }, 403);
        }
      }

      const receiverId = parts.find((id: string) => id !== userId) as string;

      if (containsContactInfo(content)) {
        return c.json({
          error: 'Personal contact information detected. Please use the in-app messaging system.',
        }, 400);
      }

      const message = {
        id: `conv-message:${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        conversationId,
        senderId: userId,
        senderName: typeof senderName === 'string' && senderName.trim() ? senderName.trim() : 'User',
        receiverId,
        content: content.trim(),
        type: 'text',
        read: false,
        createdAt: new Date().toISOString(),
        deletable: false,
      };

      await kv.set(message.id, message);

      conversation.updatedAt = new Date().toISOString();
      await kv.set(conversationId, conversation);

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

      const recipientPrefs = await kv.get(`notification-preferences:${receiverId}`) as Record<string, unknown> | null;

      if (!recipientPrefs || (recipientPrefs.inApp as { messages?: boolean } | undefined)?.messages !== false) {
        const notification = {
          id: `notification:${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          userId: receiverId,
          type: 'message',
          title: 'New Message',
          message: `You have a new message from ${message.senderName}`,
          data: { conversationId, messageId: message.id },
          read: false,
          priority: 'medium',
          createdAt: new Date().toISOString(),
        };
        await kv.set(notification.id, notification);
      }

      return c.json({ message });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error sending message:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
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

      const message = (await kv.get(messageId)) as Record<string, unknown> | null;
      if (!message) {
        return c.json({ error: 'Message not found' }, 404);
      }

      message.reportedByUserId = userId;
      message.reportReason = reportReason;
      message.reportedAt = new Date().toISOString();
      await kv.set(messageId, message);

      const alert = {
        id: `system-alert:${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error reporting message:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
    }
  });

  // ── Safeguarding: admin access to retained chat histories ─────────────────
  // Messages are never deleted by any user-facing action in this file (report
  // just flags one), so this is a full, permanent record. List view first —
  // no message content here, just enough to find the right conversation.
  app.get('/make-server-cbd74580/admin/conversations', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);
      const admin = await requireAdminProfile(userId);
      if (!admin) return c.json({ error: 'Admin access required' }, 403);

      // Investigating a specific person (tutor/parent/student) is the primary
      // safeguarding use case — pull every conversation they've been part of.
      const filterUserId = c.req.query('userId') || '';

      const [allConversations, allMessages] = await Promise.all([
        kv.getByPrefix('conversation:'),
        kv.getByPrefix('conv-message:'),
      ]);

      const filtered = filterUserId
        ? allConversations.filter((conv: any) =>
            (conv.participants as string[] | undefined)?.includes(filterUserId)
          )
        : allConversations;

      const nameCache = new Map<string, string>();
      const resolveName = async (id: string): Promise<string> => {
        if (nameCache.has(id)) return nameCache.get(id)!;
        const p = ((await kv.get(`user:${id}`)) as any) ?? (await db.getProfile(id).catch(() => null));
        const name =
          p?.fullName || p?.full_name || p?.name ||
          (p?.firstName ? `${p.firstName} ${p.lastName ?? ''}`.trim() : null) ||
          'Unknown';
        nameCache.set(id, name);
        return name;
      };

      const rows = await Promise.all(
        (filtered as any[]).map(async (conv: any) => {
          const convMessages = allMessages.filter((m: any) => m.conversationId === conv.id);
          const flaggedCount = convMessages.filter((m: any) => m.reportedByUserId).length;
          const lastMessage = [...convMessages].sort(
            (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          const participantIds: string[] = conv.participants || [];
          const participants = await Promise.all(
            participantIds.map(async (pid: string) => ({
              id: pid,
              name: conv.participantNames?.[pid] || (await resolveName(pid)),
              role: conv.participantRoles?.[pid] || 'user',
            }))
          );

          return {
            id: conv.id,
            channel: conv.channel || null,
            participants,
            messageCount: convMessages.length,
            flaggedCount,
            lastMessageAt: lastMessage?.createdAt || conv.updatedAt || conv.createdAt,
            lastMessagePreview: lastMessage?.content ? String(lastMessage.content).slice(0, 140) : null,
            createdAt: conv.createdAt,
          };
        })
      );

      rows.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());

      return c.json({ conversations: rows });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error fetching admin conversations:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
    }
  });

  // Full, unredacted transcript of one conversation — the sensitive read.
  // Every access is audit-logged against BOTH participants (who, when, how
  // many messages) rather than just fired silently: for safeguarding tooling,
  // proof of *when the platform looked* is as important as the ability to
  // look at all, and it means an admin can't quietly browse chats without a
  // trace landing on the affected users' own audit history.
  app.get('/make-server-cbd74580/admin/conversations/:conversationId/messages', async (c) => {
    try {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      const userId = await getUserId(accessToken ?? null);
      if (!userId) return c.json({ error: 'Unauthorized' }, 401);
      const admin = await requireAdminProfile(userId);
      if (!admin) return c.json({ error: 'Admin access required' }, 403);

      const conversationId = decodeURIComponent(c.req.param('conversationId'));
      const conversation = (await kv.get(conversationId)) as Record<string, unknown> | null;
      if (!conversation) return c.json({ error: 'Conversation not found' }, 404);

      const allMessages = await kv.getByPrefix('conv-message:');
      const messages = allMessages
        .filter((m: any) => m.conversationId === conversationId)
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const participantIds = (conversation.participants as string[] | undefined) || [];
      const adminId = userId;
      await Promise.all(
        participantIds.map((pid) =>
          logAuditEvent({
            userId: pid,
            adminId,
            action: 'admin_viewed_chat_history',
            category: 'moderation',
            description: `Admin accessed the chat history of a conversation this user is part of (${messages.length} messages) — safeguarding/investigation access.`,
            severity: 'warning',
            metadata: { conversationId, messageCount: messages.length, participants: participantIds },
          })
        )
      );

      return c.json({ conversation, messages });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Error fetching admin conversation transcript:', error);
      return c.json({ error: err.message || 'Internal server error' }, 500);
    }
  });
};
