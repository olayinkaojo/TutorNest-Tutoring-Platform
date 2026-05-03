import { Hono } from 'npm:hono@4';
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

export const achievementRoutes = new Hono();

// GET /achievements/user-achievements - Get user's badges and stats
achievementRoutes.get("/user-achievements", async (c) => {
  try {
    const userId = c.req.header("x-user-id");
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const badges = await getUserBadges(userId);
    const stats = await getUserStats(userId);

    return c.json({
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
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /achievements/progress - Get progress toward next badges
achievementRoutes.get("/progress", async (c) => {
  try {
    const userId = c.req.header("x-user-id");
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const progress = await getAchievementProgress(userId);
    return c.json(progress);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /achievements/leaderboard - Get achievement leaderboard
achievementRoutes.get("/leaderboard", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const leaderboard = await getAchievementLeaderboard(Math.min(limit, 200));

    return c.json({
      leaderboard: leaderboard.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
      totalEntries: leaderboard.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /achievements/top-achievers - Get top 10 achievers
achievementRoutes.get("/top-achievers", async (c) => {
  try {
    const topAchievers = await getTopAchievers(10);

    return c.json({
      topAchievers: topAchievers.map((entry, index) => ({
        ...entry,
        rank: index + 1,
      })),
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /achievements/all - Get all badge definitions
achievementRoutes.get("/all", async (c) => {
  try {
    const badges = Object.values(BADGE_DEFINITIONS).map((badge) => ({
      ...badge,
      color: getRarityColor(badge.rarity),
    }));

    return c.json({
      badges,
      totalBadges: badges.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /achievements/compare/:friendId - Compare achievements with friend
achievementRoutes.get("/compare/:friendId", async (c) => {
  try {
    const userId = c.req.header("x-user-id");
    const friendId = c.req.param("friendId");

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const comparison = await getFriendAchievementComparison(userId, friendId);
    return c.json(comparison);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /achievements/claim - Claim/check for new achievements
achievementRoutes.post("/claim", async (c) => {
  try {
    const userId = c.req.header("x-user-id");
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { actionType, actionData } = body;

    let newBadges: string[] = [];

    switch (actionType) {
      case "daily-challenge-complete":
        // Record daily challenge completion
        // const { xp, streak } = actionData;
        // newBadges = await recordDailyChallengeCompletion(userId, xp, streak);
        break;

      case "time-attack-complete":
        // Record time attack completion
        // const { xpEarned, accuracy, avgTime } = actionData;
        // newBadges = await recordTimeAttackCompletion(userId, xpEarned, accuracy, avgTime);
        break;

      case "battle-complete":
        // Record battle completion
        // const { won, isFriend, battleXP, answerTime } = actionData;
        // newBadges = await recordBattleCompletion(userId, won, isFriend, battleXP, answerTime);
        break;

      default:
        // Manual check for any new achievements
        newBadges = await checkAndAwardAchievements(userId);
    }

    return c.json({
      newBadges: newBadges.map((badgeId) => BADGE_DEFINITIONS[badgeId]),
      totalUnlocked: (await getUserBadges(userId)).length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /achievements/stats - Get detailed user achievement stats
achievementRoutes.get("/stats", async (c) => {
  try {
    const userId = c.req.header("x-user-id");
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const badges = await getUserBadges(userId);
    const stats = await getUserStats(userId);
    const progress = await getAchievementProgress(userId);

    return c.json({
      badges,
      stats,
      progress,
      rarityBreakdown: {
        common: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "common").length,
        rare: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "rare").length,
        epic: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "epic").length,
        legendary: badges.filter((id) => BADGE_DEFINITIONS[id]?.rarity === "legendary").length,
      },
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});
