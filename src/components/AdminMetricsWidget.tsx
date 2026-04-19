import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, Users, BookOpen, DollarSign, Zap } from 'lucide-react';
import adminAPI from '../utils/admin-api-client';

interface AdminMetricsWidgetProps {
  accessToken: string;
}

interface PlatformMetrics {
  totalStudents?: number;
  totalTutors?: number;
  totalSessions?: number;
  completionRate?: number;
  averageEngagement?: number;
  totalRevenue?: number;
  activeUsers?: number;
  newUsersThisMonth?: number;
}

export function AdminMetricsWidget({ accessToken }: AdminMetricsWidgetProps) {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMetrics();
  }, [accessToken]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const platformMetrics = await adminAPI.getPlatformMetrics(accessToken);
      setMetrics(platformMetrics);
    } catch (err: any) {
      setError(err.message || 'Failed to load platform metrics');
      console.error('Error loading admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading platform metrics...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) {
    return null;
  }

  const getMetricTrend = (value: number, threshold: number) => {
    if (value >= threshold) {
      return { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' };
    }
    return { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' };
  };

  const engagementTrend = getMetricTrend(metrics.averageEngagement || 0, 70);
  const TrendIcon = engagementTrend.icon;

  return (
    <div className="space-y-6">
      {/* Main Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStudents || 0 + metrics.totalTutors || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.totalStudents || 0} students • {metrics.totalTutors || 0} tutors
            </p>
          </CardContent>
        </Card>

        {/* Total Sessions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Total Sessions</span>
              <BookOpen className="w-4 h-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSessions || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              Completion: {metrics.completionRate || 0}%
            </p>
          </CardContent>
        </Card>

        {/* Average Engagement */}
        <Card className={engagementTrend.bg}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Engagement</span>
              <TrendIcon className={`w-4 h-4 ${engagementTrend.color}`} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.averageEngagement || 0}%</div>
            <p className="text-xs text-gray-600 mt-1">
              {metrics.averageEngagement && metrics.averageEngagement >= 70 ? 'High engagement' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Revenue</span>
              <DollarSign className="w-4 h-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{(metrics.totalRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Total platform revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Health</CardTitle>
          <CardDescription>Key metrics for platform performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Users */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Active Users This Month</span>
              <Badge variant="outline">{metrics.activeUsers || 0}</Badge>
            </div>
            <div className="text-xs text-gray-500">
              New: {metrics.newUsersThisMonth || 0} | Total: {(metrics.totalStudents || 0) + (metrics.totalTutors || 0)}
            </div>
          </div>

          {/* Completion Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Session Completion Rate</span>
              <Badge className={metrics.completionRate && metrics.completionRate >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {metrics.completionRate || 0}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(metrics.completionRate || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Engagement Status */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-blue-900">Average Engagement</div>
                <div className="text-xs text-blue-700">
                  {metrics.averageEngagement && metrics.averageEngagement >= 70 ? (
                    <>✅ Platform engagement is healthy at {metrics.averageEngagement}%</>
                  ) : (
                    <>⚠️ Engagement is {metrics.averageEngagement}% - consider initiatives to boost participation</>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{metrics.totalTutors || 0}</div>
              <div className="text-xs text-gray-500">Active Tutors</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{metrics.totalStudents || 0}</div>
              <div className="text-xs text-gray-500">Active Students</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
