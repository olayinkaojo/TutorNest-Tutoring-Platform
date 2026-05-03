import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Skeleton } from '../ui/skeleton';
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
  AlertTriangle,
  DollarSign,
  Calendar,
  BookOpen,
  BarChart3,
  Zap,
  FileCheck,
  RefreshCw,
  Download,
  Target,
  Percent,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { edgeFetch } from '../../utils/supabase-edge-fetch';
import { formatNaira } from '../../utils/currency';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PlatformOverviewProps {
  session: any;
  onTabChange?: (tab: string) => void;
}

interface OverviewMeta {
  generatedAt: string;
  currency: string;
  coverage: { profiles: number; bookings: number; payments: number };
}

interface DayTrend {
  date: string;
  bookings: number;
  revenue: number;
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
    uptime: number | null;
    responseTime: number | null;
    computeTimeMs?: number;
  };
  trends?: { last7Days: DayTrend[] };
  insights?: {
    bookingConfirmRate: number | null;
    tutorVerificationRate: number | null;
  };
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user?: string;
}

function pctBar(value: number, max: number): number {
  if (max <= 0 || !Number.isFinite(value)) return 0;
  return Math.min(100, Math.round((value / max) * 100));
}

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildExportRows(stats: PlatformStats, meta: OverviewMeta | null): string[][] {
  const rows: string[][] = [
    ['TutorNest — platform overview'],
    ['Exported', new Date().toISOString()],
    ['API snapshot', meta?.generatedAt || ''],
    ['Currency', meta?.currency || 'NGN'],
    [],
    ['Coverage', 'Count'],
    ['Profiles', String(meta?.coverage.profiles ?? stats.users.total)],
    ['Bookings', String(meta?.coverage.bookings ?? stats.sessions.total)],
    ['Payments', String(meta?.coverage.payments ?? '')],
    [],
    ['Users', 'Value'],
    ['Total', String(stats.users.total)],
    ['Parents', String(stats.users.parents)],
    ['Students', String(stats.users.students)],
    ['Tutors', String(stats.users.tutors)],
    ['Admins', String(stats.users.admins)],
    ['New this month', String(stats.users.newThisMonth)],
    ['Active today', String(stats.users.activeToday)],
    [],
    ['Sessions', 'Value'],
    ['Total', String(stats.sessions.total)],
    ['This month', String(stats.sessions.thisMonth)],
    ['Today', String(stats.sessions.today)],
    ['Completed', String(stats.sessions.completed)],
    ['Upcoming', String(stats.sessions.upcoming)],
    ['Cancelled', String(stats.sessions.cancelled)],
    [],
    ['Revenue (NGN)', 'Value'],
    ['Total', String(stats.revenue.total)],
    ['This month', String(stats.revenue.thisMonth)],
    ['Last month', String(stats.revenue.lastMonth)],
    ['Growth %', String(stats.revenue.growthPercent)],
    [],
    ['Insights', 'Value'],
    ['Booking confirm %', stats.insights?.bookingConfirmRate != null ? String(stats.insights.bookingConfirmRate) : ''],
    ['Tutor verified %', stats.insights?.tutorVerificationRate != null ? String(stats.insights.tutorVerificationRate) : ''],
  ];
  const trend = stats.trends?.last7Days;
  if (trend?.length) {
    rows.push([], ['Last 7 days', 'Bookings', 'Revenue NGN']);
    trend.forEach((d) => rows.push([d.date, String(d.bookings), String(d.revenue)]));
  }
  return rows;
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading platform overview">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export function PlatformOverview({ session, onTabChange }: PlatformOverviewProps) {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [meta, setMeta] = useState<OverviewMeta | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const statsRef = useRef<PlatformStats | null>(null);
  statsRef.current = stats;

  const fetchPlatformStats = useCallback(async (opts?: { forceInitialLoadUi?: boolean }) => {
    const firstLoad = opts?.forceInitialLoadUi ?? !statsRef.current;
    if (firstLoad) setOverviewLoading(true);
    try {
      setError(null);
      if (!projectId?.trim()) {
        setError(
          'Missing Supabase project ID. Set VITE_SUPABASE_PROJECT_ID in Vercel (and .env.local for dev), then redeploy.'
        );
        return;
      }
      const response = await edgeFetch('/admin/platform-overview', session.access_token, undefined, {
        retries: 2,
      });

      if (response.ok) {
        const raw = await response.text();
        if (!raw.trim()) {
          setError('Empty response from the overview API. Try again in a moment.');
          return;
        }
        let data: { stats?: PlatformStats; meta?: OverviewMeta; error?: string };
        try {
          data = JSON.parse(raw);
        } catch {
          console.error('Platform overview: body is not valid JSON', raw.slice(0, 200));
          setError('Server returned an invalid response. If this persists after a refresh, contact support.');
          return;
        }
        if (data.stats == null || typeof data.stats !== 'object') {
          setError(data.error || 'Overview data was missing from the server response.');
          return;
        }
        setStats(data.stats);
        setMeta(data.meta ?? null);
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
    } catch (err: unknown) {
      console.error('Error fetching platform stats:', err);
      const errorObj = err as { message?: string; name?: string };
      const isNetwork =
        errorObj?.message === 'Failed to fetch' ||
        errorObj?.name === 'TypeError' ||
        String(errorObj?.message || '').includes('Load failed');
      setError(
        isNetwork
          ? 'Could not reach the server API. Confirm VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY are set in Vercel, deploy the Edge Function `make-server-cbd74580`, and check your network or firewall.'
          : `Something went wrong: ${errorObj?.message || 'unknown error'}`
      );
    } finally {
      if (firstLoad) setOverviewLoading(false);
    }
  }, [session?.access_token]);

  const fetchRecentActivity = useCallback(
    async (silent: boolean) => {
      if (!silent) setActivityLoading(true);
      try {
        const response = await edgeFetch('/admin/recent-activity?limit=12', session.access_token, undefined, {
          retries: 2,
        });

        if (response.ok) {
          const raw = await response.text();
          if (!raw.trim()) {
            setRecentActivity([]);
            return;
          }
          try {
            const data = JSON.parse(raw) as { activity?: ActivityRow[] };
            const list = data.activity || [];
            setRecentActivity(
              list.map((a, i) => ({
                ...a,
                id: a.id || `row-${i}-${a.timestamp}-${a.type}`,
              }))
            );
          } catch {
            /* ignore malformed activity payload */
          }
        }
      } catch (e) {
        console.error('Error fetching recent activity:', e);
      } finally {
        if (!silent) setActivityLoading(false);
      }
    },
    [session?.access_token]
  );

  useEffect(() => {
    if (!session?.access_token) return;
    setOverviewLoading(true);
    setActivityLoading(true);
    setError(null);
    void (async () => {
      await fetchPlatformStats();
      await fetchRecentActivity(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount load
  }, [session?.access_token]);

  const handleRefresh = async () => {
    if (!session?.access_token) return;
    setRefreshing(true);
    setError(null);
    await Promise.all([fetchPlatformStats(), fetchRecentActivity(true)]);
    setRefreshing(false);
  };

  const handleExport = () => {
    if (!stats) return;
    const name = `tutornest-platform-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(name, buildExportRows(stats, meta));
  };

  const handleRetry = () => {
    setStats(null);
    setMeta(null);
    statsRef.current = null;
    setOverviewLoading(true);
    setActivityLoading(true);
    setError(null);
    void (async () => {
      await fetchPlatformStats({ forceInitialLoadUi: true });
      await fetchRecentActivity(false);
    })();
  };

  if (overviewLoading && !stats) {
    return <OverviewSkeleton />;
  }

  if (error || !stats) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-orange-600" aria-hidden />
          <p className="text-orange-800 font-medium mb-2">{error || 'Unable to load platform statistics'}</p>
          <p className="text-sm text-orange-700 mb-4">
            {error?.includes('404')
              ? 'The dashboard endpoint needs to be deployed. Contact your administrator or run `supabase functions deploy make-server-cbd74580`.'
              : error?.includes('VITE_SUPABASE_PROJECT_ID') || error?.includes('Could not reach')
                ? 'Rebuild the app after changing env vars. For local dev, restart Vite so VITE_* variables are picked up.'
                : 'Please check your connection and try again.'}
          </p>
          <Button variant="outline" onClick={handleRetry} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const tutorDenom = Math.max(stats.users.tutors, 1);
  const snapshotLabel = meta?.generatedAt
    ? new Date(meta.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const chartData = stats.trends?.last7Days ?? [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-500';
      case 'degraded':
        return 'bg-amber-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200">Operational</Badge>;
      case 'degraded':
        return <Badge className="bg-amber-100 text-amber-900 border-amber-200">Degraded</Badge>;
      case 'down':
        return <Badge className="bg-red-100 text-red-900 border-red-200">Down</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Executive overview</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Cross-role snapshot from merged storage (legacy KV + database). Use refresh before decisions that depend
            on live counts.
          </p>
          {snapshotLabel && (
            <p className="text-xs text-muted-foreground mt-2" role="status">
              Snapshot time: {snapshotLabel}
              {meta?.coverage ? (
                <span className="ml-2">
                  · {meta.coverage.bookings} bookings · {meta.coverage.payments} payments scanned
                </span>
              ) : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleRefresh()}
            disabled={refreshing || overviewLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </Button>
          <Button type="button" variant="default" size="sm" onClick={handleExport} className="gap-2 bg-slate-900">
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="w-5 h-5 text-emerald-600" aria-hidden />
            Service status
          </CardTitle>
          <CardDescription>Edge function reachability and snapshot performance (not global uptime SLA).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusColor(stats.system.serverStatus)}`}
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">API</p>
                {getStatusBadge(stats.system.serverStatus)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusColor(stats.system.databaseStatus)}`}
                aria-hidden
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Data path</p>
                {getStatusBadge(stats.system.databaseStatus)}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Uptime % (legacy)</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.system.uptime != null ? `${stats.system.uptime}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Snapshot compute</p>
              <p className="text-lg font-semibold tabular-nums">
                {stats.system.computeTimeMs != null ? `${stats.system.computeTimeMs} ms` : '—'}
              </p>
              {stats.system.responseTime != null && (
                <p className="text-xs text-muted-foreground mt-0.5">RTT not measured here</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {(stats.insights?.bookingConfirmRate != null || stats.insights?.tutorVerificationRate != null) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.insights.bookingConfirmRate != null && (
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-violet-600" aria-hidden />
                  Booking confirmation mix
                </CardTitle>
                <CardDescription>Confirmed ÷ (pending + confirmed)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums tracking-tight">{stats.insights.bookingConfirmRate}%</p>
              </CardContent>
            </Card>
          )}
          {stats.insights.tutorVerificationRate != null && (
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Percent className="h-4 w-4 text-emerald-600" aria-hidden />
                  Tutors verified
                </CardTitle>
                <CardDescription>Verified tutor profiles ÷ all tutor accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums tracking-tight">{stats.insights.tutorVerificationRate}%</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {chartData.length > 0 && (
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="w-5 h-5 text-violet-600" aria-hidden />
              Last 7 days
            </CardTitle>
            <CardDescription>Daily bookings and recorded payment totals (local calendar days).</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => String(v).slice(5)}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8 }}
                  formatter={(value: number, name) =>
                    name === 'revenue' ? formatNaira(value, false) : value
                  }
                />
                <Legend />
                <Bar yAxisId="left" dataKey="bookings" fill="#625d9c" radius={[4, 4, 0, 0]} name="Bookings" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#15803d"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Revenue (₦)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="w-5 h-5 text-violet-600" aria-hidden />
              Users
            </CardTitle>
            <CardDescription>Role distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold tabular-nums tracking-tight">{stats.users.total.toLocaleString()}</div>
              <div className="mt-1 flex items-center gap-1 text-sm text-emerald-700">
                <TrendingUp className="w-4 h-4 shrink-0" aria-hidden />
                <span>+{stats.users.newThisMonth.toLocaleString()} new this month</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Active today: <span className="font-medium text-foreground">{stats.users.activeToday.toLocaleString()}</span>
              </p>
            </div>
            <dl className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <Baby className="w-4 h-4 shrink-0" aria-hidden />
                  Parents
                </dt>
                <dd className="font-semibold tabular-nums">{stats.users.parents.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <BookOpen className="w-4 h-4 shrink-0" aria-hidden />
                  Students
                </dt>
                <dd className="font-semibold tabular-nums">{stats.users.students.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 shrink-0" aria-hidden />
                  Tutors
                </dt>
                <dd className="font-semibold tabular-nums">{stats.users.tutors.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" aria-hidden />
                  Admins
                </dt>
                <dd className="font-semibold tabular-nums">{stats.users.admins.toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Calendar className="w-5 h-5 text-sky-600" aria-hidden />
              Sessions
            </CardTitle>
            <CardDescription>Bookings lifecycle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-3xl font-bold tabular-nums tracking-tight">{stats.sessions.total.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">All time</p>
            </div>
            <dl className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground">This month</dt>
                <dd className="font-semibold tabular-nums">{stats.sessions.thisMonth.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
                  Completed
                </dt>
                <dd className="font-semibold tabular-nums">{stats.sessions.completed.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600 shrink-0" aria-hidden />
                  Upcoming
                </dt>
                <dd className="font-semibold tabular-nums">{stats.sessions.upcoming.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between text-sm">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" aria-hidden />
                  Cancelled
                </dt>
                <dd className="font-semibold tabular-nums">{stats.sessions.cancelled.toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="w-5 h-5 text-emerald-600" aria-hidden />
              Revenue
            </CardTitle>
            <CardDescription>Recorded payments (NGN)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight leading-tight">
                {formatNaira(stats.revenue.total, false)}
              </div>
              <p className="text-sm text-muted-foreground">Total recorded</p>
            </div>
            <dl className="space-y-2">
              <div className="flex items-center justify-between text-sm gap-2">
                <dt className="text-muted-foreground shrink-0">This month</dt>
                <dd className="font-semibold tabular-nums text-right">{formatNaira(stats.revenue.thisMonth, false)}</dd>
              </div>
              <div className="flex items-center justify-between text-sm gap-2">
                <dt className="text-muted-foreground shrink-0">Last month</dt>
                <dd className="font-semibold tabular-nums text-right">{formatNaira(stats.revenue.lastMonth, false)}</dd>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between text-sm">
                  <dt className="text-muted-foreground">MoM growth</dt>
                  <dd
                    className={`font-semibold flex items-center gap-1 tabular-nums ${
                      stats.revenue.growthPercent >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {stats.revenue.growthPercent >= 0 ? (
                      <TrendingUp className="w-4 h-4 shrink-0" aria-hidden />
                    ) : (
                      <TrendingDown className="w-4 h-4 shrink-0" aria-hidden />
                    )}
                    {Math.abs(stats.revenue.growthPercent)}%
                  </dd>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FileCheck className="w-5 h-5 text-violet-600" aria-hidden />
              Tutor verification
            </CardTitle>
            <CardDescription>Queue vs verified tutors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pending review</span>
                <Badge className="bg-amber-100 text-amber-900 border-amber-200">{stats.verification.pending}</Badge>
              </div>
              <Progress value={pctBar(stats.verification.pending, tutorDenom)} className="h-2" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verified</span>
                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200">{stats.verification.verified}</Badge>
              </div>
              <Progress value={pctBar(stats.verification.verified, tutorDenom)} className="h-2 bg-muted [&>div]:bg-emerald-600" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rejected</span>
                <Badge className="bg-red-100 text-red-900 border-red-200">{stats.verification.rejected}</Badge>
              </div>
              <Progress value={pctBar(stats.verification.rejected, tutorDenom)} className="h-2 bg-muted [&>div]:bg-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Calendar className="w-5 h-5 text-sky-600" aria-hidden />
              Bookings
            </CardTitle>
            <CardDescription>Operational funnel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/80 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold tabular-nums text-amber-900">{stats.bookings.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600 shrink-0" aria-hidden />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed</p>
                <p className="text-2xl font-bold tabular-nums text-emerald-900">{stats.bookings.confirmed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600 shrink-0" aria-hidden />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50/80 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold tabular-nums text-sky-900">{stats.bookings.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-sky-600 shrink-0" aria-hidden />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Zap className="w-5 h-5 text-amber-600" aria-hidden />
            Recent activity
          </CardTitle>
          <CardDescription>Audit trail and derived signals (admin-only).</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No recent activity in the audit log yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {recentActivity.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-start gap-3 p-3 transition-colors hover:bg-muted/40 first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{activity.timestamp}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs capitalize">
                    {activity.type.replace(/_/g, ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Shortcuts</CardTitle>
          <CardDescription>Jump to operational consoles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 py-4 transition-colors hover:border-violet-300 hover:bg-violet-50/60"
              onClick={() => onTabChange?.('users')}
            >
              <Users className="h-5 w-5" aria-hidden />
              <span className="text-sm">Users</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 py-4 transition-colors hover:border-violet-300 hover:bg-violet-50/60"
              onClick={() => onTabChange?.('verification')}
            >
              <FileCheck className="h-5 w-5" aria-hidden />
              <span className="text-sm">Verifications</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 py-4 transition-colors hover:border-red-200 hover:bg-red-50/60"
              onClick={() => onTabChange?.('alerts')}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden />
              <span className="text-sm">Alerts</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto flex-col gap-2 py-4 transition-colors hover:border-slate-400 hover:bg-slate-50/80"
              onClick={() => onTabChange?.('analytics')}
            >
              <BarChart3 className="h-5 w-5" aria-hidden />
              <span className="text-sm">Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
