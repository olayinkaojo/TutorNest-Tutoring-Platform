import { parseWAT } from '../utils/timezone';
import { Bookshop } from './Bookshop';
import { ParentContentLibrary } from './ParentContentLibrary';
import { Chatroom } from './Chatroom';
import { DocumentManager } from './DocumentManager';
import { ResourcesHub } from './ResourcesHub';
import { CurriculumPDFViewer } from './CurriculumPDFViewer';
import { SessionReportsViewer } from './SessionReportsViewer';
import ErrorBoundary from './ErrorBoundary';
import { TriviaGame } from './TriviaGame';
import { TriviaLeaderboard } from './TriviaLeaderboard';
import { GamificationSystem } from './GamificationSystem';
import { DailyChallenge } from './trivia/DailyChallenge';
import { TimeAttackMode } from './trivia/TimeAttackMode';
import { BattleArena } from './trivia/BattleArena';
import AchievementPanel from './achievements/AchievementPanel';
import AchievementNotification from './achievements/AchievementNotification';
import LeaderboardAchievements from './achievements/LeaderboardAchievements';
import TopicGrid from './learning/TopicGrid';
import LearningPath from './learning/LearningPath';
import TopicDetails from './learning/TopicDetails';
import LearningPathProgress from './learning/LearningPathProgress';
import SubjectLeaderboard from './learning/SubjectLeaderboard';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { NotificationCenter } from './NotificationCenter';
import { MobileNavigation } from './MobileNavigation';
import { StudentAssessmentsList } from './StudentAssessmentsList';
import TutorNestLogo from './TutorNestLogo';
import studentAPI from '../utils/student-api-client';
import { useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  BookOpen,
  Clock,
  LogOut,
  Calendar,
  Video,
  CheckCircle,
  TrendingUp,
  BarChart3,
  Users,
  Target,
  FileText,
  Award,
  ShoppingBag,
  Library,
  MessageSquare
} from 'lucide-react';

interface UserProfile {
  id?: string;
  userId: string;
  role: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  grade?: string;
  gradeLevel?: string;
  subjects?: string[];
  learningGoals?: string[];
  full_name?: string;
  name?: string;
  linkedChildId?: string;
}

