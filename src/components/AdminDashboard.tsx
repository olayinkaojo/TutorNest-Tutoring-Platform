import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { RoleSwitcher } from './RoleSwitcher';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { edgeFunctionHeaders, edgeFunctionUrl } from '../utils/supabase-edge-fetch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Skeleton } from './ui/skeleton';
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
import KFALogo from './KFALogo';
import { NotificationCenter } from './NotificationCenter';
import { AdminDashboardHealthCheck } from './AdminDashboardHealthCheck';
import { PlatformOverview } from './admin/PlatformOverview';
import adminAPI from '../utils/admin-api-client';

// Lazy-loaded: each is only needed once its own tab is opened.
// AdminDashboardHealthCheck/PlatformOverview stay eager above — they're the
// Overview tab, active by default, so lazy-loading them would only add a
// Suspense flicker with no benefit. NotificationCenter also stays eager:
// it's rendered a second time, unconditionally, as the header bell — see
// below — so it's already needed on every load regardless of tab.
const SystemAlertsPanel = lazy(() => import('./SystemAlertsPanel').then(m => ({ default: m.SystemAlertsPanel })));
const AdminUserManagement = lazy(() => import('./AdminUserManagement').then(m => ({ default: m.AdminUserManagement })));
const EnhancedAdminVerificationDashboard = lazy(() => import('./EnhancedAdminVerificationDashboard').then(m => ({ default: m.EnhancedAdminVerificationDashboard })));
const AdminAnalytics = lazy(() => import('./AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminActivityFeed = lazy(() => import('./AdminActivityFeed').then(m => ({ default: m.AdminActivityFeed })));
const AdminDisputeHandler = lazy(() => import('./AdminDisputeHandler').then(m => ({ default: m.AdminDisputeHandler })));
const CouponManager = lazy(() => import('./CouponManager').then(m => ({ default: m.CouponManager })));
const TaxReportsManager = lazy(() => import('./TaxReportsManager').then(m => ({ default: m.TaxReportsManager })));
const AdminPaymentMonitoring = lazy(() => import('./AdminPaymentMonitoring').then(m => ({ default: m.AdminPaymentMonitoring })));
const AdminPayoutsManager = lazy(() => import('./AdminPayoutsManager').then(m => ({ default: m.AdminPayoutsManager })));
const ChildProfileManagement = lazy(() => import('./admin/ChildProfileManagement').then(m => ({ default: m.ChildProfileManagement })));
const CurriculumUploader = lazy(() => import('./admin/CurriculumUploader').then(m => ({ default: m.CurriculumUploader })));
const ResourcesUploader = lazy(() => import('./admin/ResourcesUploader').then(m => ({ default: m.ResourcesUploader })));
const TutorTrainingUploader = lazy(() => import('./admin/TutorTrainingUploader').then(m => ({ default: m.TutorTrainingUploader })));
const AuditLogViewer = lazy(() => import('./admin/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const DocumentAuditTrail = lazy(() => import('./admin/DocumentAuditTrail').then(m => ({ default: m.DocumentAuditTrail })));
const ChatSafeguardingViewer = lazy(() => import('./admin/ChatSafeguardingViewer').then(m => ({ default: m.ChatSafeguardingViewer })));
const RecordingsViewer = lazy(() => import('./admin/RecordingsViewer').then(m => ({ default: m.RecordingsViewer })));
const RealSessionReportsList = lazy(() => import('./RealSessionReportsList').then(m => ({ default: m.RealSessionReportsList })));

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

// Shared Suspense fallback for the lazy-loaded tabs above.
function TabFallback() {
  return <Skeleton className="h-64 w-full rounded-lg" />;
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
  // A dashboard total that represents a user count should drop the admin
  // straight into the matching filtered Users list, not just the tab. The
  // nonce forces the filter to re-apply even when the same card is clicked
  // twice in a row with the Users tab already showing a different filter.
  const [usersFilterRequest, setUsersFilterRequest] = useState<{ role?: string; status?: string; nonce: number } | null>(null);
  const goToUsers = (role?: string, status?: string) => {
    setUsersFilterRequest({ role, status, nonce: Date.now() });
    setActiveTab('users');
  };

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
    'tutortraining',
    'auditlog',
    'sessionreports',
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

  // Poll for stats updates every 3 minutes. This endpoint does several
  // genuine full-platform aggregates (total tutors, revenue this month,
  // active alerts) that can't be fixed with a per-owner index the way other
  // hot paths were — a real fix means migrating those to real Postgres
  // COUNT/SUM queries or global counters, deliberately deferred since this
  // is a low-traffic, admin-only dashboard. 30s was overkill for numbers
  // that don't need to-the-second freshness; this cuts the request rate ~6x
  // for near-zero cost.
  useEffect(() => {
    const interval = setInterval(async () => {
      const token = await getAccessToken();
      if (token) {
        fetchDashboardStats(token);
      }
    }, 180000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async (accessToken: string) => {
    try {
      console.log('=== Fetching dashboard stats ===');
      console.log('Project ID:', projectId);
      console.log('Access token exists:', !!accessToken);
      console.log('Year:', selectedYear, 'Month:', selectedMonth);
      
      const url = edgeFunctionUrl(
        `/admin/dashboard-stats?year=${selectedYear}&month=${selectedMonth}`
      );
      console.log('Fetch URL:', url);

      const response = await fetch(url, {
        headers: edgeFunctionHeaders(accessToken),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const raw = await response.text();
        if (raw.trim()) {
          try {
            const data = JSON.parse(raw);
            if (data.stats) {
              console.log('Dashboard stats:', data.stats);
              setStats(data.stats);
            }
          } catch {
            console.warn('Dashboard stats: response was not valid JSON');
          }
        }
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
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="min-w-0 shrink-0">
            <KFALogo />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 justify-start sm:justify-end">
            {/* Notification Center */}
            {session && (
              <NotificationCenter session={session} userId={profile.id || profile.userId} />
            )}
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[11rem] sm:max-w-[16rem]">
              Admin: {profile.name || 'Administrator'}
            </span>
            <Button variant="ghost" size="sm" onClick={onSignOut} className="shrink-0">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8 min-w-0">
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
                onClick={() => goToUsers('tutor', 'verified')}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
          <TabsList className="mb-4 shadow-sm">
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
            <TabsTrigger value="tutortraining">Tutor Training</TabsTrigger>
            <TabsTrigger value="auditlog">Audit Log</TabsTrigger>
            <TabsTrigger value="documenttrail">Document Trail</TabsTrigger>
            <TabsTrigger value="safeguarding">Safeguarding</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
            <TabsTrigger value="sessionreports">Session Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Health Check Tool */}
              {session && <AdminDashboardHealthCheck session={session} />}

              {/* Platform Overview with Key Metrics */}
              {session && (
                <PlatformOverview session={session} onTabChange={setActiveTab} onNavigateUsers={goToUsers} />
              )}

              {/* KV → Postgres migration (one-time, safe to re-run) */}
              {session && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Data Migration</CardTitle>
                    <CardDescription>Migrate legacy KV store data to Postgres (one-time operation, safe to re-run)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!window.confirm('Run KV → Postgres migration? This may take a few seconds.')) return;
                        const res = await fetch(
                          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/admin/migrate-kv-to-postgres`,
                          { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } },
                        );
                        const data = await res.json();
                        alert(JSON.stringify(data, null, 2));
                      }}
                    >
                      Run KV → Postgres Migration
                    </Button>
                  </CardContent>
                </Card>
              )}

            </div>
          </TabsContent>

          <TabsContent value="alerts">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <SystemAlertsPanel session={session} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="notifications">
            {session && (
              <NotificationCenter session={session} userId={profile.id || profile.userId} />
            )}
          </TabsContent>

          <TabsContent value="users">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <AdminUserManagement session={session} filterRequest={usersFilterRequest} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="verification">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <EnhancedAdminVerificationDashboard session={session} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <AdminAnalytics session={session} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <AdminActivityFeed session={session} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="disputes">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <AdminDisputeHandler
                  accessToken={session.access_token}
                  adminId={profile.id || profile.userId}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="coupons">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <CouponManager adminId={profile.id || profile.userId} accessToken={session.access_token} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="taxreports">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <TaxReportsManager adminId={profile.id || profile.userId} accessToken={session.access_token} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="payments">
            <Suspense fallback={<TabFallback />}>
              <AdminPaymentMonitoring />
            </Suspense>
          </TabsContent>

          <TabsContent value="payouts">
            <Suspense fallback={<TabFallback />}>
              <AdminPayoutsManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="childprofiles">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <ChildProfileManagement
                  adminId={profile.id || profile.userId}
                  accessToken={session.access_token}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="curriculum">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <CurriculumUploader
                  accessToken={session.access_token}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="resources">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <ResourcesUploader
                  accessToken={session.access_token}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="tutortraining">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <TutorTrainingUploader
                  accessToken={session.access_token}
                />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="auditlog">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <AuditLogViewer accessToken={session.access_token} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="documenttrail">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <DocumentAuditTrail accessToken={session.access_token} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="safeguarding">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <ChatSafeguardingViewer accessToken={session.access_token} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="recordings">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <RecordingsViewer accessToken={session.access_token} />
              </Suspense>
            )}
          </TabsContent>

          <TabsContent value="sessionreports">
            {session && (
              <Suspense fallback={<TabFallback />}>
                <RealSessionReportsList
                  session={session}
                  accessToken={session.access_token}
                  endpoint="/admin/session-reports"
                  viewerRole="admin"
                  title="Session Reports"
                  description="Every post-session report a tutor has submitted, across all bookings."
                  showAttendanceStat
                />
              </Suspense>
            )}
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}