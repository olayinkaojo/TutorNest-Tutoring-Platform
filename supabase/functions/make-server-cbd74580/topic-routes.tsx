import { Hono } from 'npm:hono@4';
import { verifyUser } from './route-auth.tsx';
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

export const topicRoutes = new Hono();

// GET /topics/all - All available topics with user's mastery
topicRoutes.get("/all", async (c) => {
  try {
    const userId = await verifyUser(c);
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

    return c.json({
      topics: topicsWithProgress,
      total: topicsWithProgress.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /topics/:topicId - Topic details with user progress
topicRoutes.get("/:topicId", async (c) => {
  try {
    const userId = await verifyUser(c);
    const topicId = c.req.param("topicId");

    const topic = await getTopic(topicId);
    if (!topic) {
      return c.json({ error: "Topic not found" }, 404);
    }

    const progress = userId ? await getTopicProgress(userId, topicId) : null;
    const stats = userId ? await getTopicStats(userId, topicId) : null;
    const completion = userId ? await getTopicCompletion(userId, topicId) : 0;
    const achievements = userId ? await getTopicAchievementProgress(userId, topicId) : [];
    const leaderboard = await getTopicLeaderboard(topicId, 10);

    return c.json({
      topic,
      userProgress: progress,
      userStats: stats,
      completionPercentage: completion,
      achievements,
      leaderboard,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /topics/recommended/topics - Get recommended topics for user
topicRoutes.get("/recommended/topics", async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limit = parseInt(c.req.query("limit") || "3");
    const recommendedIds = await getRecommendedNextTopics(userId, limit);

    const topics = await Promise.all(recommendedIds.map((id) => getTopic(id)));
    const filtered = topics.filter((t) => t !== null);

    return c.json({
      recommended: filtered,
      total: filtered.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /learning-paths/all - Get all user's learning paths
topicRoutes.get("/learning-paths/all", async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const paths = await getUserLearningPaths(userId);
    const pathsWithDetails = await Promise.all(
      paths.map(async (path) => {
        const topic = await getTopic(path.topicId);
        return { ...path, topic };
      })
    );

    return c.json({
      paths: pathsWithDetails,
      total: pathsWithDetails.length,
      active: pathsWithDetails.filter((p) => p.currentLevel < 4).length,
      completed: pathsWithDetails.filter((p) => p.currentLevel >= 4).length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /learning-paths/:topicId/path - Get specific learning path
topicRoutes.get("/learning-paths/:topicId/path", async (c) => {
  try {
    const userId = await verifyUser(c);
    const topicId = c.req.param("topicId");

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const path = await getLearningPath(userId, topicId);
    const topic = await getTopic(topicId);

    if (!path || !topic) {
      return c.json({ error: "Learning path not found" }, 404);
    }

    return c.json({ path, topic });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /learning-paths/start - Start new learning path
topicRoutes.post("/learning-paths/start", async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { topicId } = body;

    const success = await startLearningPath(userId, topicId);

    if (!success) {
      return c.json({ error: "Failed to start learning path" }, 400);
    }

    const path = await getLearningPath(userId, topicId);
    return c.json({ success: true, path });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /topics/:topicId/complete-level - Complete topic level
topicRoutes.post("/:topicId/complete-level", async (c) => {
  try {
    const userId = await verifyUser(c);
    const topicId = c.req.param("topicId");

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { level, accuracy, answerTime } = body;

    const result = await completeLearningPathLevel(userId, topicId, level, accuracy, answerTime);

    // Check for new achievements
    const newAchievements = await checkTopicAchievements(userId, topicId);

    return c.json({
      ...result,
      newAchievements,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /topics/:topicId/leaderboard - Topic-specific leaderboard
topicRoutes.get("/:topicId/leaderboard", async (c) => {
  try {
    const topicId = c.req.param("topicId");
    const limit = parseInt(c.req.query("limit") || "10");

    const leaderboard = await getTopicLeaderboard(topicId, limit);

    return c.json({
      topicId,
      leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /progress/history - User's progress history
topicRoutes.get("/progress/history", async (c) => {
  try {
    const userId = await verifyUser(c);
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const topicId = c.req.query("topicId");
    const days = parseInt(c.req.query("days") || "7");

    if (!topicId) {
      return c.json({ error: "topicId required" }, 400);
    }

    const history = await getProgressHistory(userId, topicId, days);

    return c.json({
      topicId,
      days,
      snapshots: history,
      total: history.length,
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});
