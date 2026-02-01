import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Star, 
  Clock,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle,
  Target,
  Users,
  Award,
  Lightbulb
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TutorPerformanceDashboardProps {
  session: any;
  tutorId: string;
}

interface PerformanceData {
  averageRating: number;
  totalReviews: number;
  onTimeStartPercentage: number;
  rebookingRate: number;
  reportCompletionRate: number;
  totalSessions: number;
  activeStudents: number;
  responseTime: number; // in minutes
  ratingTrend: RatingTrendData[];
  strengths: string[];
  improvementAreas: string[];
  coachingTips: CoachingTip[];
}

interface RatingTrendData {
  date: string;
  rating: number;
}

interface CoachingTip {
  id: string;
  category: string;
  tip: string;
  priority: 'high' | 'medium' | 'low';
  relatedMetric: string;
}

export function TutorPerformanceDashboard({ session, tutorId }: TutorPerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPerformanceData();
  }, [tutorId]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/tutor-performance/${tutorId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const data = await response.json();
      setPerformanceData(data);
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMetricStatus = (value: number, threshold: { good: number; warning: number }): 'good' | 'warning' | 'poor' => {
    if (value >= threshold.good) return 'good';
    if (value >= threshold.warning) return 'warning';
    return 'poor';
  };

  const getStatusColor = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good':
        return { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' };
      case 'warning':
        return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' };
      case 'poor':
        return { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' };
    }
  };

  const getStatusIcon = (status: 'good' | 'warning' | 'poor') => {
    switch (status) {
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'poor':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Award className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading performance data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !performanceData) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error || 'Failed to load performance data'}</AlertDescription>
      </Alert>
    );
  }

  // Calculate metric statuses
  const ratingStatus = getMetricStatus(performanceData.averageRating, { good: 4.5, warning: 4.0 });
  const onTimeStatus = getMetricStatus(performanceData.onTimeStartPercentage, { good: 95, warning: 85 });
  const rebookingStatus = getMetricStatus(performanceData.rebookingRate, { good: 80, warning: 60 });
  const reportStatus = getMetricStatus(performanceData.reportCompletionRate, { good: 95, warning: 85 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Your Performance Dashboard</CardTitle>
          <CardDescription>Track your teaching metrics and get personalized coaching tips</CardDescription>
        </CardHeader>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Rating */}
        <Card className={`border-2 ${getStatusColor(ratingStatus).border}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Average Rating</p>
                <div className="flex items-center gap-2">
                  <h2>{performanceData.averageRating.toFixed(1)}</h2>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(performanceData.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">From {performanceData.totalReviews} reviews</p>
              </div>
              {getStatusIcon(ratingStatus)}
            </div>
            {ratingStatus !== 'good' && (
              <Alert className={`${getStatusColor(ratingStatus).bg} ${getStatusColor(ratingStatus).border} mt-3`}>
                <AlertDescription className={`text-xs ${getStatusColor(ratingStatus).text}`}>
                  {ratingStatus === 'warning' ? 'Aim for 4.5+ to excel' : 'Focus on improving student satisfaction'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* On-Time Start % */}
        <Card className={`border-2 ${getStatusColor(onTimeStatus).border}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">On-Time Start</p>
                <h2>{performanceData.onTimeStartPercentage}%</h2>
                <p className="text-xs text-gray-500 mt-1">Out of {performanceData.totalSessions} sessions</p>
              </div>
              {getStatusIcon(onTimeStatus)}
            </div>
            {onTimeStatus !== 'good' && (
              <Alert className={`${getStatusColor(onTimeStatus).bg} ${getStatusColor(onTimeStatus).border} mt-3`}>
                <AlertDescription className={`text-xs ${getStatusColor(onTimeStatus).text}`}>
                  {onTimeStatus === 'warning' ? 'Target 95%+ punctuality' : 'Punctuality is critical for trust'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Re-booking Rate */}
        <Card className={`border-2 ${getStatusColor(rebookingStatus).border}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Re-booking Rate</p>
                <h2>{performanceData.rebookingRate}%</h2>
                <p className="text-xs text-gray-500 mt-1">Student retention</p>
              </div>
              {getStatusIcon(rebookingStatus)}
            </div>
            {rebookingStatus !== 'good' && (
              <Alert className={`${getStatusColor(rebookingStatus).bg} ${getStatusColor(rebookingStatus).border} mt-3`}>
                <AlertDescription className={`text-xs ${getStatusColor(rebookingStatus).text}`}>
                  {rebookingStatus === 'warning' ? 'Build stronger relationships' : 'Focus on engagement and results'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Report Completion */}
        <Card className={`border-2 ${getStatusColor(reportStatus).border}`}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-1">Report Completion</p>
                <h2>{performanceData.reportCompletionRate}%</h2>
                <p className="text-xs text-gray-500 mt-1">On-time submissions</p>
              </div>
              {getStatusIcon(reportStatus)}
            </div>
            {reportStatus !== 'good' && (
              <Alert className={`${getStatusColor(reportStatus).bg} ${getStatusColor(reportStatus).border} mt-3`}>
                <AlertDescription className={`text-xs ${getStatusColor(reportStatus).text}`}>
                  {reportStatus === 'warning' ? 'Complete reports within 48hrs' : 'Parents rely on timely feedback'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <h2 className="mt-1">{performanceData.totalSessions}</h2>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Students</p>
                <h2 className="mt-1">{performanceData.activeStudents}</h2>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Response Time</p>
                <h2 className="mt-1">{performanceData.responseTime}m</h2>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Rating Trend</CardTitle>
          <CardDescription>Track your rating over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData.ratingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value: any) => value.toFixed(1)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="rating" 
                  stroke="#625d9c" 
                  strokeWidth={2}
                  name="Average Rating"
                  dot={{ fill: '#625d9c' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Improvement Areas */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData.strengths.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">Complete more sessions to see strengths</p>
            ) : (
              <ul className="space-y-2">
                {performanceData.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: '#625d9c' }} />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {performanceData.improvementAreas.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">You're doing great! No areas flagged.</p>
            ) : (
              <ul className="space-y-2">
                {performanceData.improvementAreas.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contextual Coaching Tips */}
      {performanceData.coachingTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              Personalized Coaching Tips
            </CardTitle>
            <CardDescription>Tips based on your performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {performanceData.coachingTips.map((tip) => (
              <Alert 
                key={tip.id} 
                className={
                  tip.priority === 'high' 
                    ? 'bg-red-50 border-red-200' 
                    : tip.priority === 'medium'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }
              >
                <Lightbulb className={`h-4 w-4 ${
                  tip.priority === 'high' 
                    ? 'text-red-600' 
                    : tip.priority === 'medium'
                    ? 'text-amber-600'
                    : 'text-blue-600'
                }`} />
                <AlertDescription className={
                  tip.priority === 'high' 
                    ? 'text-red-800' 
                    : tip.priority === 'medium'
                    ? 'text-amber-800'
                    : 'text-blue-800'
                }>
                  <div className="flex items-start justify-between mb-1">
                    <strong className="text-sm">{tip.category}</strong>
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{
                        borderColor: tip.priority === 'high' ? '#ef4444' : tip.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                        color: tip.priority === 'high' ? '#ef4444' : tip.priority === 'medium' ? '#f59e0b' : '#3b82f6'
                      }}
                    >
                      {tip.relatedMetric}
                    </Badge>
                  </div>
                  <p className="text-sm">{tip.tip}</p>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      <Alert className="bg-purple-50 border-purple-200">
        <Award className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-purple-800">
          <strong>Keep up the great work!</strong> Your performance metrics are tracked monthly.
          Aim for green indicators across all KPIs to unlock "Top Tutor" status and increase your visibility.
        </AlertDescription>
      </Alert>
    </div>
  );
}