import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

interface TimeAttackAnswer {
  questionId: string;
  selectedAnswerIndex: number;
  timeSpentMs: number;
  isCorrect: boolean;
}

interface TimeAttackSession {
  id: string;
  userId: string;
  startedAtMs: number;
  durationMs: number; // 5 minutes = 300000
  questionsCount: number; // Always 10
  answers: TimeAttackAnswer[];
  completedAtMs: number | null;
  finalScore: number | null; // out of 10
  totalXpEarned: number | null;
  speedBonusPercentage: number | null;
  status: "active" | "completed" | "abandoned";
}

interface SpeedMultiplier {
  speedMs: number;
  multiplier: number;
  xpBonus: number;
}

// Time-based XP multiplier lookup table
const SPEED_MULTIPLIERS: SpeedMultiplier[] = [
  { speedMs: 5000, multiplier: 1.5, xpBonus: 0.5 }, // <5s: 1.5x
  { speedMs: 10000, multiplier: 1.2, xpBonus: 0.2 }, // <10s: 1.2x
  { speedMs: 20000, multiplier: 1.0, xpBonus: 0 }, // <20s: 1.0x
  { speedMs: 30000, multiplier: 0.7, xpBonus: -0.3 }, // <30s: 0.7x
  { speedMs: 31000, multiplier: 0, xpBonus: -1.0 }, // Timeout: 0x
];

// Get speed-based multiplier
export function getSpeedMultiplier(timeSpentMs: number): number {
  if (timeSpentMs < 5000) return 1.5;
  if (timeSpentMs < 10000) return 1.2;
  if (timeSpentMs < 20000) return 1.0;
  if (timeSpentMs < 30000) return 0.7;
  return 0; // Timeout
}

// Initialize a time attack session
export async function initializeTimeAttackSession(
  kv: Deno.KvStore,
  userId: string
): Promise<TimeAttackSession> {
  const sessionId = `time_attack_${userId}_${Date.now()}`;

  const session: TimeAttackSession = {
    id: sessionId,
    userId,
    startedAtMs: Date.now(),
    durationMs: 300000, // 5 minutes
    questionsCount: 10,
    answers: [],
    completedAtMs: null,
    finalScore: null,
    totalXpEarned: null,
    speedBonusPercentage: null,
    status: "active",
  };

  try {
    await kv.set([`time_attack_session:${sessionId}`], session, {
      expirationTtl: 3600, // 1 hour TTL
    });

    return session;
  } catch (error) {
    console.error("Error initializing time attack session:", error);
    throw error;
  }
}

// Record answer in time attack session
export async function recordTimeAttackAnswer(
  kv: Deno.KvStore,
  sessionId: string,
  answer: TimeAttackAnswer
): Promise<{ success: boolean; sessionStatus: string; message: string }> {
  try {
    const sessionEntry = await kv.get([`time_attack_session:${sessionId}`]);
    if (!sessionEntry.value) {
      return {
        success: false,
        sessionStatus: "not_found",
        message: "Session not found",
      };
    }

    const session = sessionEntry.value as TimeAttackSession;

    // Check if session is still active
    if (session.status !== "active") {
      return {
        success: false,
        sessionStatus: "inactive",
        message: "Session is no longer active",
      };
    }

    // Check if time limit exceeded
    const elapsedMs = Date.now() - session.startedAtMs;
    if (elapsedMs > session.durationMs) {
      session.status = "completed";
      session.completedAtMs = Date.now();
      await kv.set([`time_attack_session:${sessionId}`], session);

      return {
        success: false,
        sessionStatus: "time_expired",
        message: "Time limit exceeded",
      };
    }

    // Add answer
    session.answers.push(answer);

    // Check if all questions answered
    if (session.answers.length >= session.questionsCount) {
      session.status = "completed";
      session.completedAtMs = Date.now();
    }

    await kv.set([`time_attack_session:${sessionId}`], session, {
      expirationTtl: 3600,
    });

    return {
      success: true,
      sessionStatus: session.status,
      message: `Answer recorded (${session.answers.length}/${session.questionsCount})`,
    };
  } catch (error) {
    console.error("Error recording time attack answer:", error);
    throw error;
  }
}

