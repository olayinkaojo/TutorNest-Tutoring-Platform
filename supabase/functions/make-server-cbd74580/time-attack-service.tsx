import * as kv from "./kv_store.tsx";

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
  durationMs: number;
  questionsCount: number;
  answers: TimeAttackAnswer[];
  completedAtMs: number | null;
  finalScore: number | null;
  totalXpEarned: number | null;
  speedBonusPercentage: number | null;
  status: "active" | "completed" | "abandoned";
}

export function getSpeedMultiplier(timeSpentMs: number): number {
  if (timeSpentMs < 5000) return 1.5;
  if (timeSpentMs < 10000) return 1.2;
  if (timeSpentMs < 20000) return 1.0;
  if (timeSpentMs < 30000) return 0.7;
  return 0;
}

function sessionKey(sessionId: string): string {
  return `time_attack_session:${sessionId}`;
}

export async function initializeTimeAttackSession(
  userId: string
): Promise<TimeAttackSession> {
  const sessionId = `time_attack_${userId}_${Date.now()}`;

  const session: TimeAttackSession = {
    id: sessionId,
    userId,
    startedAtMs: Date.now(),
    durationMs: 300000,
    questionsCount: 10,
    answers: [],
    completedAtMs: null,
    finalScore: null,
    totalXpEarned: null,
    speedBonusPercentage: null,
    status: "active",
  };

  await kv.set(sessionKey(sessionId), session);
  return session;
}

export async function recordTimeAttackAnswer(
  sessionId: string,
  answer: TimeAttackAnswer
): Promise<{ success: boolean; sessionStatus: string; message: string }> {
  const raw = await kv.get(sessionKey(sessionId));
  if (raw == null) {
    return {
      success: false,
      sessionStatus: "not_found",
      message: "Session not found",
    };
  }

  const session = raw as TimeAttackSession;

  if (session.status !== "active") {
    return {
      success: false,
      sessionStatus: "inactive",
      message: "Session is no longer active",
    };
  }

  const elapsedMs = Date.now() - session.startedAtMs;
  if (elapsedMs > session.durationMs) {
    session.status = "completed";
    session.completedAtMs = Date.now();
    await kv.set(sessionKey(sessionId), session);

    return {
      success: false,
      sessionStatus: "time_expired",
      message: "Time limit exceeded",
    };
  }

  session.answers.push(answer);

  if (session.answers.length >= session.questionsCount) {
    session.status = "completed";
    session.completedAtMs = Date.now();
  }

  await kv.set(sessionKey(sessionId), session);

  return {
    success: true,
    sessionStatus: session.status,
    message: `Answer recorded (${session.answers.length}/${session.questionsCount})`,
  };
}

export async function completeTimeAttackSession(sessionId: string): Promise<{
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
  const raw = await kv.get(sessionKey(sessionId));
  if (raw == null) {
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

  const session = raw as TimeAttackSession;

  const correctAnswers = session.answers.filter((a) => a.isCorrect).length;
  const totalAnswers = session.answers.length;
  const accuracy = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

  let totalXp = 0;
  let totalSpeedBonus = 0;
  const answerDetails = session.answers.map((answer) => {
    const baseXp = 30;
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
      ? session.answers.reduce((sum, a) => sum + a.timeSpentMs, 0) / totalAnswers
      : 0;

  session.finalScore = correctAnswers;
  session.totalXpEarned = totalXp;
  session.speedBonusPercentage =
    totalAnswers > 0 ? (totalSpeedBonus / totalXp) * 100 : 0;
  session.status = "completed";
  session.completedAtMs = Date.now();

  await kv.set(sessionKey(sessionId), session);

  const resultKey = `time_attack_result:${session.userId}:${Date.now()}`;
  await kv.set(resultKey, {
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
}

export async function getTimeAttackSession(
  sessionId: string
): Promise<TimeAttackSession | null> {
  const raw = await kv.get(sessionKey(sessionId));
  return (raw as TimeAttackSession) || null;
}

export async function getUserTimeAttackStats(_userId: string): Promise<{
  totalGames: number;
  bestScore: number;
  averageScore: number;
  totalXp: number;
  personalBest: number;
  weeklyRank: number;
}> {
  return {
    totalGames: 0,
    bestScore: 0,
    averageScore: 0,
    totalXp: 0,
    personalBest: 0,
    weeklyRank: 0,
  };
}

export async function getWeeklyTimeAttackLeaderboard(): Promise<
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
  return [];
}

export async function getMonthlyTimeAttackLeaderboard(): Promise<
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
  return [];
}

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
