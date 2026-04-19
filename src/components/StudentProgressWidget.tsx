import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import tutorAPI from '../utils/tutor-api-client';

interface StudentProgressWidgetProps {
  tutorId: string;
  studentId: string;
  accessToken: string;
  studentName?: string;
}

export function StudentProgressWidget({
  tutorId,
  studentId,
  accessToken,
  studentName = 'Student',
}: StudentProgressWidgetProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudentMetrics();
  }, [studentId, tutorId, accessToken]);

  const loadStudentMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const studentMetrics = await tutorAPI.getStudentMetrics(
        accessToken,
        tutorId,
        studentId
      );

      setMetrics(studentMetrics);
    } catch (err: any) {
      setError(err.message || 'Failed to load student metrics');
      console.error('Error loading student metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">Loading metrics...</div>
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

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getEngagementBadge = (engagement: number) => {
    if (engagement >= 80) return <Badge className="bg-green-100 text-green-800">Highly Engaged</Badge>;
    if (engagement >= 60) return <Badge className="bg-blue-100 text-blue-800">Engaged</Badge>;
    if (engagement >= 40) return <Badge className="bg-yellow-100 text-yellow-800">Moderate</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low Engagement</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{studentName}'s Progress</span>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </CardTitle>
          <CardDescription>Real-time performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Score</span>
              <span className="text-2xl font-bold" style={{ color: getProgressColor(metrics.currentScore || 0).replace('bg-', '#') }}>
                {metrics.currentScore || 0}%
              </span>
            </div>
            <Progress 
              value={metrics.currentScore || 0} 
              className="h-3"
            />
          </div>

          {/* Engagement Level */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">Engagement</span>
              {getEngagementBadge(metrics.engagementPercentage || 0)}
            </div>
            <Progress 
              value={metrics.engagementPercentage || 0} 
              className="h-2"
            />
          </div>

          {/* Sessions Completed */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Sessions Completed</div>
              <div className="text-2xl font-bold text-blue-600">
                {metrics.sessionsCompleted || 0}
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-600">Scheduled</div>
              <div className="text-2xl font-bold text-purple-600">
                {metrics.scheduledSessions || 0}
              </div>
            </div>
          </div>

          {/* Recent Progress */}
          {metrics.recentImprovement && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div>
                  <div className="text-sm font-medium text-green-900">Progress Improvement</div>
                  <div className="text-xs text-green-700">
                    +{metrics.recentImprovement.toFixed(1)}% in {metrics.improvementSubject || 'recent assessment'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Attendance Rate */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Attendance Rate</span>
              <span className="font-semibold">{metrics.attendanceRate || 0}%</span>
            </div>
            <Progress 
              value={metrics.attendanceRate || 0} 
              className="h-2"
            />
          </div>

          {/* Learning Streak */}
          {metrics.currentStreak > 0 && (
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <div>
                  <div className="text-sm font-medium text-orange-900">Learning Streak</div>
                  <div className="text-xs text-orange-700">
                    {metrics.currentStreak} consecutive sessions
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Last Report Status */}
          {metrics.lastReportDate && (
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              Last report: {new Date(metrics.lastReportDate).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
