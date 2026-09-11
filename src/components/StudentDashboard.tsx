import { parseWAT } from '../utils/timezone';
import { DocumentManager } from './DocumentManager';
import ErrorBoundary from './ErrorBoundary';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';
import { edgeFunctionUrl, edgeFunctionHeaders } from '../utils/supabase-edge-fetch';
import { NotificationCenter } from './NotificationCenter';
import { MobileNavigation } from './MobileNavigation';
import KFALogo from './KFALogo';
import studentAPI, { StudentAPIError } from '../utils/student-api-client';
import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { Skeleton } from './ui/skeleton';

// Lazy-loaded: each is only needed once its own tab is opened.
// ParentContentLibrary, LearningPath, TopicDetails, and SubjectLeaderboard
// (previously imported here too) were dead imports — never rendered;
// removed rather than lazy-loading code that never runs.
const Bookshop = lazy(() => import('./Bookshop').then(m => ({ default: m.Bookshop })));
const Chatroom = lazy(() => import('./Chatroom').then(m => ({ default: m.Chatroom })));
const ResourcesHub = lazy(() => import('./ResourcesHub').then(m => ({ default: m.ResourcesHub })));
const CurriculumPDFViewer = lazy(() => import('./CurriculumPDFViewer').then(m => ({ default: m.CurriculumPDFViewer })));
const RealSessionReportsList = lazy(() => import('./RealSessionReportsList').then(m => ({ default: m.RealSessionReportsList })));
const TriviaGame = lazy(() => import('./TriviaGame').then(m => ({ default: m.TriviaGame })));
const TriviaLeaderboard = lazy(() => import('./TriviaLeaderboard').then(m => ({ default: m.TriviaLeaderboard })));
const GamificationSystem = lazy(() => import('./GamificationSystem').then(m => ({ default: m.GamificationSystem })));
const DailyChallenge = lazy(() => import('./trivia/DailyChallenge').then(m => ({ default: m.DailyChallenge })));
const TimeAttackMode = lazy(() => import('./trivia/TimeAttackMode').then(m => ({ default: m.TimeAttackMode })));
const BattleArena = lazy(() => import('./trivia/BattleArena').then(m => ({ default: m.BattleArena })));
const AchievementPanel = lazy(() => import('./achievements/AchievementPanel'));
const AchievementNotification = lazy(() => import('./achievements/AchievementNotification'));
const LeaderboardAchievements = lazy(() => import('./achievements/LeaderboardAchievements'));
const TopicGrid = lazy(() => import('./learning/TopicGrid'));
const LearningPathProgress = lazy(() => import('./learning/LearningPathProgress'));
const StudentAssessmentsList = lazy(() => import('./StudentAssessmentsList').then(m => ({ default: m.StudentAssessmentsList })));
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
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { StudentGettingStartedCard } from './student/StudentGettingStartedCard';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { AvatarUpload } from './AvatarUpload';
import { SessionCallModal } from './SessionCallModal';
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

