import * as kv from "./kv_store.tsx";
import * as db from "./db.tsx";
import { getUserBadges, addBadgeToUser, BADGE_DEFINITIONS } from "./badge-service.tsx";

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

// A "no data yet" sentinel for answer-time fields — large and finite
// rather than Infinity. JSON.stringify(Infinity) silently becomes `null`,
// and null coerces to 0 in a numeric comparison — so an account that had
// never answered anything could quietly satisfy "answered in under 5/3
// seconds" the moment that round-trip happened.
const NO_ANSWER_TIME_YET = 999_999_999;

function createDefaultStats(userId: string): UserStats {
  return {
    userId,
    dailyChallengesCompleted: 0,
    fastestAnswerTime: NO_ANSWER_TIME_YET,
    battlesPlayed: 0,
    battleWins: 0,
    friendBattleWins: 0,
    currentStreak: 0,
    battleWinStreak: 0,
    averageAnswerTime: NO_ANSWER_TIME_YET,
    globalRank: 999999,
    badgesUnlocked: 0,
    perfectTimeAttackGames: 0,
    friendsInvited: 0,
    battlesOrganized: 0,
    isInAchievementsLeaderboard: false,
    totalXP: 0,
  };
}

// Every other profile write in this codebase uses `user:${userId}` for a
// direct account, `child:${userId}` for a managed child profile, or
// `profile_${role}_${userId}` for a specific role's data — never
// `user_profile:${userId}` or `profile:${userId}` (both of which this file
// used to look up, and neither of which anything ever writes to).
async function resolveDisplayName(userId: string): Promise<string> {
  const direct = (await kv.get(`user:${userId}`).catch(() => null)) as any;
  if (direct) return direct.firstName || direct.fullName || direct.full_name || direct.name || 'Student';
  const asChild = (await kv.get(`child:${userId}`).catch(() => null)) as any;
  if (asChild) return asChild.firstName || asChild.name || 'Student';
  const profile = await db.getProfile(userId).catch(() => null);
  return profile?.firstName || profile?.fullName || profile?.full_name || profile?.name || 'Student';
}

/**
 * Real stats row from Postgres (see migration 20261113010000_atomic_achievements.sql)
 * plus a live badge count — badgesUnlocked is derived, not stored, so there's
 * nowhere for it to drift out of sync with the user's actual unlocked badges.
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const [row, badges] = await Promise.all([
      db.getUserGameStats(userId),
      getUserBadges(userId),
    ]);
    if (!row) return { ...createDefaultStats(userId), badgesUnlocked: badges.length };
    return {
      userId: row.userId,
      dailyChallengesCompleted: row.dailyChallengesCompleted,
      fastestAnswerTime: row.fastestAnswerTime,
      battlesPlayed: row.battlesPlayed,
      battleWins: row.battleWins,
      friendBattleWins: row.friendBattleWins,
      currentStreak: row.currentStreak,
      battleWinStreak: row.battleWinStreak,
      averageAnswerTime: row.averageAnswerTime,
      globalRank: row.globalRank,
      badgesUnlocked: badges.length,
      perfectTimeAttackGames: row.perfectTimeAttackGames,
      friendsInvited: row.friendsInvited,
      battlesOrganized: row.battlesOrganized,
      isInAchievementsLeaderboard: row.isInAchievementsLeaderboard,
      totalXP: row.totalXP,
    };
  } catch {
    return createDefaultStats(userId);
  }
}

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  try {
    const stats = await getUserStats(userId);
    const currentBadges = await getUserBadges(userId);
    const newBadges: string[] = [];

    for (const [badgeId, badge] of Object.entries(BADGE_DEFINITIONS)) {
      if (!currentBadges.includes(badgeId) && badge.unlockCondition(stats)) {
        // addBadgeToUser (badge-service.tsx) is now an atomic unlock —
        // returns false if another concurrent call already won the
        // unlock for this exact badge, so it's never added twice and the
        // unlock-count stat is never double-bumped.
        const added = await addBadgeToUser(userId, badgeId);
        if (added) newBadges.push(badgeId);
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
    const userName = await resolveDisplayName(userId);
    await db.recordDailyChallengeCompletion({ userId, userName, xpEarned, streak });
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
    const userName = await resolveDisplayName(userId);
    await db.recordTimeAttackCompletion({ userId, userName, xpEarned, accuracy, avgAnswerTime });
    return await checkAndAwardAchievements(userId);
  } catch {
    return [];
  }
}

/** Called on every battle answer — just the fastest-answer-time update. */
export async function recordBattleAnswerTime(userId: string, timeMs: number): Promise<string[]> {
  try {
    const userName = await resolveDisplayName(userId);
    await db.recordBattleAnswerTime({ userId, userName, timeMs });
    return await checkAndAwardAchievements(userId);
  } catch {
    return [];
  }
}

/** Called once per player when a battle actually concludes. */
export async function recordBattleResult(userId: string, won: boolean): Promise<string[]> {
  try {
    const userName = await resolveDisplayName(userId);
    await db.recordBattleResult({ userId, userName, won });
    return await checkAndAwardAchievements(userId);
  } catch {
    return [];
  }
}

/** Adds XP without touching any other stat — used by trivia's shared-achievement feed. */
export async function incrementUserXP(userId: string, xpDelta: number): Promise<void> {
  try {
    const userName = await resolveDisplayName(userId);
    await db.incrementUserXP({ userId, userName, xpDelta });
  } catch {
    // Silent fail — matches the rest of this file's non-fatal-by-design error handling.
  }
}
