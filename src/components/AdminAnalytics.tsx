import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  BookOpen,
  Clock,
  Star,
  Activity
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { formatNaira } from '../utils/currency';
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
  ResponsiveContainer
} from 'recharts';

interface AdminAnalyticsProps {
  session: any;
}

export function AdminAnalytics({ session }: AdminAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/analytics`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

  const stats = analytics?.stats || {
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
    averageRating: 0,
    activeUsers: 0
  };

  const revenueData = analytics?.revenueData || [
    { month: 'Jan', revenue: 2400, fees: 240 },
    { month: 'Feb', revenue: 1398, fees: 139.8 },
    { month: 'Mar', revenue: 9800, fees: 980 },
    { month: 'Apr', revenue: 3908, fees: 390.8 },
    { month: 'May', revenue: 4800, fees: 480 },
    { month: 'Jun', revenue: 3800, fees: 380 },
  ];

  const userGrowthData = analytics?.userGrowthData || [
    { month: 'Jan', tutors: 12, parents: 45, students: 67 },
    { month: 'Feb', tutors: 18, parents: 62, students: 89 },
    { month: 'Mar', tutors: 25, parents: 78, students: 112 },
    { month: 'Apr', tutors: 33, parents: 95, students: 145 },
    { month: 'May', tutors: 42, parents: 118, students: 178 },
    { month: 'Jun', tutors: 51, parents: 142, students: 215 },
  ];

  const subjectDistribution = analytics?.subjectDistribution || [
    { name: 'Mathematics', value: 35, color: '#625d9c' },
    { name: 'English', value: 28, color: '#5d9827' },
    { name: 'Science', value: 20, color: '#3b82f6' },
    { name: 'Languages', value: 10, color: '#f59e0b' },
    { name: 'Other', value: 7, color: '#8b5cf6' },
  ];

  const MetricCard = ({ title, value, change, icon: Icon, trend, color }: any) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <h2 className="mb-2">{value}</h2>
            {change && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {change}
                </span>
                <span className="text-sm text-gray-500">vs last month</span>
              </div>
            )}
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
      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          change="+12.5%"
          trend="up"
          icon={Users}
          color="#625d9c"
        />
        <MetricCard
          title="Verified Tutors"
          value={stats.verifiedTutors}
          change="+8.2%"
          trend="up"
          icon={Star}
          color="#5d9827"
        />
        <MetricCard
          title="Total Bookings"
          value={stats.totalBookings}
          change="+15.3%"
          trend="up"
          icon={BookOpen}
          color="#3b82f6"
        />
        <MetricCard
          title="Platform Revenue"
          value={formatNaira(stats.platformFees, false)}
          change="+22.1%"
          trend="up"
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
              <p className="text-sm text-gray-600">Active Users (24h)</p>
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <h2>{stats.activeUsers}</h2>
            <p className="text-sm text-gray-500 mt-1">Currently online or active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average Rating</p>
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            </div>
            <h2>{stats.averageRating || '4.8'}</h2>
            <p className="text-sm text-gray-500 mt-1">Across all tutors</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Platform Fees</CardTitle>
            <CardDescription>Monthly revenue breakdown (Last 6 months)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#625d9c" name="Total Revenue" />
                <Bar dataKey="fees" fill="#5d9827" name="Platform Fees" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth Trends</CardTitle>
            <CardDescription>New user registrations by role</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Subject Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Distribution</CardTitle>
            <CardDescription>Booking distribution by subject</CardDescription>
          </CardHeader>
          <CardContent>
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
                  {subjectDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <CardDescription>Key operational metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Session Completion Rate</span>
                  <span className="text-sm">94%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Tutor Response Rate</span>
                  <span className="text-sm">88%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#625d9c', width: '88%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Parent Satisfaction</span>
                  <span className="text-sm">92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ backgroundColor: '#5d9827', width: '92%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Platform Uptime</span>
                  <span className="text-sm">99.9%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '99.9%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <Card>
        <CardHeader>
          <CardTitle>User Breakdown</CardTitle>
          <CardDescription>Current user distribution across roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#625d9c' }} />
              <h3 className="mb-1">{stats.totalTutors}</h3>
              <p className="text-sm text-gray-600">Total Tutors</p>
              <p className="text-xs text-gray-500 mt-1">{stats.verifiedTutors} verified</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: '#5d9827' }} />
              <h3 className="mb-1">{stats.totalParents}</h3>
              <p className="text-sm text-gray-600">Total Parents</p>
              <p className="text-xs text-gray-500 mt-1">Active accounts</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <h3 className="mb-1">{stats.totalStudents}</h3>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-xs text-gray-500 mt-1">Student profiles</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}