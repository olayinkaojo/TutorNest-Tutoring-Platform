// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION BROKER - Unified Notification System
// ═══════════════════════════════════════════════════════════════════════════════
// Handles ALL notifications across the application:
// - Payment Notifications (all types)
// - Booking Notifications
// - Session Notifications
// - Admin Notifications
// - System Alerts

type NotificationType =
  | 'payment_initiated'
  | 'payment_received'
  | 'payment_failed'
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'session_reminder'
  | 'session_completed'
  | 'report_available'
  | 'payout_processed'
  | 'payout_failed'
  | 'subscription_activated'
  | 'subscription_changed'
  | 'bookshop_purchase'
  | 'credit_topup'
  | 'tutor_verified'
  | 'account_sanctioned'
  | 'dispute_filed'
  | 'system_alert'
  // Widened 2026-09-10 when every other notification-creation call site
  // in the codebase (14 of them, across 9 files) was migrated to this one
  // function, to fix the same class of unbounded-scan cost the equivalent
  // conversation/booking indices already fixed — GET /notifications/:userId
  // is polled every 30 seconds from every dashboard, and used to
  // kv.getByPrefix('notification:') across the whole platform every time.
  // Rather than invent a second index under a different key, this file's
  // existing (already correct, already live for bookshop purchases)
  // user_notifications:<userId> index became the one canonical index.
  | (string & {});

interface NotificationPayload {
  type: NotificationType;
  userId: string; // Primary recipient
  secondaryUserIds?: string[]; // Additional recipients (e.g., admin, tutor)
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  data?: Record<string, any>; // alias for metadata — several migrated call sites already called their field `data`
  metadata?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical' | 'medium';
  read?: boolean; // always false for a new notification; accepted so migrated call sites can pass it through unchanged
  sendEmail?: boolean;
  sendInApp?: boolean;
}

