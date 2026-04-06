import { kv } from "https://deno.land/x/deno_kv_oauthv2@v0.0.2/mod.ts";
import { getUserBadges } from "./badge-service.tsx";
import { getUserStats } from "./achievement-service.tsx";

export interface AchievementLeaderboardEntry {
  userId: string;
  username: string;
  badgesUnlocked: number;
  totalXP: number;
  rank: number;
}

export async function updateAchievementLeaderboard(): Promise<void> {
  try {
    // Get all users (simplified - in production, would iterate through user list)
    const entries: AchievementLeaderboardEntry[] = [];

    // For now, leaderboard is built on-demand
    // In production, would maintain a separate leaderboard cache
    const leaderboardKey = [`achievement-leaderboard:global`];
    await kv.set(leaderboardKey, { lastUpdated: new Date().toISOString(), entries });
  } catch {
    // Silent fail
  }
}

export async function getAchievementLeaderboard(limit: number = 100): Promise<any[]> {
  try {
    const leaderboardKey = [`achievement-leaderboard:global`];
    const data = await kv.get(leaderboardKey);

    if (data?.value?.entries) {
      return data.value.entries.slice(0, limit);
    }

    return [];
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
    const leaderboard = await getAchievementLeaderboard(limit * 2);
    return leaderboard
      .sort((a: any, b: any) => {
        if (b.badgesUnlocked !== a.badgesUnlocked) {
          return b.badgesUnlocked - a.badgesUnlocked;
        }
        return b.totalXP - a.totalXP;
      })
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function isUserInAchievementsLeaderboard(userId: string, topN: number = 100): Promise<boolean> {
  try {
    const leaderboard = await getAchievementLeaderboard(topN);
    return leaderboard.some((entry: any) => entry.userId === userId);
  } catch {
    return false;
  }
}

export async function getUserAchievementRank(userId: string): Promise<number> {
  try {
    const leaderboard = await getAchievementLeaderboard(10000);
    const rank = leaderboard.findIndex((entry: any) => entry.userId === userId);
    return rank >= 0 ? rank + 1 : 999999;
  } catch {
    return 999999;
  }
}
