import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import {
  getUserBadges,
  BADGE_DEFINITIONS,
  getRarityColor,
} from "./badge-service.tsx";
import {
  getUserStats,
  updateUserStats,
  getAchievementProgress,
  checkAndAwardAchievements,
} from "./achievement-service.tsx";
import {
  getAchievementLeaderboard,
  getFriendAchievementComparison,
  getTopAchievers,
} from "./leaderboard-achievements.tsx";

export const achievementRoutes = new Router();

// GET /achievements/user-achievements - Get user's badges and stats
achievementRoutes.get("/user-achievements", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const badges = await getUserBadges(userId);
    const stats = await getUserStats(userId);

    ctx.response.body = {
      achievements: badges.map((badgeId) => ({
        ...BADGE_DEFINITIONS[badgeId],
        unlockedAt: stats.userId === userId ? new Date().toISOString() : null,
      })),
      unlockedCount: badges.length,
      totalCount: Object.keys(BADGE_DEFINITIONS).length,
      userStats: {
        totalXP: stats.totalXP,
        battleWins: stats.battleWins,
        currentStreak: stats.currentStreak,
        globalRank: stats.globalRank,
      },
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /achievements/progress - Get progress toward next badges
achievementRoutes.get("/progress", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const progress = await getAchievementProgress(userId);
    ctx.response.body = progress;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /achievements/leaderboard - Get achievement leaderboard
achievementRoutes.get("/leaderboard", async (ctx) => {
  try {
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "50");
    const leaderboard = await getAchievementLeaderboard(Math.min(limit, 200));

    ctx.response.body = {
      leaderboard: leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
      totalEntries: leaderboard.length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /achievements/top-achievers - Get top 10 achievers
achievementRoutes.get("/top-achievers", async (ctx) => {
  try {
    const topAchievers = await getTopAchievers(10);

    ctx.response.body = {
      topAchievers: topAchievers.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /achievements/all - Get all badge definitions
achievementRoutes.get("/all", async (ctx) => {
  try {
    const badges = Object.values(BADGE_DEFINITIONS).map((badge) => ({
      ...badge,
      color: getRarityColor(badge.rarity),
    }));

    ctx.response.body = {
      badges,
      totalBadges: badges.length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /achievements/compare/:friendId - Compare achievements with friend
achievementRoutes.get("/compare/:friendId", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    const friendId = ctx.params.friendId;

    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const comparison = await getFriendAchievementComparison(userId, friendId);
    ctx.response.body = comparison;
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// POST /achievements/claim - Claim/check for new achievements
achievementRoutes.post("/claim", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const body = await ctx.request.body({ type: "json" }).value;
    const { actionType, actionData } = body;

    let newBadges: string[] = [];

    switch (actionType) {
      case "daily-challenge-complete":
        // Record daily challenge completion
        const { xp, streak } = actionData;
        // newBadges = await recordDailyChallengeCompletion(userId, xp, streak);
        break;

      case "time-attack-complete":
        // Record time attack completion
        const { xpEarned, accuracy, avgTime } = actionData;
        // newBadges = await recordTimeAttackCompletion(userId, xpEarned, accuracy, avgTime);
        break;

      case "battle-complete":
        // Record battle completion
        const { won, isFriend, battleXP, answerTime } = actionData;
        // newBadges = await recordBattleCompletion(userId, won, isFriend, battleXP, answerTime);
        break;

      default:
        // Manual check for any new achievements
        newBadges = await checkAndAwardAchievements(userId);
    }

    ctx.response.body = {
      newBadges: newBadges.map((badgeId) => BADGE_DEFINITIONS[badgeId]),
      totalUnlocked: (await getUserBadges(userId)).length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /achievements/stats - Get detailed user achievement stats
achievementRoutes.get("/stats", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const badges = await getUserBadges(userId);
    const stats = await getUserStats(userId);
    const progress = await getAchievementProgress(userId);

    ctx.response.body = {
      badges,
      stats,
      progress,
      rarityBreakdown: {
        common: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "common").length,
        rare: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "rare").length,
        epic: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "epic").length,
        legendary: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "legendary").length,
      },
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});
