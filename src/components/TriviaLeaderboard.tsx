import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar } from './ui/avatar';
import { Skeleton } from './ui/skeleton';
import { 
  Trophy, 
  Medal, 
  Star, 
  TrendingUp, 
  Award,
  Crown,
  Zap,
  User
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getSupabaseClient } from '../utils/supabase/client';

interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalXP: number;
  gamesPlayed: number;
  averageScore: number;
  bestScore: number;
  lastPlayed: string;
}

interface TriviaLeaderboardProps {
  userId: string;
  grade: string;
}

export function TriviaLeaderboard({ userId, grade }: TriviaLeaderboardProps) {
  const supabase = getSupabaseClient();
  const [session, setSession] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadLeaderboard();
      }
    });
  }, [grade]);

  const loadLeaderboard = async () => {
    const currentSession = await supabase.auth.getSession();
    const accessToken = currentSession.data.session?.access_token;
    
    if (!accessToken) return;

    setLoading(true);
    try {
      // Convert grade format (nursery_2 -> year_1, etc.)
      const normalizedGrade = convertGradeFormat(grade);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-cbd74580/trivia/leaderboard/${normalizedGrade}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setTotalPlayers(data.totalPlayers || 0);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertGradeFormat = (gradeValue: string): string => {
    if (gradeValue.startsWith('year_')) return gradeValue;
    
    if (gradeValue.startsWith('nursery_')) return 'year_1';

    // Primary 1 (P1) = Year 1, Primary 2 (P2) = Year 2, ..., Primary 6 (P6) = Year 6
    if (gradeValue.startsWith('primary_')) {
      const num = parseInt(gradeValue.replace('primary_', ''));
      return `year_${num}`;
    }

    // JSS 1 = Year 7, JSS 2 = Year 8, JSS 3 = Year 9, SS 1 = Year 10, SS 2 = Year 11
    if (gradeValue.startsWith('secondary_')) {
      const num = parseInt(gradeValue.replace('secondary_', ''));
      return `year_${num}`;
    }

    if (gradeValue === 'sixth_form_12') return 'year_12';
    if (gradeValue === 'sixth_form_13') return 'year_12';

    return 'year_1';
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Calculate level from XP (same formula as GamificationSystem)
  const calculateLevel = (xp: number): number => {
    return Math.floor(xp / 100) + 1;
  };

  if (loading) {
    return (
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Trivia Leaderboard
          </CardTitle>
          <CardDescription>Loading rankings...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Trivia Leaderboard
          </CardTitle>
          <CardDescription>Your year group rankings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No one has played trivia yet!</p>
            <p className="text-sm mt-2">Be the first to set a score.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentUserRank = leaderboard.findIndex(entry => entry.userId === userId);
  const currentUserEntry = currentUserRank !== -1 ? leaderboard[currentUserRank] : null;

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Trivia Leaderboard
            </CardTitle>
            <CardDescription>Your year group rankings • {totalPlayers} players</CardDescription>
          </div>
          {currentUserEntry && (
            <Badge className={getRankBadgeColor(currentUserRank + 1)}>
              Your Rank: #{currentUserRank + 1}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Top 3 Podium */}
        {leaderboard.slice(0, 3).length > 0 && (
          <div className="mb-6 p-4 bg-gradient-to-br from-yellow-50 to-purple-50 rounded-lg border-2 border-yellow-200">
            <h4 className="text-sm font-semibold mb-3 text-center text-purple-700">🏆 Top Champions 🏆</h4>
            <div className="grid grid-cols-3 gap-2">
              {/* 2nd Place */}
              {leaderboard[1] && (
                <div className="text-center order-1">
                  <div className="bg-gradient-to-br from-gray-200 to-gray-400 rounded-lg p-3 h-24 flex flex-col items-center justify-center">
                    <Medal className="w-8 h-8 text-gray-600 mb-1" />
                    <span className="text-xs font-bold text-gray-700">2nd</span>
                  </div>
                  <div className="mt-2">
                    <p className="font-semibold text-sm truncate">{leaderboard[1].userName}</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                      <Star className="w-3 h-3 text-purple-500" />
                      <span>Lvl {calculateLevel(leaderboard[1].totalXP)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
                      <Zap className="w-3 h-3" />
                      <span>{leaderboard[1].totalXP.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1st Place */}
              {leaderboard[0] && (
                <div className="text-center order-2">
                  <div className="bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-lg p-3 h-28 flex flex-col items-center justify-center relative">
                    <Crown className="w-10 h-10 text-yellow-900 mb-1" />
                    <span className="text-xs font-bold text-yellow-900">1st</span>
                    <div className="absolute -top-2 -right-2">
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="font-bold text-sm truncate">{leaderboard[0].userName}</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                      <Star className="w-3 h-3 text-purple-500" />
                      <span>Lvl {calculateLevel(leaderboard[0].totalXP)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 font-bold">
                      <Zap className="w-3 h-3" />
                      <span>{leaderboard[0].totalXP.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3rd Place */}
              {leaderboard[2] && (
                <div className="text-center order-3">
                  <div className="bg-gradient-to-br from-amber-400 to-amber-700 rounded-lg p-3 h-24 flex flex-col items-center justify-center">
                    <Medal className="w-8 h-8 text-amber-900 mb-1" />
                    <span className="text-xs font-bold text-amber-900">3rd</span>
                  </div>
                  <div className="mt-2">
                    <p className="font-semibold text-sm truncate">{leaderboard[2].userName}</p>
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-600 mt-1">
                      <Star className="w-3 h-3 text-purple-500" />
                      <span>Lvl {calculateLevel(leaderboard[2].totalXP)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xs text-yellow-600">
                      <Zap className="w-3 h-3" />
                      <span>{leaderboard[2].totalXP.toLocaleString()} XP</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full Leaderboard List */}
        <div className="space-y-1">
          {leaderboard.slice(0, 20).map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.userId === userId;
            const level = calculateLevel(entry.totalXP);

            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                  isCurrentUser
                    ? 'bg-gradient-to-r from-purple-100 to-green-100 border-2 border-purple-400 shadow-md'
                    : rank <= 3
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(rank)}
                </div>

                {/* User Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-bold">
                    {entry.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`truncate ${isCurrentUser ? 'font-bold' : 'font-semibold'}`}>
                        {entry.userName}
                        {isCurrentUser && (
                          <Badge variant="outline" className="ml-2 text-xs bg-purple-600 text-white border-purple-600">
                            You
                          </Badge>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {entry.gamesPlayed} games
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(entry.averageScore * 100)}% avg
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <Star className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-purple-700">Lvl {level}</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-600">
                      {entry.totalXP.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Show user's position if not in top 20 */}
        {currentUserRank >= 20 && currentUserEntry && (
          <div className="mt-4 pt-4 border-t-2 border-dashed border-purple-200">
            <p className="text-xs text-gray-500 mb-2 text-center">Your Position</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-100 to-green-100 border-2 border-purple-400">
              <div className="flex items-center justify-center w-10">
                <span className="text-lg font-bold text-purple-600">#{currentUserRank + 1}</span>
              </div>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-green-400 flex items-center justify-center text-white font-bold">
                  {currentUserEntry.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold">{currentUserEntry.userName} (You)</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>{currentUserEntry.gamesPlayed} games</span>
                    <span>{Math.round(currentUserEntry.averageScore * 100)}% avg</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-4 h-4 text-purple-500" />
                  <span className="font-bold text-purple-700">Lvl {calculateLevel(currentUserEntry.totalXP)}</span>
                </div>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-600">
                    {currentUserEntry.totalXP.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
