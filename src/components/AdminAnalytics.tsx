import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import {
  Users,
  DollarSign,
  BookOpen,
  Activity,
  Star,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatNaira } from '../utils/currency';
import adminAPI, { AdminAPIError } from '../utils/admin-api-client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AdminAnalyticsProps {
  session: { access_token: string } | null;
}

type AnalyticsStats = {
  totalUsers: number;
  totalTutors: number;
  totalParents: number;
  totalStudents: number;
  verifiedTutors: number;
  pendingVerifications: number;
  totalBookings: number;
  completedSessions: number;
  totalRevenue: number;
  platformFees: number;
  averageRating: number | null;
  activeUsers: number;
  sessionCompletionRate: number;
};

const emptyStats: AnalyticsStats = {
  totalUsers: 0,
  totalTutors: 0,
  totalParents: 0,
  totalStudents: 0,
  verifiedTutors: 0,
  pendingVerifications: 0,
  totalBookings: 0,
  completedSessions: 0,
  totalRevenue: 0,
  platformFees: 0,
  averageRating: null,
  activeUsers: 0,
  sessionCompletionRate: 0,
};

export function AdminAnalytics({ session }: AdminAnalyticsProps) {
  const [analytics, setAnalytics] = useState<{
    stats: AnalyticsStats;
    revenueData: { month: string; revenue: number; fees: number }[];
    userGrowthData: { month: string; tutors: number; parents: number; students: number }[];
    subjectDistribution: { name: string; value: number; color: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      setError('Not signed in.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await adminAPI.getAnalytics(token);
      const s = data.stats as Record<string, unknown>;
      setAnalytics({
        stats: {
          totalUsers: Number(s.totalUsers) || 0,
          totalTutors: Number(s.totalTutors) || 0,
          totalParents: Number(s.totalParents) || 0,
          totalStudents: Number(s.totalStudents) || 0,
          verifiedTutors: Number(s.verifiedTutors) || 0,
          pendingVerifications: Number(s.pendingVerifications) || 0,
          totalBookings: Number(s.totalBookings) || 0,
          completedSessions: Number(s.completedSessions) || 0,
          totalRevenue: Number(s.totalRevenue) || 0,
          platformFees: Number(s.platformFees) || 0,
          averageRating:
            s.averageRating === null || s.averageRating === undefined
              ? null
              : Number(s.averageRating),
          activeUsers: Number(s.activeUsers) || 0,
          sessionCompletionRate: Number(s.sessionCompletionRate) || 0,
        },
        revenueData: data.revenueData ?? [],
        userGrowthData: data.userGrowthData ?? [],
        subjectDistribution: data.subjectDistribution ?? [],
      });
    } catch (err) {
      const msg =
        err instanceof AdminAPIError
          ? err.status === 403
            ? 'You do not have permission to view analytics.'
            : err.message
          : err instanceof Error
            ? err.message
            : 'Could not load analytics.';
      setError(msg);
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !analytics) {
    return (
      <div className="text-center py-12">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto"
          style={{ borderColor: '#625d9c', borderTopColor: 'transparent' }}
        />
        <p className="text-gray-600 mt-4">Loading analytics...</p>
      </div>
    );
  }

  const stats = analytics?.stats ?? emptyStats;
  const revenueData = analytics?.revenueData ?? [];
  const userGrowthData = analytics?.userGrowthData ?? [];
  const subjectDistribution = analytics?.subjectDistribution ?? [];

  const hasRevenueChart = revenueData.some((r) => r.revenue > 0 || r.fees > 0);
  const hasGrowthChart = userGrowthData.some(
    (r) => r.tutors > 0 || r.parents > 0 || r.students > 0
  );
  const hasSubjectPie = subjectDistribution.length > 0;

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color,
  }: {
    title: string;
    value: ReactNode;
    icon: typeof Users;
    color: string;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <h2 className="mb-2">{value}</h2>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadAnalytics()}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => void loadAnalytics()}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Users" value={stats.totalUsers} icon={Users} color="#625d9c" />
        <MetricCard title="Verified Tutors" value={stats.verifiedTutors} icon={Star} color="#5d9827" />
        <MetricCard title="Total Bookings" value={stats.totalBookings} icon={BookOpen} color="#3b82f6" />
        <MetricCard
          title="Platform Fees (est.)"
          value={formatNaira(stats.platformFees, false)}
          icon={DollarSign}
          color="#10b981"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Pending Verifications</p>
              <Badge variant="secondary" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                Action Required
              </Badge>
            </div>
            <h2>{stats.pendingVerifications}</h2>
            <p className="text-sm text-gray-500 mt-1">Tutors awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active users (24h)</p>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <h2>{stats.activeUsers}</h2>
            <p className="text-sm text-gray-500 mt-1">Profiles with activity in the last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average tutor rating</p>
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
            <h2>{stats.averageRating != null ? stats.averageRating : '—'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {stats.averageRating != null ? 'Across tutors with ratings' : 'No ratings yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue & platform fees</CardTitle>
            <CardDescription>Last 6 months from recorded payments (KV)</CardDescription>
          </CardHeader>
          <CardContent>
            {hasRevenueChart ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#625d9c" name="Total revenue" />
                  <Bar dataKey="fees" fill="#5d9827" name="Platform fees (20%)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                No payment activity in the last six months.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>New registrations by month</CardTitle>
            <CardDescription>Users created in each month (by role)</CardDescription>
          </CardHeader>
          <CardContent>
            {hasGrowthChart ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="tutors" stroke="#625d9c" name="Tutors" strokeWidth={2} />
                  <Line type="monotone" dataKey="parents" stroke="#5d9827" name="Parents" strokeWidth={2} />
                  <Line type="monotone" dataKey="students" stroke="#3b82f6" name="Students" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                No user sign-ups recorded in the last six months.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subject distribution</CardTitle>
            <CardDescription>Bookings by subject (top 8)</CardDescription>
          </CardHeader>
          <CardContent>
            {hasSubjectPie ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={subjectDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {subjectDistribution.map((entry, index) => (
                      <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
                No bookings with subjects yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operational snapshot</CardTitle>
            <CardDescription>Derived from booking outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Session completion rate</span>
                  <span className="text-sm tabular-nums">{stats.sessionCompletionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, stats.sessionCompletionRate))}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed sessions ÷ total bookings
                </p>
              </div>

              <p className="text-xs text-muted-foreground pt-2 border-t">
                Response rates and satisfaction scores require dedicated tracking; use Session Reports and
                disputes for qualitative signals.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>User breakdown</CardTitle>
          <CardDescription>Current user counts by role (KV profiles)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#625d9c' }} />
              <h3 className="mb-1">{stats.totalTutors}</h3>
              <p className="text-sm text-gray-600">Total tutors</p>
              <p className="text-xs text-gray-500 mt-1">{stats.verifiedTutors} verified</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#5d9827' }} />
              <h3 className="mb-1">{stats.totalParents}</h3>
              <p className="text-sm text-gray-600">Total parents</p>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="mb-1">{stats.totalStudents}</h3>
              <p className="text-sm text-gray-600">Total students</p>
              <p className="text-xs text-gray-500 mt-1">Student profiles</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
