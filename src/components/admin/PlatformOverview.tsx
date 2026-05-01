import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  Users,
  GraduationCap,
  Baby,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Database,
  AlertTriangle,
  DollarSign,
  Calendar,
  BookOpen,
  BarChart3,
  Zap,
  Globe,
  Lock,
  FileCheck
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

interface PlatformOverviewProps {
  session: any;
  onTabChange?: (tab: string) => void;
}

interface PlatformStats {
  users: {
    total: number;
    parents: number;
    students: number;
    tutors: number;
    admins: number;
    newThisMonth: number;
    activeToday: number;
  };
  sessions: {
    total: number;
    thisMonth: number;
    today: number;
    completed: number;
    upcoming: number;
    cancelled: number;
  };
  bookings: {
    pending: number;
    confirmed: number;
    total: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    growthPercent: number;
  };
  verification: {
    pending: number;
    verified: number;
    rejected: number;
  };
  system: {
    serverStatus: 'healthy' | 'degraded' | 'down';
    databaseStatus: 'healthy' | 'degraded' | 'down';
    uptime: number;
    responseTime: number;
  };
}

export function PlatformOverview({ session, onTabChange }: PlatformOverviewProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.access_token) {
      fetchPlatformStats();
      fetchRecentActivity();
    }
  }, [session]);

  const fetchPlatformStats = async () => {
    try {
      setError(null);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/platform-overview`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          console.error('Platform overview returned non-JSON response');
          setError('Service temporarily unavailable. Please try again in a moment.');
          return;
        }
        const data = await response.json();
        setStats(data.stats);
      } else if (response.status === 401 || response.status === 403) {
        console.error('Admin access denied:', response.status);
        setError('Admin access required. Please ensure your account has admin privileges.');
      } else if (response.status === 404) {
        console.error('API error: 404 - Endpoint not deployed');
        setError('API error: 404 - Dashboard endpoint not yet deployed.');
      } else {
        console.error('Failed to fetch platform stats:', response.status);
        setError(`Failed to load statistics (HTTP ${response.status})`);
      }
    } catch (error: any) {
      console.error('Error fetching platform stats:', error);
      setError('Service temporarily unavailable. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/recent-activity?limit=5`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;
        const data = await response.json();
        setRecentActivity(data.activity || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-500">Loading platform overview...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-600" />
          <p className="text-orange-800 font-medium mb-2">
            {error || 'Unable to load platform statistics'}
          </p>
          <p className="text-sm text-orange-700 mb-4">
            {error?.includes('404') 
              ? 'The dashboard endpoint needs to be deployed. Contact your administrator or run `supabase functions deploy`.'
              : 'Please check your connection and try again.'}
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchPlatformStats();
            }}
            className="mt-2"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-800">Down</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(stats.system.serverStatus)} animate-pulse`} />
              <div>
                <p className="text-sm text-gray-600">Server</p>
                {getStatusBadge(stats.system.serverStatus)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(stats.system.databaseStatus)} animate-pulse`} />
              <div>
                <p className="text-sm text-gray-600">Database</p>
                {getStatusBadge(stats.system.databaseStatus)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-lg font-semibold">{stats.system.uptime}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Response Time</p>
              <p className="text-lg font-semibold">{stats.system.responseTime}ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Metrics */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-purple-600" />
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold mb-1">{stats.users.total.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span>+{stats.users.newThisMonth} this month</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Baby className="w-4 h-4" /> Parents
                </span>
                <span className="font-semibold">{stats.users.parents}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Students
                </span>
                <span className="font-semibold">{stats.users.students}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" /> Tutors
                </span>
                <span className="font-semibold">{stats.users.tutors}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Admins
                </span>
                <span className="font-semibold">{stats.users.admins}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold mb-1">{stats.sessions.total.toLocaleString()}</div>
              <div className="text-sm text-gray-600">All time</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold">{stats.sessions.thisMonth}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" /> Completed
                </span>
                <span className="font-semibold">{stats.sessions.completed}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" /> Upcoming
                </span>
                <span className="font-semibold">{stats.sessions.upcoming}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" /> Cancelled
                </span>
                <span className="font-semibold">{stats.sessions.cancelled}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold mb-1">£{stats.revenue.total.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Total revenue</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">This Month</span>
                <span className="font-semibold">£{stats.revenue.thisMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Month</span>
                <span className="font-semibold">£{stats.revenue.lastMonth.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Growth</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    stats.revenue.growthPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stats.revenue.growthPercent >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {Math.abs(stats.revenue.growthPercent)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Verification & Bookings */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-purple-600" />
              Tutor Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending Review</span>
                  <Badge className="bg-yellow-100 text-yellow-800">{stats.verification.pending}</Badge>
                </div>
                <Progress value={(stats.verification.pending / stats.users.tutors) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Verified</span>
                  <Badge className="bg-green-100 text-green-800">{stats.verification.verified}</Badge>
                </div>
                <Progress value={(stats.verification.verified / stats.users.tutors) * 100} className="h-2 bg-green-100" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Rejected</span>
                  <Badge className="bg-red-100 text-red-800">{stats.verification.rejected}</Badge>
                </div>
                <Progress value={(stats.verification.rejected / stats.users.tutors) * 100} className="h-2 bg-red-100" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Booking Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Pending Bookings</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats.bookings.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Confirmed Bookings</p>
                  <p className="text-2xl font-bold text-green-700">{stats.bookings.confirmed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-2xl font-bold text-blue-700">{stats.bookings.total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-600" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Navigate to key admin features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              onClick={() => onTabChange?.('users')}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">Manage Users</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              onClick={() => onTabChange?.('verification')}
            >
              <FileCheck className="w-5 h-5" />
              <span className="text-sm">Review Verifications</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-red-50 hover:border-red-300 transition-colors"
              onClick={() => onTabChange?.('alerts')}
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm">View Alerts</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => onTabChange?.('analytics')}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}