interface NotificationMessage {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  read: boolean;
  readAt?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata: Record<string, any>;
  createdAt: string;
  sentVia: {
    email: boolean;
    inApp: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE NOTIFICATION BROKER
// ═══════════════════════════════════════════════════════════════════════════════

export async function createNotification(
  kv: any,
  payload: NotificationPayload
): Promise<{ success: boolean; notificationId: string; error?: string }> {
  try {
    // The id IS the KV key (matches every other notification-creation site
    // in the codebase) — this used to be generated without the
    // "notification:" prefix while the actual kv.set below added it
    // separately, so a notification's own .id field never matched its real
    // KV key. That broke two things silently: the index below (pushing an
    // id that doesn't resolve to anything via kv.mget) and POST
    // /notifications/:notificationId/read (kv.get(notificationId) using the
    // unprefixed id would never find the record). Only reachable for
    // bookshop purchases before this function became the one place every
    // notification-creation site in the codebase goes through, so it went
    // unnoticed until GET /notifications/:userId started reading from this
    // index instead of a full scan.
    const notificationId = `notification:${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`;

    const notification: NotificationMessage = {
      id: notificationId,
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      description: payload.description,
      actionUrl: payload.actionUrl,
      read: false,
      priority: payload.priority || 'normal',
      metadata: payload.metadata ?? payload.data ?? {},
      createdAt: new Date().toISOString(),
      sentVia: {
        email: payload.sendEmail !== false,
        inApp: payload.sendInApp !== false,
      },
    };

    // Store in KV (primary storage)
    await kv.set(notificationId, notification);

    // Add to user's notification list for quick retrieval
    const userNotificationsKey = `user_notifications:${payload.userId}`;
    const userNotifications = (await kv.get(userNotificationsKey)) as string[] || [];
    userNotifications.push(notificationId);
    // Keep only last 100 notifications
    if (userNotifications.length > 100) {
      userNotifications.shift();
    }
    await kv.set(userNotificationsKey, userNotifications);

    // If high/critical priority, also notify secondary users (e.g., admin for critical)
    if (payload.secondaryUserIds && (payload.priority === 'high' || payload.priority === 'critical')) {
      for (const secondaryUserId of payload.secondaryUserIds) {
        const secondaryNotification: NotificationMessage = {
          ...notification,
          id: `notification:${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`,
          userId: secondaryUserId,
          metadata: {
            ...notification.metadata,
            originalRecipient: payload.userId,
          },
        };

        await kv.set(secondaryNotification.id, secondaryNotification);

        const secondaryKey = `user_notifications:${secondaryUserId}`;
        const secondaryList = (await kv.get(secondaryKey)) as string[] || [];
        secondaryList.push(secondaryNotification.id);
        if (secondaryList.length > 100) {
          secondaryList.shift();
        }
        await kv.set(secondaryKey, secondaryList);
      }
    }

    console.log(`[NotificationBroker] Created notification: ${notificationId} (${payload.type}) for ${payload.userId}`);

    return {
      success: true,
      notificationId,
    };
  } catch (error: unknown) {
    console.error('[NotificationBroker] Error creating notification:', error);
    return {
      success: false,
      notificationId: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAYMENT NOTIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createPaymentReceivedNotification(
  tutorId: string,
  amount: number,
  bookingId: string,
  studentName: string,
  adminId?: string
): NotificationPayload {
  return {
    type: 'payment_received',
    userId: tutorId,
    secondaryUserIds: adminId ? [adminId] : undefined,
    title: 'Payment Received ✓',
    message: `You've earned ₦${amount.toLocaleString()} from ${studentName}'s session booking`,
    description: `Payment for booking #${bookingId}. Funds are now in your pending balance and will be available for payout.`,
    actionUrl: `/tutor/dashboard?tab=payouts`,
    metadata: {
      bookingId,
      amount,
      studentName,
      type: 'booking_payment',
    },
    priority: 'high',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createPaymentFailedNotification(
  studentId: string,
  amount: number,
  reason: string,
  adminId?: string
): NotificationPayload {
  return {
    type: 'payment_failed',
    userId: studentId,
    secondaryUserIds: adminId ? [adminId] : undefined,
    title: 'Payment Failed ✗',
    message: `Payment of ₦${amount.toLocaleString()} could not be processed`,
    description: `Reason: ${reason}. Please try again or contact support.`,
    actionUrl: `/parent/dashboard?tab=payments`,
    metadata: {
      amount,
      reason,
      type: 'payment_error',
    },
    priority: 'high',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createSubscriptionActivatedNotification(
  parentId: string,
  tierName: string
): NotificationPayload {
  return {
    type: 'subscription_activated',
    userId: parentId,
    title: `${tierName} Plan Activated ✓`,
    message: `Your ${tierName} subscription is now active`,
    description: `You now have access to all ${tierName} features including books, resources, and tutoring discounts.`,
    actionUrl: `/parent/dashboard?tab=subscription`,
    metadata: {
      tier: tierName,
      type: 'subscription',
    },
    priority: 'normal',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createBookshopPurchaseNotification(
  userId: string,
  bookTitles: string[],
  totalAmount: number
): NotificationPayload {
  const bookList = bookTitles.length > 1 
    ? `${bookTitles.slice(0, -1).join(', ')} and ${bookTitles[bookTitles.length - 1]}`
    : bookTitles[0];

  return {
    type: 'bookshop_purchase',
    userId,
    title: 'Book Purchase Confirmed ✓',
    message: `Successfully purchased: ${bookList}`,
    description: `Total: £${totalAmount.toFixed(2)}. Books are now available in your library.`,
    actionUrl: `/parent/dashboard?tab=bookshop`,
    metadata: {
      bookTitles,
      amount: totalAmount,
      type: 'bookshop',
    },
    priority: 'normal',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createPayoutProcessedNotification(
  tutorId: string,
  amount: number,
  bankName: string,
  transactionId: string
): NotificationPayload {
  return {
    type: 'payout_processed',
    userId: tutorId,
    title: 'Payout Processed ✓',
    message: `₦${amount.toLocaleString()} has been transferred to your ${bankName} account`,
    description: `Transaction ID: ${transactionId}. Funds should arrive within 24 hours.`,
    actionUrl: `/tutor/dashboard?tab=payouts`,
    metadata: {
      amount,
      bankName,
      transactionId,
      type: 'payout_success',
    },
    priority: 'high',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createPayoutFailedNotification(
  tutorId: string,
  amount: number,
  reason: string,
  adminId: string
): NotificationPayload {
  return {
    type: 'payout_failed',
    userId: tutorId,
    secondaryUserIds: [adminId],
    title: 'Payout Failed ✗',
    message: `Payout of ₦${amount.toLocaleString()} could not be processed`,
    description: `Reason: ${reason}. Our admin team has been notified and will contact you shortly.`,
    actionUrl: `/tutor/dashboard?tab=payouts`,
    metadata: {
      amount,
      reason,
      type: 'payout_error',
    },
    priority: 'critical',
    sendEmail: true,
    sendInApp: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING & SESSION NOTIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createBookingConfirmedNotification(
  parentId: string,
  tutorName: string,
  sessionDate: string,
  sessionTime: string
): NotificationPayload {
  return {
    type: 'booking_confirmed',
    userId: parentId,
    title: 'Booking Confirmed ✓',
    message: `Your session with ${tutorName} is confirmed`,
    description: `Session scheduled for ${sessionDate} at ${sessionTime}. Join the live session 5 minutes early.`,
    actionUrl: `/parent/dashboard?tab=bookings`,
    metadata: {
      tutorName,
      sessionDate,
      sessionTime,
      type: 'booking',
    },
    priority: 'normal',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createSessionReminderNotification(
  userId: string,
  minutesBefore: number,
  sessionDetails: string,
  sessionId: string
): NotificationPayload {
  return {
    type: 'session_reminder',
    userId,
    title: `Session Starting in ${minutesBefore} Minutes`,
    message: `${sessionDetails}`,
    description: 'Click to join the live session',
    actionUrl: `/session/${sessionId}`,
    metadata: {
      sessionId,
      minutesBefore,
      type: 'reminder',
    },
    priority: minutesBefore <= 5 ? 'high' : 'normal',
    sendEmail: minutesBefore >= 60,
    sendInApp: true,
  };
}

export function createSessionCompletedNotification(
  userId: string,
  sessionDate: string,
  reportUrl: string
): NotificationPayload {
  return {
    type: 'session_completed',
    userId,
    title: 'Session Report Available',
    message: `Your session from ${sessionDate} has been completed`,
    description: 'View the detailed report with feedback and recommendations',
    actionUrl: reportUrl,
    metadata: {
      sessionDate,
      type: 'report',
    },
    priority: 'normal',
    sendEmail: true,
    sendInApp: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN NOTIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function createDisputeFiledNotification(
  adminId: string,
  complainantName: string,
  disputeType: string,
  amount: number,
  disputeId: string
): NotificationPayload {
  return {
    type: 'dispute_filed',
    userId: adminId,
    title: 'New Dispute Filed',
    message: `${complainantName} filed a ${disputeType} dispute`,
    description: `Amount: ₦${amount.toLocaleString()}. Requires immediate review.`,
    actionUrl: `/admin/disputes/${disputeId}`,
    metadata: {
      complainantName,
      disputeType,
      amount,
      disputeId,
      type: 'admin_action',
    },
    priority: 'critical',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createTutorVerifiedNotification(
  adminId: string,
  tutorName: string,
  tutorId: string
): NotificationPayload {
  return {
    type: 'tutor_verified',
    userId: adminId,
    title: 'Tutor Verification Completed',
    message: `${tutorName} has been verified and is now active`,
    description: 'They can now accept student bookings',
    actionUrl: `/admin/tutors/${tutorId}`,
    metadata: {
      tutorName,
      tutorId,
      type: 'admin_action',
    },
    priority: 'normal',
    sendEmail: true,
    sendInApp: true,
  };
}

export function createSystemAlertNotification(
  adminId: string,
  alertTitle: string,
  alertMessage: string,
  severity: 'warning' | 'error' | 'critical'
): NotificationPayload {
  return {
    type: 'system_alert',
    userId: adminId,
    title: `System Alert: ${alertTitle}`,
    message: alertMessage,
    actionUrl: `/admin/alerts`,
    metadata: {
      severity,
      type: 'system',
    },
    priority: severity === 'critical' ? 'critical' : severity === 'error' ? 'high' : 'normal',
    sendEmail: severity === 'critical',
    sendInApp: true,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT NOTIFICATION BROKER
// ═══════════════════════════════════════════════════════════════════════════════

export const NotificationBroker = {
  createNotification,
  // Payment notifications
  createPaymentReceivedNotification,
  createPaymentFailedNotification,
  createSubscriptionActivatedNotification,
  createBookshopPurchaseNotification,
  createPayoutProcessedNotification,
  createPayoutFailedNotification,
  // Booking notifications
  createBookingConfirmedNotification,
  createSessionReminderNotification,
  createSessionCompletedNotification,
  // Admin notifications
  createDisputeFiledNotification,
  createTutorVerifiedNotification,
  createSystemAlertNotification,
};
