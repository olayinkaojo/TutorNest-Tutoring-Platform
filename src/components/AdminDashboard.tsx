import { useState, useEffect, useRef } from 'react';
import { AdminUserManagement } from './AdminUserManagement';
import { AdminVerificationDashboard } from './AdminVerificationDashboard';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminActivityFeed } from './AdminActivityFeed';
import { AdminDisputeHandler } from './AdminDisputeHandler';
import { CouponManager } from './CouponManager';
import { TaxReportsManager } from './TaxReportsManager';
import { AdminPaymentMonitoring } from './AdminPaymentMonitoring';
import { AdminPayoutBatchManager } from './AdminPayoutBatchManager';
import { RoleSwitcher } from './RoleSwitcher';
import { CurriculumUploader } from './admin/CurriculumUploader';
import { ResourcesUploader } from './admin/ResourcesUploader';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Shield, 
  Users, 
  Calendar, 
  DollarSign, 
  AlertTriangle, 
  Bell, 
  LogOut,
  TrendingUp,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import TutorNestLogo from './TutorNestLogo';
import { NotificationCenter } from './NotificationCenter';
import { AdminDashboardHealthCheck } from './AdminDashboardHealthCheck';
import { PlatformOverview } from './admin/PlatformOverview';
import { SystemAlertsPanel } from './SystemAlertsPanel';
import { ChildProfileManagement } from './admin/ChildProfileManagement';
import { AdminMetricsWidget } from './AdminMetricsWidget';
import adminAPI from '../utils/admin-api-client';

interface UserProfile {
  id?: string;
  userId: string;
  role: string;
  name?: string;
  email?: string;
}

