import * as kv from "./kv_store.tsx";
import { TOPICS } from "./topic-service.tsx";

export interface LearningPath {
  topicId: string;
  currentLevel: number;
  completedLevels: number[];
  startDate: string;
  lastActivityDate: string;
  timeToMastery: number; // milliseconds
  estimatedCompletionDate: string;
}

export async function getUserLearningPaths(userId: string): Promise<LearningPath[]> {
  try {
    const key = [`user:${userId}:learning-paths`];
    const data = await kv.get(key);
    if (!data?.value) return [];

    const active = data.value.active || [];
    const paths: LearningPath[] = [];

    for (const topicId of active) {
      const path = await getLearningPath(userId, topicId);
      if (path) paths.push(path);
    }

    return paths;
  } catch {
    return [];
  }
}

export async function getLearningPath(userId: string, topicId: string): Promise<LearningPath | null> {
  try {
    const key = [`user:${userId}:topic:${topicId}:progress`];
    const data = await kv.get(key);

    if (!data?.value) return null;

    const progress = data.value;
    const topic = TOPICS[topicId];
    if (!topic) return null;

    const currentLevelData = topic.levels[progress.currentLevel - 1];
    const totalQuestionsNeeded = currentLevelData ? currentLevelData.questions : 0;
    const questionsAnswered = progress.questionsAnswered || 0;
    const avgTimePerQuestion = progress.totalTime ? progress.totalTime / Math.max(questionsAnswered, 1) : 0;
    const questionsRemaining = Math.max(0, totalQuestionsNeeded - questionsAnswered);
    const timeToMastery = questionsRemaining * avgTimePerQuestion;

    const estimatedCompletionDate = new Date(
      Date.now() + timeToMastery
    ).toISOString();

    return {
      topicId,
      currentLevel: progress.currentLevel,
      completedLevels: progress.levelProgress
        ? Object.keys(progress.levelProgress)
            .filter((level) => progress.levelProgress[level]?.completed)
            .map((l) => parseInt(l))
        : [],
      startDate: progress.startDate || new Date().toISOString(),
      lastActivityDate: progress.lastActivityDate || new Date().toISOString(),
      timeToMastery,
      estimatedCompletionDate,
    };
  } catch {
    return null;
  }
}

export async function startLearningPath(userId: string, topicId: string): Promise<boolean> {
  try {
    const topic = TOPICS[topicId];
    if (!topic) return false;

    const key = [`user:${userId}:learning-paths`];
    const current = await kv.get(key);
    const active = current?.value?.active || [];

    if (!active.includes(topicId)) {
      const updated = {
        active: [...active, topicId],
        completed: current?.value?.completed || [],
        recommended: current?.value?.recommended || [],
        timeToMastery: current?.value?.timeToMastery || {},
      };
      await kv.set(key, updated);

      // Initialize progress
      const progressKey = [`user:${userId}:topic:${topicId}:progress`];
      const now = new Date().toISOString();
      await kv.set(progressKey, {
        currentLevel: 1,
        accuracy: 0,
        questionsAnswered: 0,
        totalTime: 0,
        masteryScore: 0,
        levelProgress: {
          1: { completed: false, accuracy: null, time: 0 },
          2: { completed: false, accuracy: null, time: 0 },
          3: { completed: false, accuracy: null, time: 0 },
          4: { completed: false, accuracy: null, time: 0 },
        },
        startDate: now,
        lastActivityDate: now,
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function completeLearningPathLevel(
  userId: string,
  topicId: string,
  level: number,
  accuracy: number,
  answerTime: number
): Promise<{ levelComplete: boolean; topicMastered: boolean }> {
  try {
    const topic = TOPICS[topicId];
    if (!topic) return { levelComplete: false, topicMastered: false };

    const levelData = topic.levels[level - 1];
    if (!levelData) return { levelComplete: false, topicMastered: false };

    const progressKey = [`user:${userId}:topic:${topicId}:progress`];
    const current = await kv.get(progressKey);
    const progress = current?.value || {};

    const levelProgress = progress.levelProgress || {};
    levelProgress[level] = {
      completed: accuracy >= levelData.minAccuracy,
      accuracy,
      time: answerTime,
    };

    // Calculate new mastery score
    const masteryScore = calculateMasteryScore(accuracy, answerTime, levelData.avgTimePerQuestion, level);

    const updated = {
      ...progress,
      currentLevel: accuracy >= levelData.minAccuracy ? Math.min(level + 1, 4) : level,
      accuracy: (progress.accuracy || 0) * 0.7 + accuracy * 0.3, // Exponential moving average
      questionsAnswered: (progress.questionsAnswered || 0) + 1,
      totalTime: (progress.totalTime || 0) + answerTime,
      masteryScore,
      levelProgress,
      lastActivityDate: new Date().toISOString(),
    };

    await kv.set(progressKey, updated);

    // Check if topic mastered (all levels completed + avg accuracy >= 85%)
    const allLevelsCompleted = Object.values(levelProgress).every((lp: any) => lp?.completed);
    const topicMastered = allLevelsCompleted && updated.accuracy >= 0.85;

    return {
      levelComplete: accuracy >= levelData.minAccuracy,
      topicMastered,
    };
  } catch {
    return { levelComplete: false, topicMastered: false };
  }
}

function calculateMasteryScore(
  accuracy: number,
  answerTime: number,
  targetTime: number,
  level: number
): number {
  const accuracyWeight = 0.6;
  const speedWeight = 0.3;
  const levelWeight = 0.1;

  const speedMultiplier =
    answerTime < targetTime ? 1.5 : answerTime < targetTime * 1.2 ? 1.2 : answerTime < targetTime * 1.5 ? 1.0 : 0.7;

  const levelScore = (level / 4) * 100; // 0-100 based on level

  return accuracy * 100 * accuracyWeight + speedMultiplier * 100 * speedWeight + levelScore * levelWeight;
}

export async function getRecommendedNextTopics(userId: string, limit: number = 3): Promise<string[]> {
  try {
    const paths = await getUserLearningPaths(userId);
    const completedTopics = new Set(paths.map((p) => p.topicId));

    // Get all topics not in progress
    const availableTopics = Object.keys(TOPICS).filter((id) => !completedTopics.has(id));

    // Sort by prerequisites (easier topics first)
    const sorted = availableTopics.sort((a, b) => {
      const topicA = TOPICS[a];
      const topicB = TOPICS[b];
      return (topicA?.prerequisites.length || 0) - (topicB?.prerequisites.length || 0);
    });

    return sorted.slice(0, limit);
  } catch {
    return Object.keys(TOPICS).slice(0, limit);
  }
}

export async function getTopicPathCompletion(userId: string, topicId: string): Promise<number> {
  try {
    const progressKey = [`user:${userId}:topic:${topicId}:progress`];
    const data = await kv.get(progressKey);
    const progress = data?.value;

    if (!progress) return 0;

    const levelProgress = progress.levelProgress || {};
    const completedLevels = Object.values(levelProgress).filter((lp: any) => lp?.completed).length;
    return (completedLevels / 4) * 100;
  } catch {
    return 0;
  }
}

export async function updateTopicRecommendations(userId: string): Promise<void> {
  try {
    const recommended = await getRecommendedNextTopics(userId, 5);
    const key = [`user:${userId}:learning-paths`];
    const current = await kv.get(key);

    if (current?.value) {
      const updated = {
        ...current.value,
        recommended,
      };
      await kv.set(key, updated);
    }
  } catch {
    // Silent fail
  }
}
