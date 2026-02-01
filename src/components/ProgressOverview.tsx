import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  TrendingUp, 
  Award,
  Calendar,
  Download,
  CheckCircle,
  AlertCircle,
  Target,
  Star,
  Clock,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProgressOverviewProps {
  session: any;
  studentId: string;
}

interface ProgressData {
  sessionsAttended: number;
  totalSessions: number;
  topicsMastered: string[];
  currentTopics: string[];
  averageEngagement: number;
  averageProgress: number;
  feedbackTrends: FeedbackTrend[];
  recentReports: SessionReport[];
  performanceBySubject: SubjectPerformance[];
  attendanceRate: number;
  improvementAreas: string[];
}

interface FeedbackTrend {
  date: string;
  engagement: number;
  progress: number;
}

interface SessionReport {
  id: string;
  date: string;
  tutorName: string;
  subject: string;
  topicsCovered: string[];
  strengths: string[];
  engagement: number;
  progress: number;
}

interface SubjectPerformance {
  subject: string;
  sessions: number;
  avgRating: number;
  topicsCovered: number;
}

export function ProgressOverview({ session, studentId }: ProgressOverviewProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchProgressData();
  }, [studentId]);

  const fetchProgressData = async () => {
    setLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/progress/${studentId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }

      const data = await response.json();
      setProgressData(data);

      const duration = Date.now() - startTime;
      console.log(`Progress data loaded in ${duration}ms`);
    } catch (err: any) {
      console.error('Error fetching progress data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/progress/${studentId}/export`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progress-report-${studentId}-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-8 h-8 animate-pulse mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading progress data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !progressData) {
    return (
      <Alert className="bg-red-50 border-red-200">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">{error || 'Failed to load progress data'}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Term Progress Overview</CardTitle>
              <CardDescription>Track your child's learning journey and achievements</CardDescription>
            </div>
            <Button
              onClick={handleExportPDF}
              disabled={exporting}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions Attended</p>
                <h2 className="mt-1">{progressData.sessionsAttended}/{progressData.totalSessions}</h2>
                <Badge 
                  className="mt-2"
                  style={{ 
                    backgroundColor: progressData.attendanceRate >= 80 ? '#5d9827' : progressData.attendanceRate >= 60 ? '#f59e0b' : '#ef4444',
                    color: 'white'
                  }}
                >
                  {progressData.attendanceRate}% Attendance
                </Badge>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Topics Mastered</p>
                <h2 className="mt-1">{progressData.topicsMastered.length}</h2>
                <p className="text-xs text-gray-500 mt-2">
                  {progressData.currentTopics.length} in progress
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Engagement</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= progressData.averageEngagement ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm">{progressData.averageEngagement.toFixed(1)}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Progress</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= progressData.averageProgress ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm">{progressData.averageProgress.toFixed(1)}</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="subjects">By Subject</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="reports">Recent Reports</TabsTrigger>
        </TabsList>

        {/* Feedback Trends Chart */}
        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement & Progress Trends</CardTitle>
              <CardDescription>Track improvement over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData.feedbackTrends}>
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
                      dataKey="engagement" 
                      stroke="#625d9c" 
                      strokeWidth={2}
                      name="Engagement"
                      dot={{ fill: '#625d9c' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="#5d9827" 
                      strokeWidth={2}
                      name="Progress"
                      dot={{ fill: '#5d9827' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance by Subject */}
        <TabsContent value="subjects" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Subject</CardTitle>
              <CardDescription>Average ratings and session count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progressData.performanceBySubject}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="subject" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip formatter={(value: any) => value.toFixed(1)} />
                    <Legend />
                    <Bar dataKey="avgRating" fill="#625d9c" name="Average Rating" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 space-y-3">
                {progressData.performanceBySubject.map((subject) => (
                  <div key={subject.subject} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm">{subject.subject}</h3>
                      <Badge variant="secondary">{subject.sessions} sessions</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Avg Rating: {subject.avgRating.toFixed(1)}/5</span>
                      <span>•</span>
                      <span>{subject.topicsCovered} topics covered</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Topics Mastered */}
        <TabsContent value="topics" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Topics Mastered
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressData.topicsMastered.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No topics mastered yet</p>
                ) : (
                  <ul className="space-y-2">
                    {progressData.topicsMastered.map((topic, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{topic}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Currently Learning
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progressData.currentTopics.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-8">No topics in progress</p>
                ) : (
                  <ul className="space-y-2">
                    {progressData.currentTopics.map((topic, idx) => (
                      <li key={idx} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{topic}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {progressData.improvementAreas.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: '#625d9c' }} />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {progressData.improvementAreas.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recent Reports */}
        <TabsContent value="reports" className="mt-6">
          <div className="space-y-4">
            {progressData.recentReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>No reports available yet</p>
                </CardContent>
              </Card>
            ) : (
              progressData.recentReports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-sm mb-1">{report.subject}</h3>
                        <p className="text-xs text-gray-500">
                          {new Date(report.date).toLocaleDateString()} • {report.tutorName}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          <Star className="w-3 h-3 mr-1" />
                          {report.engagement}/5
                        </Badge>
                        <Badge variant="outline">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {report.progress}/5
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Topics Covered</p>
                        <div className="flex flex-wrap gap-2">
                          {report.topicsCovered.map((topic, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Strengths</p>
                        <ul className="space-y-1">
                          {report.strengths.slice(0, 2).map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Export Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Download className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Export for School Meetings:</strong> Click "Export PDF" to download a comprehensive
          progress report suitable for sharing with teachers and school administrators.
        </AlertDescription>
      </Alert>
    </div>
  );
}