interface AdminDashboardProps {
  profile: UserProfile;
  onSignOut: () => void;
  availableRoles?: string[];
  onRoleSwitch?: (role: string) => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

export function AdminDashboard({
  profile,
  onSignOut,
  availableRoles,
  onRoleSwitch,
  initialTab,
  onTabChange,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const hasMountedTabSync = useRef(false);
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [stats, setStats] = useState({
    activeTutors: 0,
    totalSessions: 0,
    revenue: '0.00',
    activeAlerts: 0,
    unreadNotifications: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const validTabs = new Set([
    'overview',
    'alerts',
    'notifications',
    'users',
    'verification',
    'analytics',
    'activity',
    'disputes',
    'coupons',
    'taxreports',
    'payments',
    'payouts',
    'childprofiles',
    'curriculum',
    'resources',
  ]);

  useEffect(() => {
    if (initialTab && validTabs.has(initialTab) && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    // Skip first run so URL-derived tab isn't overwritten by default.
    if (!hasMountedTabSync.current) {
      hasMountedTabSync.current = true;
      return;
    }
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  // Helper function to get fresh access token
  const getAccessToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        fetchDashboardStats(session.access_token);
      }
    };
    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Admin Dashboard - Auth state changed:', _event);
      setSession(session);
      if (session && _event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed, refetching stats');
        fetchDashboardStats(session.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Refetch stats when filter changes
  useEffect(() => {
    const refetchStats = async () => {
      const token = await getAccessToken();
      if (token) {
        fetchDashboardStats(token);
      }
    };
    refetchStats();
  }, [selectedYear, selectedMonth]);

  // Poll for stats updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await getAccessToken();
      if (token) {
        fetchDashboardStats(token);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async (accessToken: string) => {
    try {
      console.log('=== Fetching dashboard stats ===');
      console.log('Project ID:', projectId);
      console.log('Access token exists:', !!accessToken);
      console.log('Year:', selectedYear, 'Month:', selectedMonth);
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/dashboard-stats?year=${selectedYear}&month=${selectedMonth}`;
      console.log('Fetch URL:', url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Dashboard stats:', data.stats);
        setStats(data.stats);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch dashboard stats:', response.status, errorText);
        // Set default stats to prevent UI errors
        setStats({
          activeTutors: 0,
          totalSessions: 0,
          revenue: '0.00',
          activeAlerts: 0,
          unreadNotifications: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default stats to prevent UI errors
      setStats({
        activeTutors: 0,
        totalSessions: 0,
        revenue: '0.00',
        activeAlerts: 0,
        unreadNotifications: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <TutorNestLogo />
          <div className="flex items-center gap-4">
            {/* Notification Center */}
            {session && (
              <NotificationCenter session={session} userId={profile.id || profile.userId} />
            )}
            <span className="text-sm text-gray-600">Admin: {profile.name || 'Administrator'}</span>
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">
            Manage platform operations, monitor alerts, and oversee compliance
          </p>
        </div>

        {/* Stats with Date Filter */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {/* Date Filter - Compact */}
            <div className="flex flex-wrap items-center gap-2 pb-3 mb-4 border-b border-gray-200">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Filter:</span>
              </div>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 text-sm px-3"
                onClick={() => {
                  const now = new Date();
                  setSelectedYear(now.getFullYear());
                  setSelectedMonth(now.getMonth() + 1);
                }}
              >
                Reset
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className="bg-purple-50 p-4 rounded-lg border border-purple-100 hover:border-purple-300 hover:shadow-md transition-all text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Active Tutors</p>
                    <h2 className="text-2xl">{loadingStats ? '...' : stats.activeTutors}</h2>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className="bg-blue-50 p-4 rounded-lg border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
                    <h2 className="text-2xl">{loadingStats ? '...' : stats.totalSessions}</h2>
                  </div>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className="bg-green-50 p-4 rounded-lg border border-green-100 hover:border-green-300 hover:shadow-md transition-all text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Revenue (₦)</p>
                    <h2 className="text-2xl">{loadingStats ? '...' : `₦${parseFloat(stats.revenue).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</h2>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className="bg-red-50 p-4 rounded-lg border border-red-100 hover:border-red-300 hover:shadow-md transition-all text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Active Alerts</p>
                    <h2 className="text-2xl">{loadingStats ? '...' : stats.activeAlerts}</h2>
                  </div>
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="alerts">System Alerts</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="verification">Verification</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
            <TabsTrigger value="taxreports">Tax Reports</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="childprofiles">Child Profiles</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Platform Metrics Widget */}
              {session && (
                <AdminMetricsWidget accessToken={session.access_token} />
              )}

              {/* Health Check Tool */}
              {session && <AdminDashboardHealthCheck session={session} />}

              {/* Platform Overview with Key Metrics */}
              {session && <PlatformOverview session={session} onTabChange={setActiveTab} />}

            </div>
          </TabsContent>

          <TabsContent value="alerts">
            {session && (
              <SystemAlertsPanel session={session} />
            )}
          </TabsContent>

          <TabsContent value="notifications">
            {session && (
              <NotificationCenter session={session} userId={profile.id || profile.userId} />
            )}
          </TabsContent>

          <TabsContent value="users">
            {session && (
              <AdminUserManagement session={session} />
            )}
          </TabsContent>

          <TabsContent value="verification">
            {session && (
              <AdminVerificationDashboard session={session} />
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {session && (
              <AdminAnalytics session={session} />
            )}
          </TabsContent>

          <TabsContent value="activity">
            {session && (
              <AdminActivityFeed session={session} />
            )}
          </TabsContent>

          <TabsContent value="disputes">
            {session && (
              <AdminDisputeHandler 
                accessToken={session.access_token} 
                adminId={profile.id || profile.userId}
              />
            )}
          </TabsContent>

          <TabsContent value="coupons">
            <CouponManager adminId={profile.id || profile.userId} />
          </TabsContent>

          <TabsContent value="taxreports">
            <TaxReportsManager adminId={profile.id || profile.userId} />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentMonitoring />
          </TabsContent>

          <TabsContent value="payouts">
            <AdminPayoutBatchManager />
          </TabsContent>

          <TabsContent value="childprofiles">
            {session && (
              <ChildProfileManagement 
                adminId={profile.id || profile.userId}
                accessToken={session.access_token}
              />
            )}
          </TabsContent>

          <TabsContent value="curriculum">
            {session && (
              <CurriculumUploader 
                accessToken={session.access_token}
              />
            )}
          </TabsContent>

          <TabsContent value="resources">
            {session && (
              <ResourcesUploader 
                accessToken={session.access_token}
              />
            )}
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}