interface StudentDashboardProps {
  profile: UserProfile;
  onSignOut: () => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

export function StudentDashboard({
  initialProfile,
  onSignOut,
  initialTab,
  onTabChange,
}: {
  initialProfile: UserProfile;
  onSignOut: () => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}) {
  const supabase = getSupabaseClient();
  const hasMountedTabSync = useRef(false);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [loading, setLoading] = useState(false);
  const [gamificationKey, setGamificationKey] = useState(0); // Key to force refresh
  
  // Session and stats states
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    completedSessions: 0,
    upcomingSessions: 0,
    averageScore: 0
  });
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [progressOverTime, setProgressOverTime] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('performance');
  const [newReportsCount, setNewReportsCount] = useState(0);
  const [progressImprovement, setProgressImprovement] = useState<{ subject: string; improvement: number } | null>(null);
  const [lastReportCheck, setLastReportCheck] = useState<Date | null>(null);
  const academicStudentId = profile.linkedChildId || profile.id || profile.userId;

  const validTabs = new Set([
    'performance',
    'overview',
    'sessions',
    'reports',
    'curriculum',
    'messages',
    'documents',
    'gamification',
    'achievements',
    'learning-paths',
    'bookshop',
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session?.access_token) {
      loadStudentData();
    }
  }, [session]);

  // Monitor for progress improvements and notify tutors
  useEffect(() => {
    if (!session?.access_token || assessments.length < 2) return;

    const checkProgressImprovement = async () => {
      try {
        // Sort assessments by date to find recent ones
        const sortedAssessments = [...assessments].sort(
          (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Compare latest assessment with previous one
        if (sortedAssessments.length >= 2) {
          const latest = sortedAssessments[0];
          const previous = sortedAssessments[1];

          // Calculate average scores for each assessment
          const latestScore = (
            latest.understanding + 
            latest.participation + 
            latest.homeworkCompletion + 
            latest.attentiveness + 
            latest.improvement
          ) / 5;

          const previousScore = (
            previous.understanding + 
            previous.participation + 
            previous.homeworkCompletion + 
            previous.attentiveness + 
            previous.improvement
          ) / 5;

          // Calculate improvement percentage
          const improvementPct = previousScore > 0 
            ? ((latestScore - previousScore) / previousScore) * 100 
            : 0;

          // Update badge if significant improvement
          if (improvementPct >= 5) {
            setProgressImprovement({
              subject: latest.subject || 'General',
              improvement: improvementPct,
            });

            await studentAPI.notifyProgressImprovement(
              session.access_token,
              academicStudentId,
              previousScore,
              latestScore,
              latest.subject || 'General',
              latest.tutorId
            );

            console.log(`Progress improvement detected: ${improvementPct.toFixed(1)}% in ${latest.subject}`);
          }
        }
      } catch (error) {
        console.error('Error checking progress improvement:', error);
      }
    };

    checkProgressImprovement();
  }, [assessments, session?.access_token, academicStudentId]);

  // Monitor for new session reports
  useEffect(() => {
    if (!session?.access_token) return;

    const checkForNewReports = async () => {
      try {
        // Get all completed bookings (which should have reports)
        const allBookings = await studentAPI.getStudentBookings(session.access_token, academicStudentId);
        const completedBookings = allBookings.filter((b: any) => b.status === 'completed');

        // Get reports for completed bookings
        if (completedBookings.length > 0) {
          const reports = await studentAPI.getReportsForBookings(
            session.access_token,
            completedBookings.map((b: any) => b.id)
          );

          // Count unviewed reports
          const unviewedReports = reports.filter((r: any) => 
            !r.viewedBy || !r.viewedBy.includes(academicStudentId)
          );

          if (unviewedReports.length > 0) {
            setNewReportsCount(unviewedReports.length);
            setLastReportCheck(new Date());
          } else {
            setNewReportsCount(0);
          }
        }
      } catch (error) {
        console.error('Error checking for new reports:', error);
      }
    };

    // Check for new reports when completed sessions change
    if (completedSessions.length > 0) {
      checkForNewReports();
    }
  }, [completedSessions, session?.access_token, academicStudentId]);

  const loadStudentData = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const studentId = academicStudentId;

      // Load bookings using studentAPI
      const allBookings = await studentAPI.getStudentBookings(session.access_token, studentId);
      
      const now = new Date();
      const upcoming = allBookings.filter((b: any) =>
        parseWAT(b.date, b.startTime) >= now && (b.status === 'confirmed' || b.status === 'pending')
      );
      const completed = allBookings.filter((b: any) => b.status === 'completed');

      setUpcomingSessions(upcoming);
      setCompletedSessions(completed);

      setStats({
        totalSessions: allBookings.length,
        completedSessions: completed.length,
        upcomingSessions: upcoming.length,
        averageScore: 0 // Will be calculated from assessments
      });

      // Load assessments using studentAPI
      const studentAssessments = await studentAPI.getStudentAssessments(session.access_token, studentId);
      setAssessments(studentAssessments);

      // Calculate average score
      if (studentAssessments.length > 0) {
        const totalScore = studentAssessments.reduce((sum: number, a: any) => {
          const avgScore = (
            a.understanding + 
            a.participation + 
            a.homeworkCompletion + 
            a.attentiveness + 
            a.improvement
          ) / 5;
          return sum + avgScore;
        }, 0);
        const averageScore = Math.round(totalScore / studentAssessments.length);
        
        setStats((prev: any) => ({
          ...prev,
          averageScore
        }));
      }

      // Process assessments for performance data by subject
      const subjectPerformance = processSubjectPerformance(studentAssessments);
      setPerformanceData(subjectPerformance);

      // Process assessments for progress over time
      const timeProgress = processProgressOverTime(studentAssessments);
      setProgressOverTime(timeProgress);

    } catch (err) {
      console.error('Error loading student data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processSubjectPerformance = (assessments: any[]) => {
    const subjectMap = new Map();

    assessments.forEach((assessment: any) => {
      const subject = assessment.subject || 'General';
      const avgScore = (
        assessment.understanding + 
        assessment.participation + 
        assessment.homeworkCompletion + 
        assessment.attentiveness + 
        assessment.improvement
      ) / 5;

      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { scores: [], count: 0 });
      }

      const subjectData = subjectMap.get(subject);
      subjectData.scores.push(avgScore);
      subjectData.count++;
    });

    return Array.from(subjectMap.entries()).map(([subject, data]: [string, any]) => ({
      subject,
      score: Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.count),
      sessions: data.count
    }));
  };

  const processProgressOverTime = (assessments: any[]) => {
    // Group assessments by month
    const monthMap = new Map();

    assessments.forEach((assessment: any) => {
      const date = new Date(assessment.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const avgScore = (
        assessment.understanding + 
        assessment.participation + 
        assessment.homeworkCompletion + 
        assessment.attentiveness + 
        assessment.improvement
      ) / 5;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthLabel, scores: [], count: 0 });
      }

      const monthData = monthMap.get(monthKey);
      monthData.scores.push(avgScore);
      monthData.count++;
    });

    return Array.from(monthMap.values())
      .map(data => ({
        month: data.month,
        avgScore: Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.count),
        sessions: data.count
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-6); // Last 6 months
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#5d9827'; // Green
    if (score >= 60) return '#f59e0b'; // Orange
    return '#dc2626'; // Red
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Improvement';
  };

  // Tab mapping for mobile navigation
  const mapTabToNav = (tab: string) => {
    const mapping: Record<string, string> = {
      'overview': 'home',
      'sessions': 'sessions',
      'performance': 'reports',
      'curriculum': 'resources',
      'gamification': 'rewards',
    };
    return mapping[tab] || 'home';
  };

  const handleNavChange = (navId: string) => {
    const reverseMapping: Record<string, string> = {
      'home': 'overview',
      'sessions': 'sessions',
      'reports': 'performance',
      'resources': 'curriculum',
      'rewards': 'gamification',
    };
    const tabValue = reverseMapping[navId] || 'overview';
    setActiveTab(tabValue);
  };

  const studentName = profile.full_name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.name || 'Student';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <MobileNavigation 
        userType="student"
        activeTab={mapTabToNav(activeTab)}
        onTabChange={handleNavChange}
        notificationCount={0}
        messageCount={0}
      />

      {/* Header - Hidden on mobile */}
      <header className="hidden lg:block bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <TutorNestLogo />
            <div className="flex items-center gap-4">
              {/* Bookshop Button */}
              <Button
                onClick={() => setActiveTab('bookshop')}
                className="text-white h-10 px-6 shadow-md hover:shadow-lg transition-shadow"
                style={{ backgroundColor: '#5d9827' }}
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Bookshop
              </Button>
              {/* Resources Button */}
              <Button
                onClick={() => setActiveTab('resources')}
                className="text-white h-10 px-6 shadow-md hover:shadow-lg transition-shadow"
                style={{ backgroundColor: '#5d9827' }}
              >
                <Library className="w-4 h-4 mr-2" />
                Resources
              </Button>
              {/* Notification Center */}
              {session && (
                <NotificationCenter session={session} userId={profile.id || profile.userId} />
              )}

              {/* Account Type Badge */}
              <Badge className="text-white" style={{ backgroundColor: '#625d9c' }}>
                Student Account
              </Badge>

              <span className="text-sm text-gray-600">Welcome, {studentName}</span>

              <Button variant="ghost" size="sm" onClick={onSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 lg:py-8 pb-20 lg:pb-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="mb-2 text-2xl lg:text-3xl">Welcome back, {studentName}</h1>
          <p className="text-gray-600">Track your learning progress and upcoming sessions</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Sessions</p>
                  <h2 className="text-2xl">{stats.totalSessions}</h2>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#625d9c20' }}>
                  <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Completed</p>
                  <h2 className="text-2xl">{stats.completedSessions}</h2>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Upcoming</p>
                  <h2 className="text-2xl">{stats.upcomingSessions}</h2>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Avg. Performance</p>
                  <h2 className="text-2xl">{stats.averageScore}%</h2>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: getScoreColor(stats.averageScore) + '20' }}>
                  <TrendingUp className="w-5 h-5" style={{ color: getScoreColor(stats.averageScore) }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 hidden lg:inline-flex">
            <TabsTrigger value="performance">
              Performance
              {progressImprovement && (
                <Badge className="ml-2 bg-green-500 text-white text-xs">
                  +{progressImprovement.improvement.toFixed(1)}%
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="reports">
              Session Reports
              {newReportsCount > 0 && (
                <Badge className="ml-2 bg-blue-500 text-white text-xs">
                  {newReportsCount} new
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="gamification">Trivia & Rewards</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="learning-paths">Learning Paths</TabsTrigger>
          </TabsList>

          {/* Performance Tab - DEFAULT ACTIVE */}
          <TabsContent value="performance">
            <ErrorBoundary>
              <div className="space-y-6">
              {/* Overall Performance Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Overall Performance</CardTitle>
                      <CardDescription>Your academic progress across all subjects</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl mb-1" style={{ color: getScoreColor(stats.averageScore) }}>
                        {stats.averageScore}%
                      </div>
                      <Badge style={{ backgroundColor: getScoreColor(stats.averageScore), color: 'white' }}>
                        {getScoreLabel(stats.averageScore)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Performance Charts */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Progress Over Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" style={{ color: '#625d9c' }} />
                      Progress Over Time
                    </CardTitle>
                    <CardDescription>Your performance trend over the last 6 months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {progressOverTime.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={progressOverTime}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="avgScore" 
                            stroke="#625d9c" 
                            strokeWidth={3}
                            name="Average Score (%)" 
                            dot={{ fill: '#625d9c', r: 5 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No performance data yet</p>
                          <p className="text-xs text-gray-400">Complete some sessions to see your progress</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Subject Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" style={{ color: '#5d9827' }} />
                      Performance by Subject
                    </CardTitle>
                    <CardDescription>Your scores across different subjects</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {performanceData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={performanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="subject" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="score" fill="#625d9c" name="Average Score (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No subject data yet</p>
                          <p className="text-xs text-gray-400">Complete some sessions to see subject breakdown</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Subject Performance */}
              {performanceData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Subject Performance</CardTitle>
                    <CardDescription>Track your progress in each subject</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {performanceData.map((subject, index) => (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="mb-1">{subject.subject}</h4>
                              <p className="text-sm text-gray-600">{subject.sessions} session{subject.sessions !== 1 ? 's' : ''} completed</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl mb-1" style={{ color: getScoreColor(subject.score) }}>
                                {subject.score}%
                              </div>
                              <Badge variant="outline" style={{ borderColor: getScoreColor(subject.score), color: getScoreColor(subject.score) }}>
                                {getScoreLabel(subject.score)}
                              </Badge>
                            </div>
                          </div>
                          <Progress value={subject.score} className="h-2" style={{ backgroundColor: '#e5e7eb' }} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Session Assessments */}
              {session && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" style={{ color: '#625d9c' }} />
                      Session Assessments
                    </CardTitle>
                    <CardDescription>Detailed feedback from your tutors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StudentAssessmentsList 
                      studentId={academicStudentId}
                      accessToken={session.access_token}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <ErrorBoundary>
              <div className="grid lg:grid-cols-2 gap-6">
              {/* Upcoming Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: '#625d9c' }} />
                    Upcoming Sessions
                  </CardTitle>
                  <CardDescription>Your scheduled lessons</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingSessions.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingSessions.slice(0, 3).map(session => (
                        <div key={session.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#625d9c20' }}>
                            <BookOpen className="w-5 h-5" style={{ color: '#625d9c' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="mb-1">{session.subject || 'Session'}</h4>
                            <p className="text-sm text-gray-600 mb-2">with {session.tutorName || 'Tutor'}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 mr-1" />
                                {new Date(session.date).toLocaleDateString()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {session.time}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No upcoming sessions</p>
                      <p className="text-sm text-gray-400 mt-1">Book a session to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" style={{ color: '#5d9827' }} />
                    Recent Performance
                  </CardTitle>
                  <CardDescription>Your latest assessment scores</CardDescription>
                </CardHeader>
                <CardContent>
                  {assessments.length > 0 ? (
                    <div className="space-y-4">
                      {assessments.slice(0, 3).map(assessment => {
                        const avgScore = Math.round((
                          assessment.understanding + 
                          assessment.participation + 
                          assessment.homeworkCompletion + 
                          assessment.attentiveness + 
                          assessment.improvement
                        ) / 5);
                        
                        return (
                          <div key={assessment.id} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4>{assessment.subject || 'Session'}</h4>
                              <Badge style={{ backgroundColor: getScoreColor(avgScore), color: 'white' }}>
                                {avgScore}%
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {new Date(assessment.createdAt).toLocaleDateString()}
                            </p>
                            {assessment.feedback && (
                              <p className="text-sm text-gray-700 italic">"{assessment.feedback}"</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No assessments yet</p>
                      <p className="text-sm text-gray-400 mt-1">Complete sessions to receive feedback</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <ErrorBoundary>
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" style={{ color: '#625d9c' }} />
                  All Sessions
                </CardTitle>
                <CardDescription>View and manage your sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length > 0 || completedSessions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Upcoming Sessions */}
                    {upcomingSessions.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-sm uppercase tracking-wider text-gray-500">Upcoming</h3>
                        <div className="space-y-3">
                          {upcomingSessions.map(session => (
                            <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg bg-blue-50">
                              <div className="flex items-start gap-4">
                                <Avatar>
                                  <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                                    {session.tutorName?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="mb-1">{session.subject || 'Session'}</h4>
                                  <p className="text-sm text-gray-600 mb-2">with {session.tutorName || 'Tutor'}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {new Date(session.date).toLocaleDateString()} at {session.time}
                                    </Badge>
                                    <Badge style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                                      Upcoming
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Sessions */}
                    {completedSessions.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-sm uppercase tracking-wider text-gray-500">Completed</h3>
                        <div className="space-y-3">
                          {completedSessions.map(session => (
                            <div key={session.id} className="flex items-start justify-between p-4 border rounded-lg">
                              <div className="flex items-start gap-4">
                                <Avatar>
                                  <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                                    {session.tutorName?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="mb-1">{session.subject || 'Session'}</h4>
                                  <p className="text-sm text-gray-600 mb-2">with {session.tutorName || 'Tutor'}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">
                                      {new Date(session.date).toLocaleDateString()}
                                    </Badge>
                                    <Badge style={{ backgroundColor: '#5d9827', color: 'white' }}>
                                      Completed
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Video className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No sessions yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your parent will book sessions for you</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </ErrorBoundary>
          </TabsContent>

          {/* Session Reports Tab */}
          <TabsContent value="reports">
            <ErrorBoundary>
              {session && (
                <SessionReportsViewer 
                userId={profile.id || profile.userId}
                accessToken={session.access_token}
                viewType="student"
              />
              )}
            </ErrorBoundary>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <ErrorBoundary>
              {session && profile.gradeLevel ? (
                <CurriculumPDFViewer 
                gradeLevel={profile.gradeLevel || profile.grade || 'year_1'}
                accessToken={session.access_token}
                studentName={studentName}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Curriculum materials will appear here once your grade level is set</p>
                </CardContent>
              </Card>
            )}
            </ErrorBoundary>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ErrorBoundary>
              {session ? (
                <Chatroom 
                session={session}
                userId={profile.id || profile.userId}
                userName={studentName}
                userRole="student"
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
            </ErrorBoundary>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <ErrorBoundary>
              {session ? (
                <DocumentManager 
                session={session}
                userId={profile.id || profile.userId}
                userRole="student"
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
            </ErrorBoundary>
          </TabsContent>

          {/* Bookshop Tab */}
          <TabsContent value="bookshop">
            <ErrorBoundary>
              {session && (
                <Bookshop session={session} subscriptionTier="basic" />
              )}
            </ErrorBoundary>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <ErrorBoundary>
              {session ? (
                <ResourcesHub
                session={session}
                userId={profile.id || profile.userId}
                userRole="student"
                gradeLevel={profile.gradeLevel || profile.grade}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Library className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Loading...</p>
                </CardContent>
              </Card>
            )}
            </ErrorBoundary>
          </TabsContent>

          {/* Gamification Tab */}
          <TabsContent value="gamification">
            <ErrorBoundary>
              <div className="space-y-6">
              {/* World-Class Trivia Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                {/* Daily Challenge */}
                <div className="lg:col-span-3">
                  <DailyChallenge />
                </div>

                {/* Time Attack Mode */}
                <TimeAttackMode />

                {/* Battle Arena */}
                <div className="lg:col-span-2">
                  <BattleArena />
                </div>
              </div>

              {/* Original Trivia Challenge Game */}
              <TriviaGame 
                userId={profile.userId} 
                grade={profile.gradeLevel || profile.grade || 'year_1'}
                onXPEarned={(xp) => {
                  // Refresh gamification system when XP is earned
                  console.log(`Earned ${xp} XP from trivia!`);
                  setGamificationKey(prev => prev + 1);
                }}
              />

              {/* Trivia Leaderboard */}
              <TriviaLeaderboard 
                userId={profile.userId}
                grade={profile.gradeLevel || profile.grade || 'year_1'}
              />

              {/* Main Gamification System */}
              <GamificationSystem key={gamificationKey} userId={profile.userId} userType="student" />
            </div>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="achievements">
            <ErrorBoundary>
              <div className="space-y-6">
              {/* Achievement Notification */}
              <AchievementNotification
                badge={null}
                onDismiss={() => {}}
              />

              {/* Achievement Panel */}
              <AchievementPanel
                achievements={[]}
                unlockedCount={0}
                totalCount={20}
              />

              {/* Leaderboard */}
              <LeaderboardAchievements
                leaderboard={[]}
                currentUserId={profile.userId}
                limit={50}
              />
            </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Learning Paths Tab */}
          <TabsContent value="learning-paths">
            <ErrorBoundary>
              <div className="space-y-6">
              <TopicGrid />
              <LearningPathProgress 
                activePaths={[]}
                recommendedTopics={[]}
                onPathClick={(topicId) => console.log('Path clicked:', topicId)}
                onRecommendedClick={(topicId) => console.log('Recommended clicked:', topicId)}
              />
            </div>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}