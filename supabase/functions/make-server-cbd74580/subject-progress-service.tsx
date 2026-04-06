import { kv } from "https://deno.land/x/deno_kv_oauthv2@v0.0.2/mod.ts";

export interface TopicProgress {
  topicId: string;
  currentLevel: number;
  accuracy: number;
  questionsAnswered: number;
  totalTime: number;
  masteryScore: number;
  levelProgress: Record<number, { completed: boolean; accuracy: number | null; time: number }>;
  startDate: string;
  lastActivityDate: string;
}

export async function getTopicProgress(userId: string, topicId: string): Promise<TopicProgress | null> {
  try {
    const key = [`user:${userId}:topic:${topicId}:progress`];
    const data = await kv.get(key);
    return data?.value || null;
  } catch {
    return null;
  }
}

export async function updateTopicProgress(
  userId: string,
  topicId: string,
  updates: Partial<TopicProgress>
): Promise<void> {
  try {
    const current = await getTopicProgress(userId, topicId);
    if (!current) return;

    const updated = {
      ...current,
      ...updates,
      lastActivityDate: new Date().toISOString(),
    };

    await kv.set([`user:${userId}:topic:${topicId}:progress`], updated);
  } catch {
    // Silent fail
  }
}

export async function calculateMasteryScore(userId: string, topicId: string): Promise<number> {
  try {
    const progress = await getTopicProgress(userId, topicId);
    if (!progress) return 0;

    const accuracy = progress.accuracy || 0;
    const levelProgress = progress.levelProgress || {};
    const completedLevels = Object.values(levelProgress).filter((lp) => lp?.completed).length;
    const completionPercentage = (completedLevels / 4) * 100;

    // Average answer time for speed multiplier
    const avgTime = progress.questionsAnswered > 0 ? progress.totalTime / progress.questionsAnswered : 0;
    const speedMultiplier = avgTime < 10000 ? 1.5 : avgTime < 12000 ? 1.2 : avgTime < 15000 ? 1.0 : 0.7;

    // Weighted score
    const masteryScore =
      accuracy * 0.6 + (speedMultiplier / 1.5) * 100 * 0.3 + (completionPercentage / 100) * 100 * 0.1;

    return Math.min(masteryScore, 100);
  } catch {
    return 0;
  }
}

export async function getUserProgress(userId: string): Promise<Record<string, TopicProgress>> {
  try {
    const progressMap: Record<string, TopicProgress> = {};

    // List all progress keys for this user
    const keys = await kv.list({ prefix: [`user:${userId}:topic:`] });
    for await (const entry of keys) {
      const data = await kv.get(entry.key);
      if (data?.value) {
        const topicId = (entry.key[2] as string).replace(":progress", "");
        progressMap[topicId] = data.value;
      }
    }

    return progressMap;
  } catch {
    return {};
  }
}

export async function getProgressHistory(userId: string, topicId: string, days: number = 7): Promise<any[]> {
  try {
    const key = [`user:${userId}:topic:${topicId}:history`];
    const data = await kv.get(key);
    if (!data?.value?.snapshots) return [];

    const now = Date.now();
    const cutoffTime = now - days * 24 * 60 * 60 * 1000;

    return data.value.snapshots.filter((snapshot: any) => new Date(snapshot.date).getTime() > cutoffTime);
  } catch {
    return [];
  }
}

export async function recordProgressSnapshot(
  userId: string,
  topicId: string,
  snapshot: any
): Promise<void> {
  try {
    const key = [`user:${userId}:topic:${topicId}:history`];
    const current = await kv.get(key);
    const snapshots = current?.value?.snapshots || [];

    // Keep only last 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const filtered = snapshots.filter((s: any) => new Date(s.date).getTime() > thirtyDaysAgo);

    const updated = {
      snapshots: [...filtered, { ...snapshot, date: new Date().toISOString() }],
    };

    await kv.set(key, updated);
  } catch {
    // Silent fail
  }
}

export async function getLevelReadiness(userId: string, topicId: string, nextLevel: number): Promise<boolean> {
  try {
    const progress = await getTopicProgress(userId, topicId);
    if (!progress) return false;

    const currentLevelData = progress.levelProgress[nextLevel - 1];
    if (!currentLevelData) return false;

    // Ready if previous level completed with min accuracy
    return currentLevelData.completed && currentLevelData.accuracy >= 0.6;
  } catch {
    return false;
  }
}

export async function getTopicStats(userId: string, topicId: string): Promise<any> {
  try {
    const progress = await getTopicProgress(userId, topicId);
    if (!progress) {
      return {
        topicId,
        userId,
        questionsAnswered: 0,
        accuracy: 0,
        avgTime: 0,
        masteryScore: 0,
        currentLevel: 1,
      };
    }

    const avgTime = progress.questionsAnswered > 0 ? progress.totalTime / progress.questionsAnswered : 0;
    const masteryScore = await calculateMasteryScore(userId, topicId);

    return {
      topicId,
      userId,
      questionsAnswered: progress.questionsAnswered,
      accuracy: Math.round(progress.accuracy * 100) / 100,
      avgTime: Math.round(avgTime),
      masteryScore: Math.round(masteryScore * 100) / 100,
      currentLevel: progress.currentLevel,
      startDate: progress.startDate,
      lastActivityDate: progress.lastActivityDate,
    };
  } catch {
    return {
      topicId,
      userId,
      questionsAnswered: 0,
      accuracy: 0,
      avgTime: 0,
      masteryScore: 0,
      currentLevel: 1,
    };
  }
}

export async function getTopicCompletion(userId: string, topicId: string): Promise<number> {
  try {
    const progress = await getTopicProgress(userId, topicId);
    if (!progress) return 0;

    const levelProgress = progress.levelProgress || {};
    const completedLevels = Object.values(levelProgress).filter((lp) => lp?.completed).length;
    return (completedLevels / 4) * 100;
  } catch {
    return 0;
  }
}
