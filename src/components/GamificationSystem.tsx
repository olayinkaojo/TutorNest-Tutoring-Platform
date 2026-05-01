import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner@2.0.3';
import {
  Trophy,
  Medal,
  Star,
  Flame,
  Zap,
  Target,
  Award,
  Crown,
  Gift,
  TrendingUp,
  Users,
  Sparkles,
  Lock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface GamificationSystemProps {
  userId: string;
  userType: 'student' | 'tutor' | 'parent';
}

export function GamificationSystem({ userId, userType }: GamificationSystemProps) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [userStats, setUserStats] = useState({
    level: 1,
    xp: 0,
    nextLevelXP: 100,
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    rank: 'Bronze',
    globalRank: 0,
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0
  });

  const [achievements, setAchievements] = useState<any[]>([]);
  const [activityCalendar, setActivityCalendar] = useState<boolean[]>(Array(28).fill(false));

  // Define achievement criteria
  const achievementDefinitions = [
    {
      id: 'first_session',
      title: 'Getting Started',
      description: 'Complete your first session',
      icon: '🎯',
      tier: 'bronze',
      xp: 50,
      checkCondition: (stats: any) => stats.completedSessions >= 1
    },
    {
      id: 'five_sessions',
      title: 'On a Roll',
      description: 'Complete 5 sessions',
      icon: '📚',
      tier: 'bronze',
      xp: 100,
      checkCondition: (stats: any) => stats.completedSessions >= 5
    },
    {
      id: 'ten_sessions',
      title: 'Dedicated Learner',
      description: 'Complete 10 sessions',
      icon: '🌟',
      tier: 'silver',
      xp: 200,
      checkCondition: (stats: any) => stats.completedSessions >= 10
    },
    {
      id: 'week_streak',
      title: 'Consistency',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      tier: 'silver',
      xp: 150,
      checkCondition: (stats: any) => stats.currentStreak >= 7
    },
    {
      id: 'two_week_streak',
      title: 'Dedication',
      description: 'Maintain a 14-day streak',
      icon: '💪',
      tier: 'gold',
      xp: 300,
      checkCondition: (stats: any) => stats.currentStreak >= 14
    },
    {
      id: 'high_performer',
      title: 'High Achiever',
      description: 'Maintain 80%+ average score',
      icon: '⭐',
      tier: 'gold',
      xp: 250,
      checkCondition: (stats: any) => stats.averageScore >= 80
    },
    {
      id: 'perfect_score',
      title: 'Perfectionist',
      description: 'Score 100% on an assessment',
      icon: '💯',
      tier: 'gold',
      xp: 300,
      checkCondition: (stats: any) => stats.perfectScores >= 1
    },
    {
      id: 'twenty_five_sessions',
      title: 'Committed Student',
      description: 'Complete 25 sessions',
      icon: '🎓',
      tier: 'platinum',
      xp: 400,
      checkCondition: (stats: any) => stats.completedSessions >= 25
    },
    {
      id: 'fifty_sessions',
      title: 'Subject Master',
      description: 'Complete 50 sessions',
      icon: '🏆',
      tier: 'platinum',
      xp: 600,
      checkCondition: (stats: any) => stats.completedSessions >= 50
    },
    {
      id: 'month_streak',
      title: 'Unstoppable',
      description: 'Maintain a 30-day streak',
      icon: '🔱',
      tier: 'diamond',
      xp: 800,
      checkCondition: (stats: any) => stats.currentStreak >= 30
    },
    {
      id: 'hundred_sessions',
      title: 'Legend',
      description: 'Complete 100 sessions',
      icon: '👑',
      tier: 'diamond',
      xp: 1000,
      checkCondition: (stats: any) => stats.completedSessions >= 100
    }
  ];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session?.access_token) {
      loadGamificationData();
    }
  }, [session]);

  const loadGamificationData = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      // Load bookings/sessions — use the correct ID field based on user type
      const bookingsParam = userType === 'tutor' ? `tutorId=${userId}` : `studentId=${userId}`;
      const bookingsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/bookings?${bookingsParam}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      let completedSessions = 0;
      let sessionDates: Date[] = [];

      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        const allBookings = bookingsData.bookings || [];

        const completed = allBookings.filter((b: any) => b.status === 'completed');
        completedSessions = completed.length;

        // Get session dates for streak calculation
        sessionDates = completed.map((b: any) => new Date(b.date));
      }

      let averageScore = 0;
      let perfectScores = 0;

      // Students: load assessments for score tracking; tutors skip this
      if (userType !== 'tutor') {
        const assessmentsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/assessments/student/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        if (assessmentsResponse.ok) {
          const assessmentsData = await assessmentsResponse.json();
          const studentAssessments = assessmentsData.assessments || [];

          if (studentAssessments.length > 0) {
            const totalScore = studentAssessments.reduce((sum: number, a: any) => {
              const avgScore = (
                a.understanding +
                a.participation +
                a.homeworkCompletion +
                a.attentiveness +
                a.improvement
              ) / 5;

              if (avgScore === 100) perfectScores++;

              return sum + avgScore;
            }, 0);

            averageScore = Math.round(totalScore / studentAssessments.length);
          }
        }
      }

      // Calculate streak
      const { currentStreak, longestStreak, calendar } = calculateStreak(sessionDates);

      // Fetch trivia stats
      let triviaXP = 0;
      try {
        const triviaResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/trivia/stats`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        if (triviaResponse.ok) {
          const triviaData = await triviaResponse.json();
          triviaXP = triviaData.stats?.totalXP || 0;
          console.log('Trivia XP loaded:', triviaXP);
        }
      } catch (error) {
        console.error('Error fetching trivia stats:', error);
      }

      // Calculate XP and level based on sessions, achievements, and trivia
      const baseXP = completedSessions * 20; // 20 XP per completed session
      const scoreBonus = Math.floor(averageScore / 10) * 10; // Bonus XP for high scores
      const totalXP = baseXP + scoreBonus + triviaXP; // Include trivia XP

      // Level calculation: Each level requires 100 * level XP
      let level = 1;
      let xpForCurrentLevel = 0;
      let remainingXP = totalXP;

      while (remainingXP >= (100 * level)) {
        remainingXP -= (100 * level);
        level++;
      }

      xpForCurrentLevel = remainingXP;
      const nextLevelXP = 100 * level;

      // Calculate rank based on level
      const rank = getRankFromLevel(level);

      // Calculate total points (XP + achievement bonuses)
      const totalPoints = totalXP;

      const stats = {
        level,
        xp: xpForCurrentLevel,
        nextLevelXP,
        totalPoints,
        currentStreak,
        longestStreak,
        rank,
        globalRank: 0, // This would need a real leaderboard query
        totalSessions: completedSessions,
        completedSessions,
        averageScore,
        perfectScores
      };

      setUserStats(stats);
      setActivityCalendar(calendar);

      // Check and unlock achievements
      const unlockedAchievements = achievementDefinitions.map(achievement => {
        const isUnlocked = achievement.checkCondition(stats);
        const progress = calculateAchievementProgress(achievement, stats);
        
        return {
          ...achievement,
          unlocked: isUnlocked,
          unlockedDate: isUnlocked ? new Date().toISOString() : null,
          progress
        };
      });

      setAchievements(unlockedAchievements);

    } catch (err) {
      console.error('Error loading gamification data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreak = (dates: Date[]) => {
    if (dates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, calendar: Array(28).fill(false) };
    }

    // Sort dates
    const sortedDates = dates.sort((a, b) => b.getTime() - a.getTime());
    
    // Calculate current streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let checkDate = new Date(today);
    
    for (let i = 0; i < 365; i++) { // Check up to a year back
      const hasSession = sortedDates.some(d => {
        const sessionDate = new Date(d);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });
      
      if (hasSession) {
        currentStreak++;
      } else if (i > 0) { // Allow for today to not have a session yet
        break;
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    
    // Generate calendar for last 28 days
    const calendar = Array(28).fill(false);
    for (let i = 0; i < 28; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - (27 - i));
      
      const hasActivity = sortedDates.some(d => {
        const sessionDate = new Date(d);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === checkDate.getTime();
      });
      
      calendar[i] = hasActivity;
    }

    return { currentStreak, longestStreak, calendar };
  };

  const calculateAchievementProgress = (achievement: any, stats: any) => {
    if (achievement.id === 'first_session') {
      return Math.min(100, (stats.completedSessions / 1) * 100);
    }
    if (achievement.id === 'five_sessions') {
      return Math.min(100, (stats.completedSessions / 5) * 100);
    }
    if (achievement.id === 'ten_sessions') {
      return Math.min(100, (stats.completedSessions / 10) * 100);
    }
    if (achievement.id === 'week_streak') {
      return Math.min(100, (stats.currentStreak / 7) * 100);
    }
    if (achievement.id === 'two_week_streak') {
      return Math.min(100, (stats.currentStreak / 14) * 100);
    }
    if (achievement.id === 'high_performer') {
      return Math.min(100, (stats.averageScore / 80) * 100);
    }
    if (achievement.id === 'perfect_score') {
      return Math.min(100, (stats.perfectScores / 1) * 100);
    }
    if (achievement.id === 'twenty_five_sessions') {
      return Math.min(100, (stats.completedSessions / 25) * 100);
    }
    if (achievement.id === 'fifty_sessions') {
      return Math.min(100, (stats.completedSessions / 50) * 100);
    }
    if (achievement.id === 'month_streak') {
      return Math.min(100, (stats.currentStreak / 30) * 100);
    }
    if (achievement.id === 'hundred_sessions') {
      return Math.min(100, (stats.completedSessions / 100) * 100);
    }
    return 0;
  };

  const getRankFromLevel = (level: number) => {
    if (level >= 50) return 'Diamond';
    if (level >= 30) return 'Platinum';
    if (level >= 15) return 'Gold';
    if (level >= 7) return 'Silver';
    return 'Bronze';
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return '#cd7f32';
      case 'silver': return '#c0c0c0';
      case 'gold': return '#ffd700';
      case 'platinum': return '#e5e4e2';
      case 'diamond': return '#b9f2ff';
      default: return '#6b7280';
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'Diamond': return '💎';
      case 'Platinum': return '🏆';
      case 'Gold': return '🥇';
      case 'Silver': return '🥈';
      case 'Bronze': return '🥉';
      default: return '🎯';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-spin" />
        <p className="text-gray-500">Loading gamification data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Progress Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-green-50 border-2" style={{ borderColor: '#625d9c' }}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-green-600 flex items-center justify-center shadow-lg">
                <span className="text-white text-2xl">{userStats.level}</span>
              </div>
              <div>
                <h3 className="mb-1">Level {userStats.level}</h3>
                <p className="text-sm text-gray-600">{getTierBadge(userStats.rank)} {userStats.rank} Tier</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5" style={{ color: '#625d9c' }} />
                <span className="text-lg">{userStats.xp} / {userStats.nextLevelXP} XP</span>
              </div>
              <p className="text-sm text-gray-600">Total: {userStats.totalPoints} XP</p>
            </div>
          </div>
          <Progress 
            value={(userStats.xp / userStats.nextLevelXP) * 100} 
            className="h-3 mb-2"
          />
          <p className="text-sm text-gray-600 text-center">
            {userStats.nextLevelXP - userStats.xp} XP to Level {userStats.level + 1}
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Star className="w-8 h-8 mx-auto mb-2 text-yellow-600 fill-yellow-600" />
            <h3 className="text-2xl mb-1">{userStats.totalPoints}</h3>
            <p className="text-sm text-gray-600">Total XP</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Flame className="w-8 h-8 mx-auto mb-2 text-orange-600" />
            <h3 className="text-2xl mb-1">{userStats.currentStreak}</h3>
            <p className="text-sm text-gray-600">Day Streak</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2" style={{ color: '#625d9c' }} />
            <h3 className="text-2xl mb-1">{achievements.filter(a => a.unlocked).length}</h3>
            <p className="text-sm text-gray-600">Achievements</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <Crown className="w-8 h-8 mx-auto mb-2" style={{ color: '#5d9827' }} />
            <h3 className="text-2xl mb-1">{userStats.rank}</h3>
            <p className="text-sm text-gray-600">Current Rank</p>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: '#625d9c' }} />
            Achievements
          </CardTitle>
          <CardDescription>
            Unlock badges and earn XP • {achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 border rounded-lg transition-all ${
                  achievement.unlocked 
                    ? 'bg-gradient-to-r from-purple-50 to-green-50 border-green-200' 
                    : 'opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`text-3xl p-3 rounded-lg ${
                      achievement.unlocked ? 'animate-bounce' : ''
                    }`}
                    style={{ 
                      backgroundColor: achievement.unlocked 
                        ? getTierColor(achievement.tier) + '30' 
                        : '#f3f4f6',
                      animationDuration: '2s',
                      animationIterationCount: achievement.unlocked ? '1' : '0'
                    }}
                  >
                    {achievement.unlocked ? achievement.icon : '🔒'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="mb-1">{achievement.title}</h4>
                      <Badge
                        style={{
                          backgroundColor: getTierColor(achievement.tier),
                          color: 'white'
                        }}
                      >
                        +{achievement.xp} XP
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>
                    {achievement.unlocked ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <p className="text-xs">Unlocked!</p>
                      </div>
                    ) : (
                      <div>
                        <Progress value={achievement.progress} className="h-2 mb-1" />
                        <p className="text-xs text-gray-500">{Math.round(achievement.progress)}% complete</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Streak Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-600" />
            Activity Streak
          </CardTitle>
          <CardDescription>Keep your learning momentum going</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-orange-50 rounded-full border-2 border-orange-200">
              <Flame className="w-10 h-10 text-orange-600" />
              <div className="text-left">
                <h3 className="text-2xl">{userStats.currentStreak} Day Streak</h3>
                <p className="text-sm text-gray-600">Longest: {userStats.longestStreak} days</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 text-center">Last 28 days</p>
          <div className="grid grid-cols-7 gap-2">
            {activityCalendar.map((hasActivity, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg ${
                  hasActivity 
                    ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-md' 
                    : 'bg-gray-200'
                } flex items-center justify-center transition-all hover:scale-110`}
                title={hasActivity ? 'Session completed' : 'No activity'}
              >
                {hasActivity && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            ))}
          </div>

          {userStats.currentStreak > 0 && (
            <Alert className="mt-6 bg-green-50 border-green-200">
              <Flame className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Great job!</strong> Keep learning daily to maintain your {userStats.currentStreak}-day streak!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Rewards Store - Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" style={{ color: '#625d9c' }} />
            Rewards Store
          </CardTitle>
          <CardDescription>Exclusive rewards for your hard work</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Gift className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="mb-2">Coming Soon!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Spend your {userStats.totalPoints} XP on exclusive rewards, discounts, and special perks
            </p>
            <Badge className="text-white" style={{ backgroundColor: '#625d9c' }}>
              Under Development
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}