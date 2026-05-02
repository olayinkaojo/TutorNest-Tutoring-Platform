/**
 * Centralized Notification API Client
 * Handles all notification operations across all dashboards
 * (Student, Parent, Tutor, Admin)
 */

import { edgeFunctionBaseUrl, edgeFunctionHeaders } from './supabase-edge-fetch';

const API_BASE_URL = edgeFunctionBaseUrl();
const TIMEOUT_MS = 30000;
const CACHE_TTL_MS = 5000; // 5 seconds

// Request cache to prevent duplicate requests
const requestCache = new Map<string, { promise: Promise<any>; timestamp: number }>();

export interface Notification {
  id: string;
  userId: string;
  type: 'payment_initiated' | 'payment_received' | 'payment_failed' | 
        'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 
        'session_reminder' | 'session_completed' | 
        'report_available' | 'report_submitted' | 'report_rated' |
        'payout_processed' | 'payout_failed' |
        'subscription_activated' | 'subscription_changed' |
        'bookshop_purchase' | 'credit_topup' |
        'tutor_verified' | 'account_sanctioned' |
        'dispute_filed' | 'system_alert' |
        'booking' | 'reminder' | 'message' | 'report' | 'payment' | 'system';
  title: string;
  message: string;
  description?: string;
  actionUrl?: string;
  read: boolean;
  readAt?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
  createdAt: string;
  sentVia?: {
    email: boolean;
    inApp: boolean;
  };
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  bookingReminders?: any[];
}

export class NotificationAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NotificationAPIError';
  }
}

/**
 * Make an authenticated API request
 */
async function makeRequest<T>(
  endpoint: string,
  accessToken: string,
  options: { method?: string; body?: any; skipCache?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, skipCache = false } = options;
  const url = `${API_BASE_URL}${endpoint}`;
  const cacheKey = `${method}:${url}`;

  // Check cache for GET requests
  if (method === 'GET' && !skipCache) {
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.promise;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const promise = (async () => {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...edgeFunctionHeaders(accessToken),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new NotificationAPIError(
          errorData.code || `HTTP_${response.status}`,
          errorData.message || errorData.error || `HTTP ${response.status}`,
          response.status,
          errorData
        );
      }

      return await response.json() as T;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof NotificationAPIError) throw err;
      throw new NotificationAPIError(
        'REQUEST_FAILED',
        err instanceof Error ? err.message : 'Unknown error',
        0,
        err
      );
    }
  })();

  // Cache GET requests
  if (method === 'GET' && !skipCache) {
    requestCache.set(cacheKey, { promise, timestamp: Date.now() });
  }

  return promise;
}

/**
 * Get all notifications for a user
 * @param accessToken User's access token
 * @param userId User ID
 * @returns List of notifications
 */
export async function getNotifications(
  accessToken: string,
  userId: string
): Promise<Notification[]> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!userId || typeof userId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'User ID required', 400);
  }

  try {
    const response = await makeRequest<NotificationResponse>(
      `/notifications/${userId}`,
      accessToken,
      { method: 'GET' }
    );

    return response.notifications || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    // Return empty array on error for graceful degradation
    return [];
  }
}

/**
 * Get unread notification count
 * @param accessToken User's access token
 * @param userId User ID
 * @returns Unread count
 */
export async function getUnreadCount(
  accessToken: string,
  userId: string
): Promise<number> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!userId || typeof userId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'User ID required', 400);
  }

  try {
    const response = await makeRequest<NotificationResponse>(
      `/notifications/${userId}`,
      accessToken,
      { method: 'GET' }
    );

    return response.unreadCount || 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
}

/**
 * Mark a notification as read
 * @param accessToken User's access token
 * @param notificationId Notification ID
 * @returns Updated notification
 */
export async function markAsRead(
  accessToken: string,
  notificationId: string
): Promise<Notification> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!notificationId || typeof notificationId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Notification ID required', 400);
  }

  try {
    return await makeRequest<Notification>(
      `/notifications/${notificationId}/read`,
      accessToken,
      { method: 'POST', skipCache: true }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 * @param accessToken User's access token
 * @param userId User ID
 * @returns Count of marked notifications
 */
export async function markAllAsRead(
  accessToken: string,
  userId: string
): Promise<number> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!userId || typeof userId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'User ID required', 400);
  }

  try {
    const response = await makeRequest<{ count: number }>(
      `/notifications/${userId}/read-all`,
      accessToken,
      { method: 'POST', skipCache: true }
    );

    return response.count || 0;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Get notifications filtered by type
 * @param accessToken User's access token
 * @param userId User ID
 * @param type Notification type to filter
 * @returns Filtered notifications
 */
export async function getNotificationsByType(
  accessToken: string,
  userId: string,
  type: Notification['type']
): Promise<Notification[]> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!userId || typeof userId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'User ID required', 400);
  }

  if (!type || typeof type !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Notification type required', 400);
  }

  try {
    const allNotifications = await getNotifications(accessToken, userId);
    return allNotifications.filter(n => n.type === type);
  } catch (error) {
    console.error('Error filtering notifications:', error);
    return [];
  }
}

/**
 * Get unread notifications only
 * @param accessToken User's access token
 * @param userId User ID
 * @returns Unread notifications
 */
export async function getUnreadNotifications(
  accessToken: string,
  userId: string
): Promise<Notification[]> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!userId || typeof userId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'User ID required', 400);
  }

  try {
    const allNotifications = await getNotifications(accessToken, userId);
    return allNotifications.filter(n => !n.read);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

/**
 * Delete a notification
 * @param accessToken User's access token
 * @param notificationId Notification ID
 * @returns Success status
 */
export async function deleteNotification(
  accessToken: string,
  notificationId: string
): Promise<boolean> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!notificationId || typeof notificationId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Notification ID required', 400);
  }

  try {
    await makeRequest(
      `/notifications/${notificationId}`,
      accessToken,
      { method: 'DELETE', skipCache: true }
    );

    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}

/**
 * Test notification endpoint
 * @param accessToken User's access token
 * @returns Test response
 */
export async function testNotificationEndpoint(
  accessToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    return await makeRequest(
      `/notifications/test`,
      accessToken,
      { method: 'GET' }
    );
  } catch (error) {
    console.error('Error testing notification endpoint:', error);
    throw error;
  }
}

/**
 * Get booking reminders (notifications about upcoming sessions)
 * @param accessToken User's access token
 * @param userId User ID
 * @returns List of booking reminders
 */
export async function getBookingReminders(
  accessToken: string,
  userId: string
): Promise<any[]> {
  if (!accessToken || typeof accessToken !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'Access token required', 400);
  }

  if (!userId || typeof userId !== 'string') {
    throw new NotificationAPIError('INVALID_INPUT', 'User ID required', 400);
  }

  try {
    const response = await makeRequest<NotificationResponse>(
      `/notifications/${userId}`,
      accessToken,
      { method: 'GET' }
    );

    return response.bookingReminders || [];
  } catch (error) {
    console.error('Error fetching booking reminders:', error);
    return [];
  }
}

/**
 * Clear cache for refresh
 */
export function clearNotificationCache(): void {
  requestCache.clear();
}

/**
 * Get cache stats (for debugging)
 */
export function getNotificationCacheStats(): { size: number; entries: string[] } {
  return {
    size: requestCache.size,
    entries: Array.from(requestCache.keys()),
  };
}

// Export all functions as a namespace for convenience
export const notificationAPI = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationsByType,
  getUnreadNotifications,
  deleteNotification,
  testNotificationEndpoint,
  getBookingReminders,
  clearNotificationCache,
  getNotificationCacheStats,
};
