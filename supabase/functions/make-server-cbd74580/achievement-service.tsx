import * as kv from "./kv_store.tsx";
import {
  getUserBadges,
  addBadgeToUser,
  BADGE_DEFINITIONS,
  getBadgeRarity,
} from "./badge-service.tsx";

export interface UserStats {
  userId: string;
  dailyChallengesCompleted: number;
  fastestAnswerTime: number;
  battlesPlayed: number;
  battleWins: number;
  friendBattleWins: number;
  currentStreak: number;
  battleWinStreak: number;
  averageAnswerTime: number;
  globalRank: number;
  badgesUnlocked: number;
  perfectTimeAttackGames: number;
  friendsInvited: number;
  battlesOrganized: number;
  isInAchievementsLeaderboard: boolean;
  totalXP: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const statsKey = [`user:${userId}:stats`];
    const data = await kv.get(statsKey);

    if (data?.value) {
      return data.value as UserStats;
    }

    return createDefaultStats(userId);
  } catch {
    return createDefaultStats(userId);
  }
}

function createDefaultStats(userId: string): UserStats {
  return {
    userId,
    dailyChallengesCompleted: 0,
    fastestAnswerTime: Infinity,
    battlesPlayed: 0,
    battleWins: 0,
    friendBattleWins: 0,
    currentStreak: 0,
    battleWinStreak: 0,
    averageAnswerTime: 0,
    globalRank: 999999,
    badgesUnlocked: 0,
    perfectTimeAttackGames: 0,
    friendsInvited: 0,
    battlesOrganized: 0,
    isInAchievementsLeaderboard: false,
    totalXP: 0,
  };
}

export async function updateUserStats(userId: string, updates: Partial<UserStats>): Promise<void> {
  try {
    const current = await getUserStats(userId);
    const updated = { ...current, ...updates, userId };
    await kv.set([`user:${userId}:stats`], updated);
  } catch {
    // Silent fail
  }
}

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  try {
    const stats = await getUserStats(userId);
    const currentBadges = await getUserBadges(userId);
    const newBadges: string[] = [];

    for (const [badgeId, badge] of Object.entries(BADGE_DEFINITIONS)) {
      if (!currentBadges.includes(badgeId)) {
        if (badge.unlockCondition(stats)) {
          const added = await addBadgeToUser(userId, badgeId);
          if (added) {
            newBadges.push(badgeId);

            // Update badge unlock count
            const statsKey = [`badge:${badgeId}:stats`];
            const badgeStats = await kv.get(statsKey);
            const current = badgeStats?.value || { totalUnlocks: 0 };
            await kv.set(statsKey, {
              ...current,
              totalUnlocks: (current.totalUnlocks || 0) + 1,
            });

            // Update user's badge count
            await updateUserStats(userId, {
              badgesUnlocked: currentBadges.length + newBadges.length,
            });
          }
        }
      }
    }

    return newBadges;
  } catch {
    return [];
  }
}

export async function getAchievementProgress(userId: string): Promise<any> {
  try {
    const stats = await getUserStats(userId);
    const currentBadges = await getUserBadges(userId);
    const nextBadges = [];

    for (const [badgeId, badge] of Object.entries(BADGE_DEFINITIONS)) {
      if (!currentBadges.includes(badgeId)) {
        const progress = calculateBadgeProgress(badgeId, stats);
        if (progress.percentage > 0 && progress.percentage < 100) {
          nextBadges.push({
            ...badge,
            progress: progress.percentage,
            current: progress.current,
            target: progress.target,
          });
        }
      }
    }

    // Sort by progress
    nextBadges.sort((a, b) => b.progress - a.progress);

    return {
      unlockedCount: currentBadges.length,
      totalCount: Object.keys(BADGE_DEFINITIONS).length,
      nextBadges: nextBadges.slice(0, 5), // Top 5 closest to unlock
      progressPercentage: (currentBadges.length / Object.keys(BADGE_DEFINITIONS).length) * 100,
    };
  } catch {
    return {
      unlockedCount: 0,
      totalCount: Object.keys(BADGE_DEFINITIONS).length,
      nextBadges: [],
      progressPercentage: 0,
    };
  }
}

