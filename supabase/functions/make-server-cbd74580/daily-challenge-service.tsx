import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

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

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Generate daily challenge for a specific date
export async function generateDailyChallenge(kv: Deno.KvStore): Promise<DailyChallenge> {
  const today = getTodayDate();
  const cacheKey = `daily_challenge:${today}`;

  try {
    // Check if already generated for today
    const existing = await kv.get([cacheKey]);
    if (existing.value) {
      return existing.value as DailyChallenge;
    }

    // Select a random topic (cycling through: Math, English, Science, History, Art, Music, PE)
    const topics = [
      { id: "math", name: "Mathematics", difficulty: "medium" },
      { id: "english", name: "English", difficulty: "easy" },
      { id: "science", name: "Sciences", difficulty: "medium" },
      { id: "history", name: "History", difficulty: "hard" },
      { id: "art", name: "Art", difficulty: "easy" },
      { id: "music", name: "Music", difficulty: "medium" },
      { id: "pe", name: "Physical Education", difficulty: "easy" },
    ];

    // Use date to ensure consistent topic per day
    const dayOfWeek = new Date(today).getDay();
    const selectedTopic = topics[dayOfWeek % topics.length];

    // Placeholder: In production, fetch from comprehensive trivia data
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

    // Cache for the day
    await kv.set([cacheKey], challenge, { expirationTtl: 86400 }); // 24 hours
    return challenge;
  } catch (error) {
    console.error("Error generating daily challenge:", error);
    throw error;
  }
}

// Get today's daily challenge
export async function getDailyChallenge(kv: Deno.KvStore): Promise<DailyChallenge> {
  return generateDailyChallenge(kv);
}

// Record user's daily challenge completion
export async function recordDailyCompletion(
  kv: Deno.KvStore,
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
    // Get current streak info
    const streakEntry = await kv.get([streakKey]);
    let streak: UserStreak = (streakEntry.value as UserStreak) || {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      streakFreezeCount: 0,
      freezeUsedDates: [],
    };

    // Record completion
    const completionKey = `daily_completion:${userId}:${today}`;
    const existing = await kv.get([completionKey]);

    if (existing.value) {
      // Already completed today
      return {
        success: false,
        streakInfo: streak,
        xpReward: calculateStreakReward(streak.currentStreak),
        message: "You've already completed today's challenge. Come back tomorrow!",
      };
    }

    if (!isCorrect) {
      // Wrong answer breaks streak
      streak.currentStreak = 0;
      await kv.set([streakKey], streak);

      return {
        success: true,
        streakInfo: streak,
        xpReward: { xpMultiplier: 1, bonusXp: 0, totalXp: 0 },
        message: "Incorrect answer. Streak reset. Try again tomorrow!",
      };
    }

    // Correct answer - check if continuing streak
    const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))
      .toISOString()
      .split("T")[0];

    if (streak.lastCompletedDate === yesterday) {
      // Continuing streak
      streak.currentStreak += 1;
    } else if (streak.lastCompletedDate === today) {
      // Already done today
      return {
        success: false,
        streakInfo: streak,
        xpReward: calculateStreakReward(streak.currentStreak),
        message: "You've already completed today's challenge. Come back tomorrow!",
      };
    } else {
      // Starting fresh or gap in streak
      if (streak.lastCompletedDate && streak.lastCompletedDate !== yesterday) {
        // Check if freeze was used
        if (streak.freezeUsedDates.includes(yesterday)) {
          streak.currentStreak += 1; // Freeze preserves streak
          streak.freezeUsedDates = streak.freezeUsedDates.filter((d) => d !== yesterday);
        } else {
          streak.currentStreak = 1; // Start fresh
        }
      } else {
        streak.currentStreak = 1;
      }
    }

    // Update best streak
    if (streak.currentStreak > streak.bestStreak) {
      streak.bestStreak = streak.currentStreak;
    }

    streak.lastCompletedDate = today;

    // Record completion
    await kv.set([completionKey], { date: today, isCorrect: true });
    await kv.set([streakKey], streak);

    // Calculate XP reward with streak multiplier
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

// Calculate XP reward with streak multiplier
export function calculateStreakReward(currentStreak: number): StreakReward {
  const baseXp = 200;
  const multiplier = 1 + currentStreak * 0.1; // +10% per day streak
  const bonusXp = Math.floor(baseXp * (multiplier - 1));
  const totalXp = baseXp + bonusXp;

  return {
    xpMultiplier: Math.min(multiplier, 5), // Cap at 5x
    bonusXp,
    totalXp: Math.min(totalXp, 1000), // Cap at 1000 XP
  };
}

// Get user's streak info
export async function getStreakInfo(kv: Deno.KvStore, userId: string): Promise<UserStreak> {
  const streakKey = `user_streak:${userId}`;

  try {
    const entry = await kv.get([streakKey]);
    return (entry.value as UserStreak) || {
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

// Use streak freeze (skip 1 day without losing streak)
export async function useStreakFreeze(
  kv: Deno.KvStore,
  userId: string
): Promise<{ success: boolean; message: string; freezesRemaining: number }> {
  const streakKey = `user_streak:${userId}`;

  try {
    const entry = await kv.get([streakKey]);
    const streak = (entry.value as UserStreak) || {
      userId,
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      streakFreezeCount: 3, // Start with 3 per month
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

    await kv.set([streakKey], streak);

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

// Reset streaks daily (call at UTC midnight)
export async function resetBrokenStreaks(kv: Deno.KvStore): Promise<{
  processed: number;
  reset: number;
}> {
  let processed = 0;
  let reset = 0;

  try {
    // Note: In production, this would be a background job
    // For now, we'll just provide the logic
    console.log("Streak reset job would run here at UTC midnight");
    return { processed, reset };
  } catch (error) {
    console.error("Error resetting streaks:", error);
    throw error;
  }
}

// Check if user completed daily challenge today
export async function hasCompletedToday(
  kv: Deno.KvStore,
  userId: string
): Promise<boolean> {
  const today = getTodayDate();
  const completionKey = `daily_completion:${userId}:${today}`;

  try {
    const entry = await kv.get([completionKey]);
    return entry.value !== null;
  } catch (error) {
    console.error("Error checking daily completion:", error);
    return false;
  }
}

// Get daily challenges leaderboard (top performers for the week)
export async function getDailyChallengesLeaderboard(kv: Deno.KvStore): Promise<
  Array<{
    userId: string;
    streakLength: number;
    weeklyCompletions: number;
    totalXpThisWeek: number;
  }>
> {
  // This would aggregate data from user_streak and weekly completions
  // Returning top 50 for now (in production, query database)
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
