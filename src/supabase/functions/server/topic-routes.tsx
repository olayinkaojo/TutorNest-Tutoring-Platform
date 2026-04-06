import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { getAllTopics, getTopic, getTopicLeaderboard, getTopicMastery, getRecommendedTopics } from "./topic-service.tsx";
import {
  getUserLearningPaths,
  getLearningPath,
  startLearningPath,
  completeLearningPathLevel,
  getRecommendedNextTopics,
} from "./learning-path-service.tsx";
import {
  getTopicProgress,
  getTopicStats,
  getTopicCompletion,
  getProgressHistory,
} from "./subject-progress-service.tsx";
import { getTopicAchievementProgress, checkTopicAchievements } from "./topic-achievement-service.tsx";

export const topicRoutes = new Router();

// GET /topics/all - All available topics with user's mastery
topicRoutes.get("/all", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    const topics = await getAllTopics();

    const topicsWithProgress = await Promise.all(
      topics.map(async (topic) => {
        const mastery = userId ? await getTopicMastery(userId, topic.id) : 0;
        return {
          ...topic,
          userMastery: mastery,
          userMasteryPercentage: Math.round(mastery * 100) / 100,
        };
      })
    );

    ctx.response.body = {
      topics: topicsWithProgress,
      total: topicsWithProgress.length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /topics/:topicId - Topic details with user progress
topicRoutes.get("/:topicId", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    const topicId = ctx.params.topicId;

    const topic = await getTopic(topicId);
    if (!topic) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Topic not found" };
      return;
    }

    const progress = userId ? await getTopicProgress(userId, topicId) : null;
    const stats = userId ? await getTopicStats(userId, topicId) : null;
    const completion = userId ? await getTopicCompletion(userId, topicId) : 0;
    const achievements = userId ? await getTopicAchievementProgress(userId, topicId) : [];
    const leaderboard = await getTopicLeaderboard(topicId, 10);

    ctx.response.body = {
      topic,
      userProgress: progress,
      userStats: stats,
      completionPercentage: completion,
      achievements,
      leaderboard,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /topics/recommended - Get recommended topics for user
topicRoutes.get("/recommended/topics", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "3");
    const recommendedIds = await getRecommendedNextTopics(userId, limit);

    const topics = await Promise.all(recommendedIds.map((id) => getTopic(id)));
    const filtered = topics.filter((t) => t !== null);

    ctx.response.body = {
      recommended: filtered,
      total: filtered.length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /learning-paths - Get all user's learning paths
topicRoutes.get("/learning-paths/all", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const paths = await getUserLearningPaths(userId);
    const pathsWithDetails = await Promise.all(
      paths.map(async (path) => {
        const topic = await getTopic(path.topicId);
        return { ...path, topic };
      })
    );

    ctx.response.body = {
      paths: pathsWithDetails,
      total: pathsWithDetails.length,
      active: pathsWithDetails.filter((p) => p.currentLevel < 4).length,
      completed: pathsWithDetails.filter((p) => p.currentLevel >= 4).length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /learning-paths/:topicId - Get specific learning path
topicRoutes.get("/learning-paths/:topicId/path", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    const topicId = ctx.params.topicId;

    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const path = await getLearningPath(userId, topicId);
    const topic = await getTopic(topicId);

    if (!path || !topic) {
      ctx.response.status = 404;
      ctx.response.body = { error: "Learning path not found" };
      return;
    }

    ctx.response.body = { path, topic };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// POST /learning-paths/start - Start new learning path
topicRoutes.post("/learning-paths/start", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const body = await ctx.request.body({ type: "json" }).value;
    const { topicId } = body;

    const success = await startLearningPath(userId, topicId);

    if (!success) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Failed to start learning path" };
      return;
    }

    const path = await getLearningPath(userId, topicId);
    ctx.response.body = { success: true, path };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// POST /topics/:topicId/complete-level - Complete topic level
topicRoutes.post("/:topicId/complete-level", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    const topicId = ctx.params.topicId;

    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const body = await ctx.request.body({ type: "json" }).value;
    const { level, accuracy, answerTime } = body;

    const result = await completeLearningPathLevel(userId, topicId, level, accuracy, answerTime);

    // Check for new achievements
    const newAchievements = await checkTopicAchievements(userId, topicId);

    ctx.response.body = {
      ...result,
      newAchievements,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /topics/:topicId/leaderboard - Topic-specific leaderboard
topicRoutes.get("/:topicId/leaderboard", async (ctx) => {
  try {
    const topicId = ctx.params.topicId;
    const limit = parseInt(ctx.request.url.searchParams.get("limit") || "10");

    const leaderboard = await getTopicLeaderboard(topicId, limit);

    ctx.response.body = {
      topicId,
      leaderboard,
      total: leaderboard.length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// GET /progress/history - User's progress history
topicRoutes.get("/progress/history", async (ctx) => {
  try {
    const userId = ctx.request.headers.get("x-user-id");
    if (!userId) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Unauthorized" };
      return;
    }

    const topicId = ctx.request.url.searchParams.get("topicId");
    const days = parseInt(ctx.request.url.searchParams.get("days") || "7");

    if (!topicId) {
      ctx.response.status = 400;
      ctx.response.body = { error: "topicId required" };
      return;
    }

    const history = await getProgressHistory(userId, topicId, days);

    ctx.response.body = {
      topicId,
      days,
      snapshots: history,
      total: history.length,
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: error.message };
  }
});

// Helper route to import from service
async function getProgressHistory(userId: string, topicId: string, days: number): Promise<any[]> {
  const { getProgressHistory: getHistory } = await import("./subject-progress-service.tsx");
  return getHistory(userId, topicId, days);
}
