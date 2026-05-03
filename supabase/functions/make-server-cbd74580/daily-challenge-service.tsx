import * as kv from "./kv_store.tsx";

interface DailyChallenge {
  id: string;
  date: string;
  topicId: string;
  questionId: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: "easy" | "medium" | "hard";
  baseXpReward: number;
}

interface UserStreak {
  userId: string;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
  streakFreezeCount: number;
  freezeUsedDates: string[];
}

interface StreakReward {
  xpMultiplier: number;
  bonusXp: number;
  totalXp: number;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export async function generateDailyChallenge(): Promise<DailyChallenge> {
  const today = getTodayDate();
  const cacheKey = `daily_challenge:${today}`;

  try {
    const existing = await kv.get(cacheKey);
    if (existing != null) {
      return existing as DailyChallenge;
    }

    const topics = [
      { id: "math", name: "Mathematics", difficulty: "medium" },
      { id: "english", name: "English", difficulty: "easy" },
      { id: "science", name: "Sciences", difficulty: "medium" },
      { id: "history", name: "History", difficulty: "hard" },
      { id: "art", name: "Art", difficulty: "easy" },
      { id: "music", name: "Music", difficulty: "medium" },
      { id: "pe", name: "Physical Education", difficulty: "easy" },
    ];

    const dayOfWeek = new Date(today).getDay();
    const selectedTopic = topics[dayOfWeek % topics.length];

    const challenge: DailyChallenge = {
      id: `daily_${today}`,
      date: today,
      topicId: selectedTopic.id,
      questionId: `daily_${today}_q1`,
      question: `Today's Challenge (${selectedTopic.name}): What is the capital of France?`,
      options: ["London", "Paris", "Berlin", "Madrid"],
      correctAnswer: 1,
      difficulty: selectedTopic.difficulty as "easy" | "medium" | "hard",
      baseXpReward: 200,
    };

    await kv.set(cacheKey, challenge);
    return challenge;
  } catch (error) {
    console.error("Error generating daily challenge:", error);
    throw error;
  }
}

export async function getDailyChallenge(): Promise<DailyChallenge> {
  return generateDailyChallenge();
}

export async function recordDailyCompletion(
  userId: string,
  isCorrect: boolean
): Promise<{
  success: boolean;
  streakInfo: UserStreak;
  xpReward: StreakReward;
  message: string;
}> {
  const today = getTodayDate();
  const streakKey = `user_streak:${userId}`;

  try {
    const streakEntry = await kv.get(streakKey);
    let streak: UserStreak = (streakEntry as UserStreak) || {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      streakFreezeCount: 0,
      freezeUsedDates: [],
    };

    const completionKey = `daily_completion:${userId}:${today}`;
    const existing = await kv.get(completionKey);

    if (existing != null) {
      return {
        success: false,
        streakInfo: streak,
        xpReward: calculateStreakReward(streak.currentStreak),
        message: "You've already completed today's challenge. Come back tomorrow!",
      };
    }

    if (!isCorrect) {
      streak.currentStreak = 0;
      await kv.set(streakKey, streak);

      return {
        success: true,
        streakInfo: streak,
        xpReward: { xpMultiplier: 1, bonusXp: 0, totalXp: 0 },
        message: "Incorrect answer. Streak reset. Try again tomorrow!",
      };
    }

    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
      .toISOString()
      .split("T")[0];

    if (streak.lastCompletedDate === yesterday) {
      streak.currentStreak += 1;
    } else if (streak.lastCompletedDate === today) {
      return {
        success: false,
        streakInfo: streak,
        xpReward: calculateStreakReward(streak.currentStreak),
        message: "You've already completed today's challenge. Come back tomorrow!",
      };
    } else {
      if (streak.lastCompletedDate && streak.lastCompletedDate !== yesterday) {
        if (streak.freezeUsedDates.includes(yesterday)) {
          streak.currentStreak += 1;
          streak.freezeUsedDates = streak.freezeUsedDates.filter((d) => d !== yesterday);
        } else {
          streak.currentStreak = 1;
        }
      } else {
        streak.currentStreak = 1;
      }
    }

    if (streak.currentStreak > streak.bestStreak) {
      streak.bestStreak = streak.currentStreak;
    }

    streak.lastCompletedDate = today;

    await kv.set(completionKey, { date: today, isCorrect: true });
    await kv.set(streakKey, streak);

    const reward = calculateStreakReward(streak.currentStreak);

    return {
      success: true,
      streakInfo: streak,
      xpReward: reward,
      message: `Great! 🔥 Streak: ${streak.currentStreak} days | +${reward.totalXp} XP`,
    };
  } catch (error) {
    console.error("Error recording daily completion:", error);
    throw error;
  }
}

export function calculateStreakReward(currentStreak: number): StreakReward {
  const baseXp = 200;
  const multiplier = 1 + currentStreak * 0.1;
  const bonusXp = Math.floor(baseXp * (multiplier - 1));
  const totalXp = baseXp + bonusXp;

  return {
    xpMultiplier: Math.min(multiplier, 5),
    bonusXp,
    totalXp: Math.min(totalXp, 1000),
  };
}

export async function getStreakInfo(userId: string): Promise<UserStreak> {
  const streakKey = `user_streak:${userId}`;

  try {
    const entry = await kv.get(streakKey);
    return (entry as UserStreak) || {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      streakFreezeCount: 0,
      freezeUsedDates: [],
    };
  } catch (error) {
    console.error("Error getting streak info:", error);
    throw error;
  }
}

export async function useStreakFreeze(
  userId: string
): Promise<{ success: boolean; message: string; freezesRemaining: number }> {
  const streakKey = `user_streak:${userId}`;

  try {
    const entry = await kv.get(streakKey);
    const streak = (entry as UserStreak) || {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      streakFreezeCount: 3,
      freezeUsedDates: [],
    };

    if (streak.streakFreezeCount <= 0) {
      return {
        success: false,
        message: "No freeze uses remaining. Come back next month!",
        freezesRemaining: 0,
      };
    }

    const today = getTodayDate();
    streak.streakFreezeCount -= 1;
    streak.freezeUsedDates.push(today);

    await kv.set(streakKey, streak);

    return {
      success: true,
      message: `Freeze used! Your streak is safe. (${streak.streakFreezeCount} remaining)`,
      freezesRemaining: streak.streakFreezeCount,
    };
  } catch (error) {
    console.error("Error using streak freeze:", error);
    throw error;
  }
}

export async function resetBrokenStreaks(): Promise<{
  processed: number;
  reset: number;
}> {
  console.log("Streak reset job would run here at UTC midnight");
  return { processed: 0, reset: 0 };
}

export async function hasCompletedToday(userId: string): Promise<boolean> {
  const today = getTodayDate();
  const completionKey = `daily_completion:${userId}:${today}`;

  try {
    const entry = await kv.get(completionKey);
    return entry != null;
  } catch (error) {
    console.error("Error checking daily completion:", error);
    return false;
  }
}

export async function getDailyChallengesLeaderboard(): Promise<
  Array<{
    userId: string;
    streakLength: number;
    weeklyCompletions: number;
    totalXpThisWeek: number;
  }>
> {
  console.log("Daily challenges leaderboard would be retrieved here");
  return [];
}

export default {
  generateDailyChallenge,
  getDailyChallenge,
  recordDailyCompletion,
  calculateStreakReward,
  getStreakInfo,
  useStreakFreeze,
  resetBrokenStreaks,
  hasCompletedToday,
  getDailyChallengesLeaderboard,
};
