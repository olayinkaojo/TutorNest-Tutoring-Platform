/**
 * Real-time Notifications Hook
 * Subscribes to real-time notification updates via polling + WebSocket fallback
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { notificationAPI, Notification } from '../utils/notification-api-client';
import { getSupabaseClient } from '../utils/supabase/client';

interface UseRealtimeNotificationsOptions {
  userId: string;
  accessToken: string;
  enabled?: boolean;
  pollInterval?: number;
  onNotification?: (notification: Notification) => void;
  onError?: (error: Error) => void;
}

export function useRealtimeNotifications({
  userId,
  accessToken,
  enabled = true,
  pollInterval = 30000, // 30 seconds (fallback polling)
  onNotification,
  onError,
}: UseRealtimeNotificationsOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const pollTimeoutId = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTime = useRef<number>(Date.now());
  const lastNotificationIds = useRef<Set<string>>(new Set());

  /**
   * Fetch new notifications and trigger callbacks for new ones
   */
  const checkForNewNotifications = useCallback(async () => {
    try {
      if (!userId || !accessToken || !enabled) {
        return;
      }

      const newNotifications = await notificationAPI.getNotifications(accessToken, userId);
      setNotifications(newNotifications);

      // Check for newly added notifications
      for (const notif of newNotifications) {
        if (!lastNotificationIds.current.has(notif.id)) {
          lastNotificationIds.current.add(notif.id);
          onNotification?.(notif);
        }
      }

      setIsConnected(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      setIsConnected(false);
    }
  }, [userId, accessToken, enabled, onNotification, onError]);

  /**
   * Setup Realtime subscription + fallback polling for new notifications
   */
  useEffect(() => {
    if (!enabled || !userId || !accessToken) {
      return;
    }

    // Initial fetch
    checkForNewNotifications();

    // Supabase Realtime subscription
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        // Re-fetch when notifications change
        checkForNewNotifications();
      })
      .subscribe();

    // Fallback polling at 30 seconds (reduced from 10)
    pollTimeoutId.current = setInterval(checkForNewNotifications, pollInterval);

    setIsConnected(true);

    return () => {
      supabase.removeChannel(channel);
      if (pollTimeoutId.current) {
        clearInterval(pollTimeoutId.current);
      }
    };
  }, [enabled, userId, accessToken, pollInterval, checkForNewNotifications]);

  /**
   * Manual trigger to check for new notifications (useful for explicit refresh)
   */
  const refresh = useCallback(async () => {
    await checkForNewNotifications();
  }, [checkForNewNotifications]);

  /**
   * Get unread count
   */
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    isConnected,
    notifications,
    unreadCount,
    refresh,
  };
}

/**
 * Hook for real-time report updates (student watching for new reports)
 */
export function useRealtimeStudentReports(
  studentId: string,
  accessToken: string,
  enabled: boolean = true,
  onReportSubmitted?: (reportId: string, title: string) => void
) {
  return useRealtimeNotifications({
    userId: studentId,
    accessToken,
    enabled,
    pollInterval: 30000,
    onNotification: (notification) => {
      if (notification.type === 'report' || notification.type === 'report_available') {
        onReportSubmitted?.(
          notification.metadata?.reportId || notification.id,
          notification.title
        );
      }
    },
  });
}

/**
 * Hook for real-time progress updates (tutor watching for student progress)
 */
export function useRealtimeTutorProgress(
  tutorId: string,
  accessToken: string,
  enabled: boolean = true,
  onProgressUpdate?: (studentId: string, improvement: number) => void
) {
  return useRealtimeNotifications({
    userId: tutorId,
    accessToken,
    enabled,
    pollInterval: 30000,
    onNotification: (notification) => {
      if (
        notification.type === 'system' &&
        notification.message?.includes('progress')
      ) {
        onProgressUpdate?.(
          notification.metadata?.studentId || '',
          notification.metadata?.improvement || 0
        );
      }
    },
  });
}

/**
 * Hook for real-time admin system alerts
 */
export function useRealtimeAdminAlerts(
  adminId: string,
  accessToken: string,
  enabled: boolean = true,
  onAlert?: (alertType: string, message: string) => void
) {
  return useRealtimeNotifications({
    userId: adminId,
    accessToken,
    enabled,
    pollInterval: 30000,
    onNotification: (notification) => {
      if (
        notification.type === 'system' ||
        notification.type === 'system_alert'
      ) {
        onAlert?.(
          notification.metadata?.alertType || 'general',
          notification.message
        );
      }
    },
  });
}
