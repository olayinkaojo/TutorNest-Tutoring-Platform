import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Download,
  TrendingUp,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { edgeFunctionUrl, edgeFunctionHeaders } from '../utils/supabase-edge-fetch';

interface AdvancedReportingProps {
  userId: string;
  userType: 'student' | 'tutor' | 'parent' | 'admin';
  accessToken?: string;
}

interface TutorPerformanceData {
  averageRating: number;
  totalReviews: number;
  onTimeStartPercentage: number;
  rebookingRate: number;
  reportCompletionRate: number;
  totalSessions: number;
  activeStudents: number;
  responseTime: number;
  ratingTrend: { date: string; rating: number }[];
  strengths: string[];
  improvementAreas: string[];
  coachingTips: { id: string; category: string; tip: string; priority: 'high' | 'medium' | 'low'; relatedMetric: string }[];
}

const priorityColor: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  high: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: '#f59e0b' },
  medium: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: '#625d9c' },
  low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: '#5d9827' },
};

/**
 * This whole component used to render entirely hardcoded demo data —
 * performanceData, subjectBreakdown, learningPatterns, competencyMap,
 * goalTracking, predictiveInsights (complete with a fabricated "confidence
 * %" on each one) were static arrays, zero API calls, identical for every
 * tutor regardless of real performance. Only ever rendered here with
 * userType="tutor" (see TutorDashboard.tsx), so this rewrite is scoped to
 * that case specifically rather than the unused student/parent/admin
 * branches the old prop implied.
 *
 * GET /tutor-performance/:tutorId (progress-analytics-routes.tsx) already
 * computes real metrics from real bookings/reports/reviews — it just
 * powers a different tab (TutorPerformanceDashboard.tsx). Wired here
 * instead of inventing a second backend. Two fields in that response are
 * themselves still static server-side (strengths, responseTime) — not
 * fixed here, out of scope for this component, but worth knowing they're
 * not fully real yet either.
 *
 * Removed rather than faked: Subject Breakdown, Learning Patterns
 * (time-of-day), the Skills Competency Map, and Goal Tracking (with due
 * dates) — none of these have any real backing data anywhere in the app
 * (no per-subject session scores, no time-of-day tracking, no skills
 * system, no goals system). "Insights" now shows the API's real
 * coachingTips (honest priority levels, no invented confidence numbers)
 * instead of fabricated predictions.
 */
export function AdvancedReporting({ userId, userType, accessToken }: AdvancedReportingProps) {
  const [data, setData] = useState<TutorPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userType !== 'tutor' || !userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(edgeFunctionUrl(`tutor-performance/${userId}`), {
          headers: edgeFunctionHeaders(accessToken || ''),
        });
        if (!res.ok) throw new Error('Failed to load performance data');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load performance data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, userType, accessToken]);

  const exportReport = (format: 'json' | 'csv') => {
    if (!data) return;
    const filename = `performance-report-${new Date().toISOString().slice(0, 10)}.${format}`;
    let blob: Blob;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    } else {
      const rows = [
        ['Metric', 'Value'],
        ['Average Rating', data.averageRating.toFixed(1)],
        ['Total Reviews', String(data.totalReviews)],
        ['Total Sessions', String(data.totalSessions)],
        ['Active Students', String(data.activeStudents)],
        ['On-Time Start %', `${data.onTimeStartPercentage}%`],
        ['Re-booking Rate', `${data.rebookingRate}%`],
        ['Report Completion Rate', `${data.reportCompletionRate}%`],
      ];
      blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (userType !== 'tutor') {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Analytics for this role aren't available yet.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Loading your performance data…
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          {error || 'No performance data available yet.'}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-sm text-gray-600">Based on your real bookings, reports, and reviews.</p>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => exportReport('json')}>
              <Download className="w-4 h-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportReport('csv')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Average Rating</p>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="mb-1">{data.averageRating.toFixed(1)}★</h2>
            <p className="text-xs text-gray-600">{data.totalReviews} review{data.totalReviews !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Sessions</p>
              <CheckCircle className="w-4 h-4" style={{ color: '#625d9c' }} />
            </div>
            <h2 className="mb-1">{data.totalSessions}</h2>
            <p className="text-xs text-gray-600">{data.activeStudents} student{data.activeStudents !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Re-booking Rate</p>
              <Target className="w-4 h-4" style={{ color: '#5d9827' }} />
            </div>
            <h2 className="mb-1">{data.rebookingRate}%</h2>
            <p className="text-xs text-gray-600">students who booked again</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">On-Time Start</p>
              <Award className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="mb-1">{data.onTimeStartPercentage}%</h2>
            <p className="text-xs text-gray-600">of sessions started on time</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Rating Trend</TabsTrigger>
          <TabsTrigger value="improvement">Improvement Areas</TabsTrigger>
          <TabsTrigger value="insights">Coaching Tips</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rating Trend</CardTitle>
              <CardDescription>Your last {data.ratingTrend.length} reviews over time</CardDescription>
            </CardHeader>
            <CardContent>
              {data.ratingTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.ratingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis domain={[0, 5]} />
                    <Tooltip labelFormatter={(d) => new Date(d as string).toLocaleDateString()} />
                    <Line type="monotone" dataKey="rating" stroke="#625d9c" strokeWidth={2} name="Rating" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No reviews yet — trends will appear once students start reviewing your sessions.</p>
              )}
            </CardContent>
          </Card>

          {data.strengths.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="improvement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Areas to Improve</CardTitle>
              <CardDescription>Based on your real metrics — punctuality, report turnaround, and re-booking rate</CardDescription>
            </CardHeader>
            <CardContent>
              {data.improvementAreas.length > 0 ? (
                <ul className="space-y-3">
                  {data.improvementAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{area}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">No improvement areas flagged right now — your metrics are looking good.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Coaching Tips</CardTitle>
              <CardDescription>Personalized suggestions based on your real performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.coachingTips.map((tip) => {
                  const colors = priorityColor[tip.priority] || priorityColor.medium;
                  return (
                    <div key={tip.id} className={`p-4 border rounded-lg ${colors.bg} ${colors.border}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={colors.text}>{tip.category}</h4>
                        <Badge style={{ backgroundColor: colors.badge, color: 'white' }}>{tip.priority} priority</Badge>
                      </div>
                      <p className={`text-sm ${colors.text}`}>{tip.tip}</p>
                      <p className="text-xs text-gray-500 mt-2">Related to: {tip.relatedMetric}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
