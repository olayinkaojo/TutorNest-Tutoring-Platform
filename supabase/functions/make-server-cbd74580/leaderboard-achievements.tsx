import * as db from "./db.tsx";
import { getUserBadges } from "./badge-service.tsx";
import { getUserStats } from "./achievement-service.tsx";

export interface AchievementLeaderboardEntry {
  userId: string;
  username: string;
  badgesUnlocked: number;
  totalXP: number;
  rank: number;
}

// This used to read/write an `achievement-leaderboard:global` KV blob that
// a *different*, unused export in this same file (also named
// updateAchievementLeaderboard, since removed) would silently wipe to an
// empty array if anything had ever called it. The data itself — badge
// count + XP per user — is entirely derived from user_game_stats/
// user_badges, so get_achievement_leaderboard (migration
// 20261113010000_atomic_achievements.sql) just queries it live instead of
// maintaining a second, separately-mutated copy that could drift or race.
export async function getAchievementLeaderboard(limit: number = 100): Promise<AchievementLeaderboardEntry[]> {
  try {
    const rows = await db.getAchievementLeaderboard(limit);
    return rows.map((row, index) => ({
      userId: row.userId,
      username: row.userName,
      badgesUnlocked: row.badgesUnlocked,
      totalXP: row.totalXP,
      rank: index + 1,
    }));
  } catch {
    return [];
  }
}

export async function getFriendAchievementComparison(userId: string, friendId: string): Promise<any> {
  try {
    const [userBadges, friendBadges] = await Promise.all([
      getUserBadges(userId),
      getUserBadges(friendId),
    ]);

    const [userStats, friendStats] = await Promise.all([
      getUserStats(userId),
      getUserStats(friendId),
    ]);

    return {
      user: {
        badgesUnlocked: userBadges.length,
        totalXP: userStats.totalXP,
        battleWins: userStats.battleWins,
        currentStreak: userStats.currentStreak,
      },
      friend: {
        badgesUnlocked: friendBadges.length,
        totalXP: friendStats.totalXP,
        battleWins: friendStats.battleWins,
        currentStreak: friendStats.currentStreak,
      },
      comparison: {
        badgesDifference: userBadges.length - friendBadges.length,
        xpDifference: userStats.totalXP - friendStats.totalXP,
        wins: userStats.battleWins - friendStats.battleWins,
      },
    };
  } catch {
    return null;
  }
}

export async function filterAchievementsByRarity(rarity: string, limit: number = 50): Promise<any[]> {
  try {
    const leaderboard = await getAchievementLeaderboard(1000);
    return leaderboard
      .filter((entry) => {
        // Filter logic would check badge rarities
        // Simplified for now
        return entry.badgesUnlocked > 0;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getTopAchievers(limit: number = 10): Promise<any[]> {
  try {
    // get_achievement_leaderboard already orders by badges then XP — no
    // need to re-sort what it returned.
    return await getAchievementLeaderboard(limit);
  } catch {
    return [];
  }
}

export async function isUserInAchievementsLeaderboard(userId: string, topN: number = 100): Promise<boolean> {
  try {
    const leaderboard = await getAchievementLeaderboard(topN);
    return leaderboard.some((entry) => entry.userId === userId);
  } catch {
    return false;
  }
}

export async function getUserAchievementRank(userId: string): Promise<number> {
  try {
    const leaderboard = await getAchievementLeaderboard(10000);
    const entry = leaderboard.find((e) => e.userId === userId);
    return entry?.rank ?? 999999;
  } catch {
    return 999999;
  }
}
