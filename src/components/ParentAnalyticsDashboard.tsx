import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { TrendingUp, Calendar, Download, Info } from 'lucide-react';
import { formatNaira } from '../utils/currency';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface SpendingData {
  month: string;
  spent: number;
  sessions: number;
  avgPerSession: number;
}

interface SubjectAnalytics {
  subject: string;
  spent: number;
  sessions: number;
  percentage: number;
  color: string;
}

interface TutorSpending {
  tutorName: string;
  spent: number;
  sessions: number;
}

interface ChildProfile {
  id: string;
  firstName?: string;
  lastName?: string;
}

export function ParentAnalyticsDashboard({
  accessToken,
  childProfiles = [],
}: {
  accessToken: string;
  childProfiles?: ChildProfile[];
}) {
  const [spendingData, setSpendingData] = useState<SpendingData[]>([]);
  const [subjectAnalytics, setSubjectAnalytics] = useState<SubjectAnalytics[]>([]);
  const [tutorSpending, setTutorSpending] = useState<TutorSpending[]>([]);
  const [timeframe, setTimeframe] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [loading, setLoading] = useState(true);

  const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580`;
  const COLORS = ['#625d9c', '#5d9827', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#f97316'];

  const getCutoffMs = (tf: string): number => {
    const ms = Date.now();
    if (tf === '3m') return ms - 90 * 86400000;
    if (tf === '6m') return ms - 180 * 86400000;
    if (tf === '1y') return ms - 365 * 86400000;
    return 0;
  };

  useEffect(() => {
    loadAnalytics();
  }, [timeframe, accessToken, childProfiles.length]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };

      // Fetch payments history
      const paymentsRes = await fetch(`${BASE}/payments/history`, { headers });
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : { payments: [] };
      const allPayments: any[] = paymentsData.payments || [];

      // Filter by timeframe
      const cutoff = getCutoffMs(timeframe);
      const payments = cutoff
        ? allPayments.filter(p => new Date(p.createdAt || p.confirmedAt || 0).getTime() >= cutoff)
        : allPayments;

      // Fetch bookings for each child (for subject breakdown)
      let allBookings: any[] = [];
      if (childProfiles.length > 0) {
        const results = await Promise.all(
          childProfiles.map(c =>
            fetch(`${BASE}/bookings?studentId=${c.id}`, { headers })
              .then(r => r.ok ? r.json() : { bookings: [] })
              .catch(() => ({ bookings: [] }))
          )
        );
        allBookings = results.flatMap((d: any) => d.bookings || []);
      }

      // ── Monthly spending trend ────────────────────────────────────────────
      const monthlyMap = new Map<string, { spent: number; sessions: number }>();
      for (const p of payments) {
        const d = new Date(p.createdAt || p.confirmedAt || 0);
        if (isNaN(d.getTime())) continue;
        const key = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
        const cur = monthlyMap.get(key) ?? { spent: 0, sessions: 0 };
        cur.spent += parseFloat(p.amount) || 0;
        cur.sessions += 1;
        monthlyMap.set(key, cur);
      }
      // Sort by chronological order
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const computedSpending: SpendingData[] = Array.from(monthlyMap.entries())
        .sort((a, b) => {
          const [am, ay] = a[0].split(' ');
          const [bm, by] = b[0].split(' ');
          return ay !== by ? Number(ay) - Number(by) : monthOrder.indexOf(am) - monthOrder.indexOf(bm);
        })
        .map(([month, d]) => ({
          month,
          spent: d.spent,
          sessions: d.sessions,
          avgPerSession: d.sessions > 0 ? Math.round(d.spent / d.sessions) : 0,
        }));

      // ── Subject breakdown from bookings ───────────────────────────────────
      const subjectMap = new Map<string, { spent: number; sessions: number }>();
      for (const b of allBookings) {
        if (b.status !== 'completed' && b.status !== 'confirmed') continue;
        const subject = b.subject || 'Other';
        const cur = subjectMap.get(subject) ?? { spent: 0, sessions: 0 };
        cur.spent += parseFloat(b.price) || 0;
        cur.sessions += 1;
        subjectMap.set(subject, cur);
      }
      const totalSubjectSpent = Array.from(subjectMap.values()).reduce((s, d) => s + d.spent, 0);
      const computedSubjects: SubjectAnalytics[] = Array.from(subjectMap.entries())
        .sort((a, b) => b[1].spent - a[1].spent)
        .slice(0, 7)
        .map(([subject, d], i) => ({
          subject,
          spent: d.spent,
          sessions: d.sessions,
          percentage: totalSubjectSpent > 0 ? Math.round((d.spent / totalSubjectSpent) * 100) : 0,
          color: COLORS[i % COLORS.length],
        }));

      // ── Tutor breakdown from payment metadata ─────────────────────────────
      const tutorMap = new Map<string, { spent: number; sessions: number }>();
      for (const p of payments) {
        const name = p.metadata?.tutorName || 'Unknown Tutor';
        const cur = tutorMap.get(name) ?? { spent: 0, sessions: 0 };
        cur.spent += parseFloat(p.amount) || 0;
        cur.sessions += 1;
        tutorMap.set(name, cur);
      }
      const computedTutors: TutorSpending[] = Array.from(tutorMap.entries())
        .filter(([name]) => name !== 'Unknown Tutor' || tutorMap.size === 1)
        .sort((a, b) => b[1].spent - a[1].spent)
        .slice(0, 5)
        .map(([tutorName, d]) => ({ tutorName, spent: d.spent, sessions: d.sessions }));

      setSpendingData(computedSpending);
      setSubjectAnalytics(computedSubjects);
      setTutorSpending(computedTutors);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const totalSpent = spendingData.reduce((sum, d) => sum + d.spent, 0);
  const totalSessions = spendingData.reduce((sum, d) => sum + d.sessions, 0);
  const avgPerSession = totalSessions > 0 ? totalSpent / totalSessions : 0;

  const downloadReport = () => {
    try {
      const headers = ['Month', 'Spent (₦)', 'Sessions', 'Avg/Session'];
      const rows = spendingData.map(d => [d.month, d.spent, d.sessions, d.avgPerSession]);
      let csv = headers.join(',') + '\n';
      rows.forEach(r => (csv += r.join(',') + '\n'));
      csv += `\n\nTotal Spent,${totalSpent}\nTotal Sessions,${totalSessions}\nAvg per Session,${Math.round(avgPerSession)}\n`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch {
      toast.error('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#625d9c] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading analytics…</p>
        </div>
      </div>
    );
  }

  const hasData = spendingData.length > 0 || subjectAnalytics.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Analytics & Insights</h2>
          <p className="text-gray-600 text-sm mt-1">Real spending and learning analytics from your bookings</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          {hasData && (
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="mb-1">No analytics data yet</p>
            <p className="text-sm text-gray-400">Data will appear here once you have completed bookings and payments.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold mt-1">{formatNaira(totalSpent)}</p>
                    <p className="text-xs text-gray-500 mt-2">Avg: {formatNaira(Math.round(avgPerSession))}/session</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold mt-1">{totalSessions}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Across {subjectAnalytics.length} subject{subjectAnalytics.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Monthly Average</p>
                    <p className="text-2xl font-bold mt-1">
                      {spendingData.length > 0 ? formatNaira(Math.round(totalSpent / spendingData.length)) : '₦0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Over {spendingData.length} month{spendingData.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-300">Normal</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Spending Trend */}
          {spendingData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Spending Trend</CardTitle>
                <CardDescription>Monthly payment pattern over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={spendingData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatNaira(value as number)} />
                    <Legend />
                    <Line type="monotone" dataKey="spent" stroke="#625d9c" strokeWidth={2} name="Amount Spent" dot={{ fill: '#625d9c' }} />
                    <Line type="monotone" dataKey="avgPerSession" stroke="#5d9827" strokeWidth={2} name="Avg per Payment" dot={{ fill: '#5d9827' }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            {subjectAnalytics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Spending by Subject</CardTitle>
                  <CardDescription>Investment distribution across subjects</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={subjectAnalytics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ subject, percentage }) => `${subject} (${percentage}%)`}
                        outerRadius={80}
                        dataKey="spent"
                      >
                        {subjectAnalytics.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatNaira(value as number)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {subjectAnalytics.map((s) => (
                      <div key={s.subject} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                          <span>{s.subject}</span>
                        </div>
                        <span className="font-medium">{formatNaira(s.spent)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Tutors */}
            {tutorSpending.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Tutors by Spending</CardTitle>
                  <CardDescription>Based on total payments made</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tutorSpending.map((tutor, index) => (
                      <div key={tutor.tutorName} className="border-b pb-4 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{tutor.tutorName}</p>
                            <p className="text-xs text-gray-500">{tutor.sessions} payment{tutor.sessions !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${(tutor.spent / Math.max(...tutorSpending.map(t => t.spent), 1)) * 100}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                          <p className="text-sm font-medium whitespace-nowrap">{formatNaira(tutor.spent)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Insights */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {totalSpent > 0 && (
                <Alert className="bg-white border-blue-200">
                  <AlertDescription>
                    📊 <strong>Spending Summary:</strong> You've spent {formatNaira(totalSpent)} across{' '}
                    {totalSessions} payment{totalSessions !== 1 ? 's' : ''}, averaging{' '}
                    {formatNaira(Math.round(avgPerSession))} per payment.
                  </AlertDescription>
                </Alert>
              )}
              {subjectAnalytics.length > 0 && (
                <Alert className="bg-white border-blue-200">
                  <AlertDescription>
                    🎯 <strong>Top Subject:</strong> {subjectAnalytics[0].subject} receives{' '}
                    {subjectAnalytics[0].percentage}% of your investment ({formatNaira(subjectAnalytics[0].spent)}).
                  </AlertDescription>
                </Alert>
              )}
              {tutorSpending.length > 0 && (
                <Alert className="bg-white border-blue-200">
                  <AlertDescription>
                    ⭐ <strong>Top Tutor:</strong> {tutorSpending[0].tutorName} has received the most investment
                    at {formatNaira(tutorSpending[0].spent)}.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
