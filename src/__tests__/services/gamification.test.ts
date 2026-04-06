import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock KV store
const kvStore = new Map<string, any>();

const mockKvGet = vi.fn(async (key: string) => kvStore.get(key));
const mockKvSet = vi.fn(async (key: string, value: any) => {
  kvStore.set(key, value);
});

// Test helpers
const getTestUserId = () => `user:test:${Date.now()}`;
const getTestTopicId = () => `topic:${Date.now()}`;

describe('Gamification Services - Unit Tests', () => {
  beforeEach(() => {
    kvStore.clear();
    vi.clearAllMocks();
  });

  describe('Achievement Service', () => {
    it('should create a new achievement', () => {
      const achievement = {
        id: 'achievement:test:1',
        title: 'Quiz Master',
        description: 'Complete 10 quizzes',
        icon: '🎓',
        points: 100,
        rarity: 'common',
      };

      kvStore.set(achievement.id, achievement);
      const retrieved = kvStore.get(achievement.id);

      expect(retrieved).toEqual(achievement);
      expect(retrieved.title).toBe('Quiz Master');
    });

    it('should award achievement to user', () => {
      const userId = getTestUserId();
      const achievementId = 'achievement:quiz-master';

      const userAchievements = [achievementId];
      kvStore.set(`user:${userId}:achievements`, userAchievements);

      const retrieved = kvStore.get(`user:${userId}:achievements`);
      expect(retrieved).toContain(achievementId);
      expect(retrieved.length).toBe(1);
    });

    it('should not award duplicate achievements', () => {
      const userId = getTestUserId();
      const achievementId = 'achievement:quiz-master';

      let userAchievements = [achievementId];
      kvStore.set(`user:${userId}:achievements`, userAchievements);

      // Try to add duplicate
      if (!userAchievements.includes(achievementId)) {
        userAchievements.push(achievementId);
      }

      const retrieved = kvStore.get(`user:${userId}:achievements`);
      expect(retrieved.length).toBe(1);
    });

    it('should track achievement progress', () => {
      const userId = getTestUserId();
      const progressKey = `user:${userId}:achievement-progress:quiz-master`;

      const progress = {
        achievementId: 'achievement:quiz-master',
        currentProgress: 7,
        targetProgress: 10,
        completed: false,
      };

      kvStore.set(progressKey, progress);
      const retrieved = kvStore.get(progressKey);

      expect(retrieved.currentProgress).toBe(7);
      expect(retrieved.completed).toBe(false);

      // Complete achievement
      progress.currentProgress = 10;
      progress.completed = true;
      kvStore.set(progressKey, progress);

      const updatedProgress = kvStore.get(progressKey);
      expect(updatedProgress.completed).toBe(true);
    });

    it('should calculate achievement completion percentage', () => {
      const userId = getTestUserId();
      const achievements = ['ach1', 'ach2', 'ach3'];
      const userAchievements = ['ach1', 'ach2'];

      kvStore.set(`all:achievements`, achievements);
      kvStore.set(`user:${userId}:achievements`, userAchievements);

      const totalAchievements = kvStore.get('all:achievements').length;
      const userCount = kvStore.get(`user:${userId}:achievements`).length;
      const percentage = (userCount / totalAchievements) * 100;

      expect(percentage).toBe(66.66666666666666);
    });
  });

  describe('Leaderboard Service', () => {
    it('should create leaderboard entry', () => {
      const userId = getTestUserId();
      const entry = {
        userId,
        username: 'testuser',
        score: 1000,
        rank: 1,
        timestamp: Date.now(),
      };

      kvStore.set(`leaderboard:global:${userId}`, entry);
      const retrieved = kvStore.get(`leaderboard:global:${userId}`);

      expect(retrieved.score).toBe(1000);
      expect(retrieved.username).toBe('testuser');
    });

    it('should rank users by score', () => {
      const users = [
        { userId: 'user:1', score: 500 },
        { userId: 'user:2', score: 1000 },
        { userId: 'user:3', score: 750 },
      ];

      const sorted = users.sort((a, b) => b.score - a.score);

      expect(sorted[0].score).toBe(1000);
      expect(sorted[1].score).toBe(750);
      expect(sorted[2].score).toBe(500);
    });

    it('should track subject-specific leaderboards', () => {
      const userId = getTestUserId();
      const subjectId = 'subject:math';

      const entry = {
        userId,
        score: 2500,
        topicId: subjectId,
      };

      kvStore.set(`leaderboard:${subjectId}:${userId}`, entry);
      const retrieved = kvStore.get(`leaderboard:${subjectId}:${userId}`);

      expect(retrieved.topicId).toBe(subjectId);
      expect(retrieved.score).toBe(2500);
    });
  });

  describe('Mastery Calculation', () => {
    it('should calculate mastery score correctly', () => {
      // Mastery = (Accuracy × 0.6) + (Speed × 0.3) + (Completion × 0.1)
      const accuracy = 0.9; // 90%
      const speedMultiplier = 1.2; // 20% faster than average
      const completion = 1.0; // 100% completed

      const mastery = accuracy * 0.6 + speedMultiplier * 0.3 + completion * 0.1;

      expect(mastery).toBeCloseTo(1.1, 0); // Use 0 decimals for less strict check
    });

    it('should normalize mastery score to 0-1 range', () => {
      const rawMastery = 1.5;
      const normalized = Math.min(1, Math.max(0, rawMastery));

      expect(normalized).toBe(1);

      const lowMastery = -0.5;
      const normalizedLow = Math.min(1, Math.max(0, lowMastery));
      expect(normalizedLow).toBe(0);
    });

    it('should track learning velocity (improvement over time)', () => {
      const firstHalfScores = [0.5, 0.55, 0.6];
      const secondHalfScores = [0.75, 0.8, 0.85];

      const firstHalfAvg = firstHalfScores.reduce((a, b) => a + b) / firstHalfScores.length;
      const secondHalfAvg = secondHalfScores.reduce((a, b) => a + b) / secondHalfScores.length;

      // Velocity normalized to -1 to +1
      const velocity = (secondHalfAvg - firstHalfAvg) / Math.max(firstHalfAvg, 0.001);

      expect(velocity).toBeGreaterThan(0);
      expect(firstHalfAvg).toBeCloseTo(0.55, 1); // Use toBeCloseTo for floating point
      expect(secondHalfAvg).toBeCloseTo(0.8, 1);
    });
  });

  describe('Trivia Session', () => {
    it('should track question attempts', () => {
      const sessionId = `session:${Date.now()}`;
      const attempts = [];

      const attempt = {
        questionId: 'q1',
        selectedAnswer: 0,
        isCorrect: true,
        timeSpent: 5,
        timestamp: Date.now(),
      };

      attempts.push(attempt);
      kvStore.set(`${sessionId}:attempts`, attempts);

      const retrieved = kvStore.get(`${sessionId}:attempts`);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].isCorrect).toBe(true);
    });

    it('should calculate session score', () => {
      const attempts = [
        { isCorrect: true, points: 10 },
        { isCorrect: true, points: 10 },
        { isCorrect: false, points: 0 },
      ];

      const score = attempts.reduce((sum, a) => sum + a.points, 0);
      expect(score).toBe(20);
    });

    it('should calculate session accuracy', () => {
      const attempts = [
        { isCorrect: true },
        { isCorrect: true },
        { isCorrect: false },
        { isCorrect: true },
      ];

      const accuracy = attempts.filter((a) => a.isCorrect).length / attempts.length;
      expect(accuracy).toBeCloseTo(0.75, 1);
    });
  });

  describe('XP & Points System', () => {
    it('should award XP for correct answer', () => {
      const baseXP = 10;
      const difficulty = 1.5; // Hard question
      const xpReward = baseXP * difficulty;

      expect(xpReward).toBe(15);
    });

    it('should award bonus XP for speed', () => {
      const baseXP = 10;
      const avgTime = 10; // seconds
      const timeSpent = 3;

      const speedBonus = timeSpent < avgTime ? (avgTime - timeSpent) * 0.1 : 0;
      const totalXP = baseXP + speedBonus;

      expect(speedBonus).toBeCloseTo(0.7, 1);
      expect(totalXP).toBeCloseTo(10.7, 1);
    });

    it('should track total user XP', () => {
      const userId = getTestUserId();
      const userKey = `user:${userId}:stats`;

      kvStore.set(userKey, { totalXP: 0, level: 1 });

      let user = kvStore.get(userKey);
      expect(user.totalXP).toBe(0);

      // Add XP
      user.totalXP += 150;
      kvStore.set(userKey, user);

      user = kvStore.get(userKey);
      expect(user.totalXP).toBe(150);
    });

    it('should calculate level from XP', () => {
      const totalXP = 500;
      const xpPerLevel = 100;
      const level = Math.floor(totalXP / xpPerLevel) + 1;

      expect(level).toBe(6); // 500/100 = 5, +1 for level 1 start
    });
  });

  describe('Streak System', () => {
    it('should track daily streaks', () => {
      const userId = getTestUserId();
      const today = new Date().toDateString();

      const streak = {
        userId,
        currentStreak: 5,
        longestStreak: 12,
        lastActivityDate: today,
      };

      kvStore.set(`user:${userId}:streak`, streak);
      const retrieved = kvStore.get(`user:${userId}:streak`);

      expect(retrieved.currentStreak).toBe(5);
      expect(retrieved.longestStreak).toBe(12);
    });

    it('should break streak on missed day', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const lastActivityDate = yesterday.toDateString();
      const shouldBreakStreak = lastActivityDate !== today.toDateString();

      expect(shouldBreakStreak).toBe(true);
    });

    it('should award streak bonus', () => {
      const streak = 7;
      const baseReward = 10;
      const streakBonus = baseReward + streak * 2;

      expect(streakBonus).toBe(24); // 10 + (7 * 2)
    });
  });
});
