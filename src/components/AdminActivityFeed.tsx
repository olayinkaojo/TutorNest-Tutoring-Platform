import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  UserPlus,
  FileCheck,
  DollarSign,
  BookOpen,
  Star,
  AlertTriangle,
  MessageSquare,
  Calendar,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface AdminActivityFeedProps {
  session: any;
}

export function AdminActivityFeed({ session }: AdminActivityFeedProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadActivities = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/activity`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_signup': return UserPlus;
      case 'tutor_verification': return FileCheck;
      case 'booking_created': return Calendar;
      case 'booking_completed': return CheckCircle;
      case 'booking_cancelled': return XCircle;
      case 'payment_received': return DollarSign;
      case 'review_posted': return Star;
      case 'message_sent': return MessageSquare;
      case 'alert_triggered': return AlertTriangle;
      default: return Clock;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user_signup': return '#625d9c';
      case 'tutor_verification': return '#5d9827';
      case 'booking_created': return '#3b82f6';
      case 'booking_completed': return '#10b981';
      case 'booking_cancelled': return '#ef4444';
      case 'payment_received': return '#10b981';
      case 'review_posted': return '#f59e0b';
      case 'message_sent': return '#6b7280';
      case 'alert_triggered': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const ActivityItem = ({ activity }: { activity: any }) => {
    const Icon = getActivityIcon(activity.type);
    const color = getActivityColor(activity.type);

    return (
      <div className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm mb-1">
                <span>{activity.description}</span>
              </p>
              {activity.user && (
                <p className="text-xs text-gray-500">
                  {activity.user.name} • {activity.user.email}
                </p>
              )}
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          {activity.metadata && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {activity.metadata.subject && (
                <Badge variant="outline" className="text-xs">{activity.metadata.subject}</Badge>
              )}
              {activity.metadata.amount && (
                <Badge variant="outline" className="text-xs">£{activity.metadata.amount}</Badge>
              )}
              {activity.metadata.rating && (
                <Badge variant="outline" className="text-xs">
                  <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                  {activity.metadata.rating}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Real-time platform events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div 
              className="w-6 h-6 border-4 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Real-time platform events</CardDescription>
          </div>
          <Badge variant="outline" className="animate-pulse">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 15).map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}