// Complete time attack session and calculate results
export async function completeTimeAttackSession(
  kv: Deno.KvStore,
  sessionId: string
): Promise<{
  success: boolean;
  results: {
    score: number;
    accuracy: number;
    totalXp: number;
    speedBonus: number;
    averageTimePerQuestion: number;
    answerDetails: Array<{
      questionId: string;
      timeSpentMs: number;
      isCorrect: boolean;
      speedMultiplier: number;
      xpEarned: number;
    }>;
  };
}> {
  try {
    const sessionEntry = await kv.get([`time_attack_session:${sessionId}`]);
    if (!sessionEntry.value) {
      return {
        success: false,
        results: {
          score: 0,
          accuracy: 0,
          totalXp: 0,
          speedBonus: 0,
          averageTimePerQuestion: 0,
          answerDetails: [],
        },
      };
    }

    const session = sessionEntry.value as TimeAttackSession;

    // Calculate metrics
    const correctAnswers = session.answers.filter((a) => a.isCorrect).length;
    const totalAnswers = session.answers.length;
    const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

    let totalXp = 0;
    let totalSpeedBonus = 0;
    const answerDetails = session.answers.map((answer) => {
      const baseXp = 30; // Base XP per correct answer in time attack
      const speedMultiplier = getSpeedMultiplier(answer.timeSpentMs);
      const xpEarned = answer.isCorrect ? Math.floor(baseXp * speedMultiplier) : 0;

      totalXp += xpEarned;
      if (speedMultiplier > 1) {
        totalSpeedBonus += xpEarned * (speedMultiplier - 1);
      }

      return {
        questionId: answer.questionId,
        timeSpentMs: answer.timeSpentMs,
        isCorrect: answer.isCorrect,
        speedMultiplier: Math.round(speedMultiplier * 100) / 100,
        xpEarned,
      };
    });

    const averageTimePerQuestion =
      totalAnswers > 0
        ? session.answers.reduce((sum, a) => sum + a.timeSpentMs, 0) /
          totalAnswers
        : 0;

    // Update session with results
    session.finalScore = correctAnswers;
    session.totalXpEarned = totalXp;
    session.speedBonusPercentage =
      totalAnswers > 0 ? (totalSpeedBonus / totalXp) * 100 : 0;
    session.status = "completed";
    session.completedAtMs = Date.now();

    await kv.set([`time_attack_session:${sessionId}`], session);

    // Store result for leaderboard
    const resultKey = `time_attack_result:${session.userId}:${Date.now()}`;
    await kv.set([resultKey], {
      userId: session.userId,
      sessionId,
      score: correctAnswers,
      accuracy,
      totalXp,
      speedBonus: totalSpeedBonus,
      completedAt: new Date().toISOString(),
      weekNumber: getWeekNumber(new Date()),
    });

    return {
      success: true,
      results: {
        score: correctAnswers,
        accuracy: Math.round(accuracy * 100) / 100,
        totalXp,
        speedBonus: totalSpeedBonus,
        averageTimePerQuestion: Math.round(averageTimePerQuestion),
        answerDetails,
      },
    };
  } catch (error) {
    console.error("Error completing time attack session:", error);
    return {
      success: false,
      results: {
        score: 0,
        accuracy: 0,
        totalXp: 0,
        speedBonus: 0,
        averageTimePerQuestion: 0,
        answerDetails: [],
      },
    };
  }
}

// Get time attack session
export async function getTimeAttackSession(
  kv: Deno.KvStore,
  sessionId: string
): Promise<TimeAttackSession | null> {
  try {
    const entry = await kv.get([`time_attack_session:${sessionId}`]);
    return (entry.value as TimeAttackSession) || null;
  } catch (error) {
    console.error("Error getting time attack session:", error);
    return null;
  }
}

// Get user's time attack stats
export async function getUserTimeAttackStats(
  kv: Deno.KvStore,
  userId: string
): Promise<{
  totalGames: number;
  bestScore: number;
  averageScore: number;
  totalXp: number;
  personalBest: number;
  weeklyRank: number;
}> {
  // This would query all time_attack_result entries for user
  // For now, returning structure
  return {
    totalGames: 0,
    bestScore: 0,
    averageScore: 0,
    totalXp: 0,
    personalBest: 0,
    weeklyRank: 0,
  };
}

// Get weekly time attack leaderboard
export async function getWeeklyTimeAttackLeaderboard(kv: Deno.KvStore): Promise<
  Array<{
    rank: number;
    userId: string;
    userName: string;
    totalScore: number;
    gamesThisWeek: number;
    averageSpeed: number;
    weeklyXp: number;
  }>
> {
  // This would aggregate weekly results
  // Returning top 50 for now
  return [];
}

// Get monthly time attack leaderboard
export async function getMonthlyTimeAttackLeaderboard(kv: Deno.KvStore): Promise<
  Array<{
    rank: number;
    userId: string;
    userName: string;
    bestScore: number;
    totalGames: number;
    personalBestTime: number;
    monthlyXp: number;
  }>
> {
  // This would aggregate monthly results
  return [];
}

// Helper: Get week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default {
  initializeTimeAttackSession,
  recordTimeAttackAnswer,
  completeTimeAttackSession,
  getTimeAttackSession,
  getUserTimeAttackStats,
  getWeeklyTimeAttackLeaderboard,
  getMonthlyTimeAttackLeaderboard,
  getSpeedMultiplier,
};