// Shared Suspense fallback for the lazy-loaded tabs above.
function TabFallback() {
  return <Skeleton className="h-64 w-full rounded-lg" />;
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
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSignOutRef = useRef(onSignOut);
  // Keep ref fresh without adding onSignOut to idle effect deps
  useEffect(() => { onSignOutRef.current = onSignOut; });

  // 3-hour idle timeout — signs out after 3 h of no mouse/key/scroll/touch activity
  useEffect(() => {
    const IDLE_MS = 3 * 60 * 60 * 1000; // 3 hours
    const reset = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => onSignOutRef.current(), IDLE_MS);
    };
    const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

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
  const [soonSession, setSoonSession] = useState<any>(null);
  const [callBookingId, setCallBookingId] = useState<string | null>(null);
  const [progressImprovement, setProgressImprovement] = useState<{ subject: string; improvement: number } | null>(null);
  const [lastReportCheck, setLastReportCheck] = useState<Date | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementStats, setAchievementStats] = useState({ unlockedCount: 0, totalCount: 0 });
  const [achievementLeaderboard, setAchievementLeaderboard] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<any[]>([]);
  const academicStudentId = profile.linkedChildId || profile.id || profile.userId;

  const validTabs = new Set([
    'performance',
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

  /** Keep checklist fields (subjects, goals, grade) in sync after parent edits or profile API updates */
  const mergeProfileFromServer = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;
    try {
      const res = await fetch(edgeFunctionUrl('profile'), {
        headers: edgeFunctionHeaders(token),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return;
      const data = await res.json();
      const next = data?.profile as Partial<UserProfile> | undefined;
      if (!next || typeof next !== 'object') return;
      setProfile((prev) => ({ ...prev, ...next }));
    } catch {
      /* non-fatal */
    }
  }, [session?.access_token]);

  /**
   * Achievements + Learning Paths tabs used to render hardcoded empty
   * props (achievements={[]}, activePaths={[]}, <TopicGrid /> with no
   * props at all) — the backend behind them was real (badges, topics,
   * learning-path tracking) but nothing ever fetched it. Merges
   * /achievements/all (every badge definition) with
   * /achievements/user-achievements (which ones this student has actually
   * unlocked) since the latter alone only lists unlocked badges, not the
   * full catalog the panel needs to show locked ones too.
   */
  const loadAchievementsAndTopics = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;
    const headers = edgeFunctionHeaders(token);

    try {
      const [allBadgesRes, userAchievementsRes, leaderboardRes] = await Promise.all([
        fetch(edgeFunctionUrl('achievements/all'), { headers }),
        fetch(edgeFunctionUrl('achievements/user-achievements'), { headers }),
        fetch(edgeFunctionUrl('achievements/leaderboard?limit=50'), { headers }),
      ]);

      if (allBadgesRes.ok && userAchievementsRes.ok) {
        const allData = await allBadgesRes.json();
        const userData = await userAchievementsRes.json();
        const unlockedIds = new Set((userData.achievements || []).map((a: any) => a.id));
        const merged = (allData.badges || []).map((badge: any) => ({
          ...badge,
          unlocked: unlockedIds.has(badge.id),
        }));
        setAchievements(merged);
        setAchievementStats({
          unlockedCount: userData.unlockedCount || 0,
          totalCount: userData.totalCount || merged.length,
        });
      }

      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setAchievementLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Error loading achievements:', err);
    }

    try {
      const [topicsRes, pathsRes, recommendedRes] = await Promise.all([
        fetch(edgeFunctionUrl('topics/all'), { headers }),
        fetch(edgeFunctionUrl('topics/learning-paths/all'), { headers }),
        fetch(edgeFunctionUrl('topics/recommended/topics?limit=3'), { headers }),
      ]);

      if (topicsRes.ok) {
        const data = await topicsRes.json();
        setTopics(data.topics || []);
      }
      if (pathsRes.ok) {
        const data = await pathsRes.json();
        setLearningPaths(data.paths || []);
      }
      if (recommendedRes.ok) {
        const data = await recommendedRes.json();
        setRecommendedTopics(data.recommended || []);
      }
    } catch (err) {
      console.error('Error loading topics/learning paths:', err);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token) {
      loadAchievementsAndTopics();
    }
  }, [session?.access_token, loadAchievementsAndTopics]);

  /** Starts (or resumes) a learning path for the clicked topic, then refreshes. */
  const handleStartLearningPath = useCallback(async (topicId: string) => {
    const token = session?.access_token;
    if (!token) return;
    try {
      const res = await fetch(edgeFunctionUrl('topics/learning-paths/start'), {
        method: 'POST',
        headers: { ...edgeFunctionHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      if (res.ok) {
        await loadAchievementsAndTopics();
      }
    } catch (err) {
      console.error('Error starting learning path:', err);
    }
  }, [session?.access_token, loadAchievementsAndTopics]);

  useEffect(() => {
    setProfile((prev) => ({ ...prev, ...initialProfile }));
  }, [initialProfile]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !session?.access_token) return;
      void mergeProfileFromServer();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [session?.access_token, mergeProfileFromServer]);

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
              {
                tutorId: latest.tutorId,
                previousScore,
                currentScore: latestScore,
                subject: latest.subject || 'General',
                improvementPercentage: improvementPct,
              }
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
        const allBookings = await studentAPI.getStudentBookings(
          session.access_token,
          academicStudentId,
          undefined,
          { timeout: 10_000 }
        );
        const completedBookings = allBookings.filter((b: any) => b.status === 'completed');

        // Get reports for completed bookings
        if (completedBookings.length > 0) {
          const reportPayload = await studentAPI.getReportsForBookings(
            session.access_token,
            completedBookings.map((b: any) => b.id),
            { timeout: 10_000 }
          );
          const reports = reportPayload.reports || [];

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

      // Load bookings using studentAPI (10s cap aligns with other dashboards)
      const allBookings = await studentAPI.getStudentBookings(
        session.access_token,
        studentId,
        undefined,
        { timeout: 10_000 }
      );
      
      const now = new Date();
      const upcoming = allBookings.filter((b: any) =>
        parseWAT(b.date, b.startTime) >= now && (b.status === 'confirmed' || b.status === 'pending')
      );
      const completed = allBookings.filter((b: any) => b.status === 'completed');

      setUpcomingSessions(upcoming);
      setCompletedSessions(completed);

      // Detect sessions starting within 60 minutes
      const nowMs = Date.now();
      const upcomingSoon = upcoming.find((s: any) => {
        if (s.status !== 'confirmed' && s.status !== 'scheduled') return false;
        const sessionDateTime = new Date(`${s.date || s.sessionDate}T${s.startTime || s.time || '00:00'}`).getTime();
        return sessionDateTime > nowMs && sessionDateTime - nowMs <= 60 * 60 * 1000;
      });
      setSoonSession(upcomingSoon || null);

      setStats({
        totalSessions: allBookings.length,
        completedSessions: completed.length,
        upcomingSessions: upcoming.length,
        averageScore: 0 // Will be calculated from assessments
      });

      // Load assessments using studentAPI
      const studentAssessments = await studentAPI.getStudentAssessments(
        session.access_token,
        studentId,
        10,
        { timeout: 10_000 }
      );
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

    } catch (err: unknown) {
      console.error('Error loading student data:', err);
      const isTimeout =
        (err instanceof StudentAPIError && err.code === 'TIMEOUT') ||
        (err as Error)?.name === 'AbortError' ||
        (err as Error)?.name === 'TimeoutError';
      if (isTimeout) {
        toast.error('Request timed out. Please check your connection and try again.');
        return;
      }
      toast.error('Could not load your sessions. Please refresh.');
    } finally {
      setLoading(false);
      void mergeProfileFromServer();
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
      'sessions': 'home',
      'performance': 'reports',
      'curriculum': 'resources',
      'gamification': 'rewards',
    };
    return mapping[tab] || 'home';
  };

  const handleNavChange = (navId: string) => {
    const reverseMapping: Record<string, string> = {
      'home': 'sessions',
      'sessions': 'sessions',
      'reports': 'performance',
      'resources': 'curriculum',
      'rewards': 'gamification',
    };
    const tabValue = reverseMapping[navId] || 'sessions';
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
            <KFALogo />
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

              <AvatarUpload
                session={session}
                photoUrl={profile.photoUrl}
                name={studentName}
              />
              <span className="text-sm text-gray-600">Welcome, {studentName.split(' ')[0]}</span>

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
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : (
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
        )}

        {/* Quick Actions */}
        {!loading && (
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={() => typeof onTabChange === 'function' && onTabChange('find-tutors')}
              className="flex flex-col items-center p-4 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-2 group-hover:bg-purple-200">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-medium text-gray-700">Book Session</span>
            </button>
          </div>
        )}

        {/* Session starting-soon banner */}
        {soonSession && (
          <div className="mb-4 bg-purple-600 text-white px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">🎓</span>
              <div>
                <p className="font-semibold text-sm">Your session is starting soon!</p>
                <p className="text-xs text-purple-200">
                  {soonSession.subject} with {soonSession.tutorName || 'your tutor'} —{' '}
                  {new Date(`${soonSession.date || soonSession.sessionDate}T${soonSession.startTime || soonSession.time}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            {(soonSession.googleMeetLink || soonSession.meetLink) && (
              <button
                onClick={() => setCallBookingId(soonSession.id)}
                className="bg-white text-purple-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors flex-shrink-0"
              >
                Join Now
              </button>
            )}
          </div>
        )}

        {/* Learning checklist: one placement for all tabs (mobile nav defaults away from Performance) */}
        <StudentGettingStartedCard
          userId={String(profile.linkedChildId || profile.id || profile.userId || '')}
          profile={profile}
          completedSessions={stats.completedSessions}
          upcomingSessions={stats.upcomingSessions}
          onOpenSessions={() => setActiveTab('sessions')}
          onOpenCurriculum={() => setActiveTab('curriculum')}
          onOpenReports={() => setActiveTab('reports')}
        />

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
                    <Suspense fallback={<TabFallback />}>
                      <StudentAssessmentsList
                        studentId={academicStudentId}
                        accessToken={session.access_token}
                      />
                    </Suspense>
                  </CardContent>
                </Card>
              )}
            </div>
            </ErrorBoundary>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions">
            <ErrorBoundary>
              <div className="space-y-6">
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="w-5 h-5" style={{ color: '#625d9c' }} />
                  All Sessions
                </CardTitle>
                <CardDescription>View and manage your sessions</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                ) : upcomingSessions.length > 0 || completedSessions.length > 0 ? (
                  <div className="space-y-6">
                    {/* Upcoming Sessions */}
                    {upcomingSessions.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-sm uppercase tracking-wider text-gray-500">Upcoming</h3>
                        <div className="space-y-3">
                          {upcomingSessions.map(session => {
                            const hoursUntil = (parseWAT(session.date, session.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
                            const startingSoon = hoursUntil >= 0 && hoursUntil <= 2;
                            return (
                              <div key={session.id} className={`flex items-start justify-between p-4 border rounded-lg ${startingSoon ? 'border-green-500 bg-green-50' : 'bg-blue-50'}`}>
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                  <Avatar>
                                    {session.tutorPhoto && <AvatarImage src={session.tutorPhoto} className="object-cover" />}
                                    <AvatarFallback style={{ backgroundColor: '#625d9c', color: 'white' }}>
                                      {session.tutorName?.split(' ').map((n: string) => n[0]).join('') || 'T'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="mb-1">{session.subject || 'Session'}</h4>
                                    <p className="text-sm text-gray-600 mb-2">with {session.tutorName || 'Tutor'}</p>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <Badge variant="outline">
                                        {new Date(session.date + 'T12:00:00+01:00').toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short' })} at {session.startTime} WAT
                                      </Badge>
                                      <Badge style={{ backgroundColor: startingSoon ? '#5d9827' : '#3b82f6', color: 'white' }}>
                                        {startingSoon ? 'Starting Soon' : 'Upcoming'}
                                      </Badge>
                                    </div>
                                    {session.googleMeetLink && (
                                      <button
                                        onClick={() => setCallBookingId(session.id)}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                                        style={{ backgroundColor: startingSoon ? '#5d9827' : '#625d9c' }}
                                      >
                                        <Video className="w-3.5 h-3.5" />
                                        {startingSoon ? 'Join Now' : 'Join Classroom'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                                  {session.tutorPhoto && <AvatarImage src={session.tutorPhoto} className="object-cover" />}
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
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No upcoming sessions</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
                      Find a tutor that matches your learning goals and book your first session.
                    </p>
                    <Button
                      className="text-white px-6 py-2"
                      style={{ backgroundColor: '#625d9c' }}
                      onClick={() => {
                        if (typeof onTabChange === 'function') {
                          onTabChange('find-tutors');
                        }
                      }}
                    >
                      Find a Tutor
                    </Button>
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
                    {assessments.slice(0, 3).map((assessment: any) => {
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

          {/* Session Reports Tab */}
          <TabsContent value="reports">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
              {session && (
                <RealSessionReportsList
                  session={session}
                  accessToken={session.access_token}
                  endpoint="/my-session-reports"
                  viewerRole="student"
                  title="Session Reports"
                  description="Reports your tutor has submitted after each session."
                />
              )}
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
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
              <Suspense fallback={<TabFallback />}>
              {session && (
                <Bookshop session={session} subscriptionTier="basic" />
              )}
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Gamification Tab */}
          <TabsContent value="gamification">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
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
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="achievements">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
              <div className="space-y-6">
              {/* Achievement Notification */}
              <AchievementNotification
                badge={null}
                onDismiss={() => {}}
              />

              {/* Achievement Panel */}
              <AchievementPanel
                achievements={achievements}
                unlockedCount={achievementStats.unlockedCount}
                totalCount={achievementStats.totalCount}
              />

              {/* Leaderboard */}
              <LeaderboardAchievements
                leaderboard={achievementLeaderboard}
                currentUserId={profile.userId}
                limit={50}
              />
            </div>
              </Suspense>
            </ErrorBoundary>
          </TabsContent>

          {/* Learning Paths Tab */}
          <TabsContent value="learning-paths">
            <ErrorBoundary>
              <Suspense fallback={<TabFallback />}>
              <div className="space-y-6">
              <TopicGrid topics={topics} onTopicClick={handleStartLearningPath} />
              <LearningPathProgress
                activePaths={learningPaths}
                recommendedTopics={recommendedTopics}
                onPathClick={handleStartLearningPath}
                onRecommendedClick={handleStartLearningPath}
              />
            </div>
              </Suspense>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </main>

      {callBookingId && (
        <SessionCallModal
          bookingId={callBookingId}
          accessToken={session.access_token}
          onClose={() => setCallBookingId(null)}
        />
      )}
    </div>
  );
}