function calculateBadgeProgress(badgeId: string, stats: UserStats): any {
  const badge = BADGE_DEFINITIONS[badgeId];
  if (!badge) return { percentage: 0, current: 0, target: 1 };

  const progressMap: Record<string, any> = {
    "first-steps": {
      current: Math.min(stats.dailyChallengesCompleted, 1),
      target: 1,
    },
    "speed-demon": {
      current: Math.max(0, 5 - Math.ceil(stats.fastestAnswerTime / 1000)),
      target: 5,
    },
    "battle-ready": {
      current: Math.min(stats.battlesPlayed, 1),
      target: 1,
    },
    "friends-with-you": {
      current: Math.min(stats.friendBattleWins, 1),
      target: 1,
    },
    "on-fire": {
      current: Math.min(stats.currentStreak, 7),
      target: 7,
    },
    "blazing": {
      current: Math.min(stats.currentStreak, 30),
      target: 30,
    },
    "unstoppable": {
      current: Math.min(stats.currentStreak, 90),
      target: 90,
    },
    "time-master": {
      current: Math.max(0, 3 - Math.ceil(stats.averageAnswerTime / 1000)),
      target: 3,
    },
    "battle-champion": {
      current: Math.min(stats.battleWins, 10),
      target: 10,
    },
    "rising-star": {
      current: Math.max(0, 100 - stats.globalRank),
      target: 100,
    },
    "superstar": {
      current: Math.max(0, 50 - stats.globalRank),
      target: 50,
    },
    "legend": {
      current: Math.max(0, 10 - stats.globalRank),
      target: 10,
    },
    "invincible": {
      current: Math.min(stats.battleWinStreak, 20),
      target: 20,
    },
    "collector": {
      current: Math.min(stats.badgesUnlocked, 10),
      target: 10,
    },
    "curator": {
      current: Math.min(stats.badgesUnlocked, 15),
      target: 15,
    },
    "connoisseur": {
      current: Math.min(stats.badgesUnlocked, 20),
      target: 20,
    },
    "perfect-game": {
      current: Math.min(stats.perfectTimeAttackGames, 1),
      target: 1,
    },
    "social-butterfly": {
      current: Math.min(stats.friendsInvited, 5),
      target: 5,
    },
    "tournament-organizer": {
      current: Math.min(stats.battlesOrganized, 50),
      target: 50,
    },
    "hall-of-fame": {
      current: stats.isInAchievementsLeaderboard ? 1 : 0,
      target: 1,
    },
  };

  const prog = progressMap[badgeId] || { current: 0, target: 1 };
  const percentage = Math.min((prog.current / prog.target) * 100, 99);

  return { ...prog, percentage };
}

export async function recordDailyChallengeCompletion(
  userId: string,
  xpEarned: number,
  streak: number
): Promise<string[]> {
  try {
    const stats = await getUserStats(userId);
    await updateUserStats(userId, {
      dailyChallengesCompleted: stats.dailyChallengesCompleted + 1,
      currentStreak: streak,
      totalXP: stats.totalXP + xpEarned,
    });
    return await checkAndAwardAchievements(userId);
  } catch {
    return [];
  }
}

export async function recordTimeAttackCompletion(
  userId: string,
  xpEarned: number,
  accuracy: number,
  avgAnswerTime: number
): Promise<string[]> {
  try {
    const stats = await getUserStats(userId);
    await updateUserStats(userId, {
      totalXP: stats.totalXP + xpEarned,
      averageAnswerTime: (stats.averageAnswerTime + avgAnswerTime) / 2,
      perfectTimeAttackGames:
        accuracy === 100 ? stats.perfectTimeAttackGames + 1 : stats.perfectTimeAttackGames,
    });
    return await checkAndAwardAchievements(userId);
  } catch {
    return [];
  }
}

export async function recordBattleCompletion(
  userId: string,
  won: boolean,
  isFriendBattle: boolean,
  xpEarned: number,
  answerTime: number
): Promise<string[]> {
  try {
    const stats = await getUserStats(userId);
    const newWinStreak = won ? stats.battleWinStreak + 1 : 0;

    await updateUserStats(userId, {
      battlesPlayed: stats.battlesPlayed + 1,
      battleWins: won ? stats.battleWins + 1 : stats.battleWins,
      battleWinStreak: newWinStreak,
      friendBattleWins: won && isFriendBattle ? stats.friendBattleWins + 1 : stats.friendBattleWins,
      totalXP: stats.totalXP + xpEarned,
      fastestAnswerTime: Math.min(stats.fastestAnswerTime, answerTime),
    });
    return await checkAndAwardAchievements(userId);
  } catch {
    return [];
  }
}
