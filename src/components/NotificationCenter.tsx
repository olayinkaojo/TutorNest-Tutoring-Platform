import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { 
  Bell, 
  BellRing,
  CheckCircle,
  Calendar,
  MessageSquare,
  FileText,
  DollarSign,
  AlertCircle,
  Clock,
  Video,
  X
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { notificationAPI, Notification } from '../utils/notification-api-client';

interface NotificationCenterProps {
  session: any;
  userId: string;
}

export function NotificationCenter({ session, userId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token || !userId) {
      console.log('NotificationCenter: Waiting for session...');
      setLoading(false);
      return;
    }

    try {
      const notifications = await notificationAPI.getNotifications(session.access_token, userId);
      setNotifications(notifications);
    } catch (err: any) {
      console.error('Error fetching notifications:', err?.message || err);
      // Keep existing notifications on error for better UX
      if (err?.status === 401) {
        console.log('Token expired, attempting to refresh session...');
        const supabase = getSupabaseClient();
        const { data: { session: newSession }, error } = await supabase.auth.refreshSession();
        
        if (newSession && !error) {
          console.log('Session refreshed successfully');
          // The session will be updated via auth state change listener and this function will be called again
          return;
        }
      }
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, userId]);

  useEffect(() => {
    // Only fetch if we have both session and userId
    if (session?.access_token && userId) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [fetchNotifications, userId, session?.access_token]); // Only depend on access_token, not the whole session object

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationAPI.markAsRead(session.access_token, notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead(session.access_token, userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationAPI.deleteNotification(session.access_token, notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'reminder': return <Clock className="w-5 h-5 text-amber-600" />;
      case 'message': return <MessageSquare className="w-5 h-5 text-green-600" />;
      case 'report': return <FileText className="w-5 h-5 text-purple-600" />;
      case 'payment': return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'system': return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default: return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const NotificationItem = ({ notification }: { notification: Notification }) => (
    <div
      className={`p-4 border-b last:border-b-0 transition-all hover:bg-gray-50 ${
        !notification.read ? 'bg-blue-50' : ''
      }`}
      onClick={() => !notification.read && markAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{getNotificationIcon(notification.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
              {notification.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNotification(notification.id);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{formatTime(notification.createdAt)}</span>
            {!notification.read && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                New
              </Badge>
            )}
          </div>
          {notification.actionUrl && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = notification.actionUrl!;
              }}
            >
              View Details
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              style={{ backgroundColor: '#5d9827', color: 'white' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-8 h-8 animate-pulse mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="font-medium mb-1">No notifications yet</p>
            <p className="text-sm">We'll notify you when something happens</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-cols-3 gap-0 rounded-none border-b min-w-0">
              <TabsTrigger value="all" className="rounded-none px-1.5 text-xs sm:px-3 sm:text-sm">
                All ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="rounded-none px-1.5 text-xs sm:px-3 sm:text-sm">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read" className="rounded-none px-1.5 text-xs sm:px-3 sm:text-sm">
                Read ({readNotifications.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-96">
              <TabsContent value="all" className="m-0">
                {notifications.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </TabsContent>

              <TabsContent value="unread" className="m-0">
                {unreadNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No unread notifications</p>
                  </div>
                ) : (
                  unreadNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="read" className="m-0">
                {readNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No read notifications</p>
                  </div>
                ) : (
                  readNotifications.map((notification) => (
                    <NotificationItem key={notification.id} notification={notification} />
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
}