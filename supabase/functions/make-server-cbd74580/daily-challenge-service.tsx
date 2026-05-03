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

/** Stable hash for picking the same question index all day for a given topic */
function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** COMPREHENSIVE_TRIVIA subject keys per daily topic id */
const TOPIC_SUBJECTS: Record<string, string[]> = {
  math: ["Mathematics"],
  english: ["English"],
  science: ["Sciences"],
  history: ["History"],
  art: ["Art"],
  music: ["Music"],
  pe: ["Physical Education"],
};

async function pickQuestionFromBank(
  topicId: string,
  topicLabel: string,
  today: string
): Promise<{
  questionId: string;
  questionLine: string;
  options: string[];
  correctAnswer: number;
  difficulty?: string;
} | null> {
  const mod = await import("./comprehensive-trivia-data.tsx");
  const bank = mod.COMPREHENSIVE_TRIVIA as Record<
    string,
    Record<string, unknown[]>
  >;

  const subjects = TOPIC_SUBJECTS[topicId] ?? ["Mathematics"];
  const gradesToTry = [
    "year_5",
    "year_6",
    "year_7",
    "year_8",
    "year_4",
    "year_3",
    "year_2",
    "year_1",
  ];

  for (const grade of gradesToTry) {
    const yearBlock = bank[grade];
    if (!yearBlock) continue;

    for (const subject of subjects) {
      const pool = yearBlock[subject];
      if (!Array.isArray(pool) || pool.length === 0) continue;

      const idx = hashSeed(`${today}:${topicId}:${grade}:${subject}`) %
        pool.length;
      const raw = pool[idx] as {
        id: string;
        question: string;
        options: string[];
        correctAnswer?: number;
        correctAnswerIndex?: number;
        difficulty?: string;
      };

      const correct =
        typeof raw.correctAnswer === "number"
          ? raw.correctAnswer
          : typeof raw.correctAnswerIndex === "number"
            ? raw.correctAnswerIndex
            : 0;

      return {
        questionId: raw.id,
        questionLine: `Today's Challenge (${topicLabel}): ${raw.question}`,
        options: Array.isArray(raw.options) ? raw.options : [],
        correctAnswer: correct,
        difficulty: raw.difficulty,
      };
    }
  }

  return null;
}

export async function generateDailyChallenge(): Promise<DailyChallenge> {
  const today = getTodayDate();
  const cacheKey = `daily_challenge:v3:${today}`;

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

    const dayOfWeek = new Date(`${today}T12:00:00Z`).getUTCDay();
    const selectedTopic = topics[dayOfWeek % topics.length];

    const picked = await pickQuestionFromBank(
      selectedTopic.id,
      selectedTopic.name,
      today
    );

    let difficultyRank = selectedTopic.difficulty as
      | "easy"
      | "medium"
      | "hard";
    if (
      picked?.difficulty === "easy" ||
      picked?.difficulty === "medium" ||
      picked?.difficulty === "hard"
    ) {
      difficultyRank = picked.difficulty;
    }

    const challenge: DailyChallenge = picked && picked.options.length > 0
      ? {
        id: `daily_${today}`,
        date: today,
        topicId: selectedTopic.id,
        questionId: picked.questionId,
        question: picked.questionLine,
        options: picked.options,
        correctAnswer: picked.correctAnswer,
        difficulty: difficultyRank,
        baseXpReward: 200,
      }
      : {
        id: `daily_${today}`,
        date: today,
        topicId: selectedTopic.id,
        questionId: `daily_${today}_fallback`,
        question:
          `Today's Challenge (${selectedTopic.name}): Which number comes after 4?`,
        options: ["3", "5", "6", "7"],
        correctAnswer: 1,
        difficulty: difficultyRank,
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
