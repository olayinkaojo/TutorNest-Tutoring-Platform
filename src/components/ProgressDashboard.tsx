import { useState, useEffect } from 'react';
import { projectId } from '../utils/supabase/info';
import { StudentAssessmentsList } from './StudentAssessmentsList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  Book, 
  Clock, 
  Target,
  AlertCircle,
  Loader2,
  Download,
  Share2,
  Calendar,
  CheckCircle,
  Flame,
  Trophy,
  Star,
  BookOpen
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

interface ProgressDashboardProps {
  session: any;
  studentId: string;
  studentName: string;
}

export function ProgressDashboard({ session, studentId, studentName }: ProgressDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30days');

  useEffect(() => {
    fetchProgressData();
  }, [studentId, selectedTimeframe]);

  const fetchProgressData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/students/${studentId}/progress?timeframe=${selectedTimeframe}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch progress data');

      const data = await response.json();
      setProgressData(data);
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: '#625d9c' }} />
          <p className="text-gray-600">Loading progress data...</p>
        </CardContent>
      </Card>
    );
  }

  if (!progressData) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No progress data available yet</p>
          <p className="text-sm mt-2">Complete some sessions to see progress tracking</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#625d9c', '#5d9827', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {studentName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{studentName}'s Progress</h2>
                <p className="text-gray-600">Track learning journey and achievements</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeframe Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Show data for:</span>
        <div className="flex gap-1">
          {[
            { value: '7days', label: '7 Days' },
            { value: '30days', label: '30 Days' },
            { value: '90days', label: '3 Months' },
            { value: 'all', label: 'All Time' }
          ].map((option) => (
            <Button
              key={option.value}
              variant={selectedTimeframe === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(option.value)}
              style={selectedTimeframe === option.value ? { backgroundColor: '#625d9c', color: 'white' } : {}}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-3xl font-bold" style={{ color: '#625d9c' }}>
                  {progressData.stats.totalSessions}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-200" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              +{progressData.stats.sessionsThisMonth} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Hours Studied</p>
                <p className="text-3xl font-bold" style={{ color: '#5d9827' }}>
                  {progressData.stats.totalHours}
                </p>
              </div>
              <Clock className="w-10 h-10 text-green-200" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Avg {progressData.stats.avgHoursPerWeek}h per week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-3xl font-bold text-blue-600">
                  {progressData.stats.attendanceRate}%
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-blue-200" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {progressData.stats.sessionsAttended}/{progressData.stats.totalSessions} attended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-3xl font-bold text-amber-600">
                  {progressData.stats.currentStreak}
                </p>
              </div>
              <Flame className="w-10 h-10 text-amber-200" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Longest: {progressData.stats.longestStreak} weeks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
            Subject Performance
          </CardTitle>
          <CardDescription>Hours studied and progress by subject</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={progressData.subjectPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hours" fill="#625d9c" name="Hours Studied" />
              <Bar dataKey="sessions" fill="#5d9827" name="Sessions Completed" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Learning Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: '#5d9827' }} />
              Learning Trend
            </CardTitle>
            <CardDescription>Sessions completed over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={progressData.learningTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#625d9c" 
                  fill="#625d9c" 
                  fillOpacity={0.3}
                  name="Sessions"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skills Mastery Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" style={{ color: '#625d9c' }} />
              Skills Mastery
            </CardTitle>
            <CardDescription>Competency across different skill areas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={progressData.skillsMastery}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar 
                  name="Mastery" 
                  dataKey="level" 
                  stroke="#625d9c" 
                  fill="#625d9c" 
                  fillOpacity={0.6} 
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Skills Worked On */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" style={{ color: '#5d9827' }} />
            Skills Practiced ({progressData.skillsWorkedOn.length})
          </CardTitle>
          <CardDescription>All skills worked on during sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {progressData.skillsWorkedOn.map((skill: any) => (
              <Badge
                key={skill.name}
                className="px-3 py-2 text-sm"
                style={{ backgroundColor: '#5d9827', color: 'white' }}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {skill.name}
                <span className="ml-2 opacity-75">×{skill.count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Grade Progress */}
      {progressData.gradeProgress && progressData.gradeProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" style={{ color: '#f59e0b' }} />
              Grade Progress
            </CardTitle>
            <CardDescription>Movement towards target grades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {progressData.gradeProgress.map((subject: any) => (
                <div key={subject.subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{subject.subject}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{subject.currentGrade}</Badge>
                      <span className="text-gray-400">→</span>
                      <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>
                        Target: {subject.targetGrade}
                      </Badge>
                    </div>
                  </div>
                  <div className="relative pt-1">
                    <div className="flex mb-2 items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold inline-block text-blue-600">
                          Progress: {subject.progress}%
                        </span>
                      </div>
                    </div>
                    <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                      <div
                        style={{ width: `${subject.progress}%`, backgroundColor: '#5d9827' }}
                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500"
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Recent Achievements
          </CardTitle>
          <CardDescription>Milestones and accomplishments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {progressData.achievements.map((achievement: any) => (
              <div
                key={achievement.id}
                className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
              >
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{achievement.title}</p>
                  <p className="text-sm text-gray-600">{achievement.description}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(achievement.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Ratings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Average Session Rating
          </CardTitle>
          <CardDescription>Based on tutor assessments and parent feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold" style={{ color: '#5d9827' }}>
              {progressData.stats.averageRating.toFixed(1)}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-8 h-8 ${
                    star <= Math.round(progressData.stats.averageRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-600">
              Based on {progressData.stats.totalRatings} ratings
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {progressData.recommendations && progressData.recommendations.length > 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <Target className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Recommendations for continued progress:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {progressData.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="text-sm">{rec}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Assessments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
            Assessments
          </CardTitle>
          <CardDescription>View detailed session assessments and performance feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentAssessmentsList 
            studentId={studentId} 
            accessToken={session.access_token}
          />
        </CardContent>
      </Card>
    </div>
  );
}