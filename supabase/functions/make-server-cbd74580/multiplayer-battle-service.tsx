import * as kv from "./kv_store.tsx";

interface BattleParticipant {
  userId: string;
  userName: string;
  userLevel: number;
  score: number;
  answeredQuestions: number;
  averageSpeed: number;
  currentQuestion: number;
}

interface BattleQuestion {
  questionId: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

interface BattleRound {
  roundNumber: number;
  question: BattleQuestion;
  player1Answer: { answer: number; timeMs: number; isCorrect: boolean } | null;
  player2Answer: { answer: number; timeMs: number; isCorrect: boolean } | null;
  winner: string | null;
  completedAt: number | null;
}

interface TriviaBattle {
  id: string;
  player1: BattleParticipant;
  player2: BattleParticipant | null;
  totalRounds: number;
  currentRound: number;
  rounds: BattleRound[];
  status: "pending" | "active" | "completed";
  createdAtMs: number;
  startedAtMs: number | null;
  completedAtMs: number | null;
  winner: string | null;
  inviteCode: string | null;
}

interface BattleInvite {
  inviteCode: string;
  fromUserId: string;
  toUserId: string | null;
  battleId: string;
  createdAtMs: number;
  expiresAtMs: number;
  status: "pending" | "accepted" | "rejected" | "expired";
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function battleKey(id: string): string {
  return `battle:${id}`;
}

/** Load trivia rounds (correct indices stored server-side only). */
export async function seedBattleRounds(
  battle: TriviaBattle,
  grade: string = "year_5"
): Promise<void> {
  const mod = await import("./comprehensive-trivia-data.tsx");
  const bank = mod.COMPREHENSIVE_TRIVIA as Record<
    string,
    Record<string, unknown[]>
  >;
  const subjects = bank[grade] ?? bank["year_5"];
  if (!subjects) {
    battle.rounds = [];
    return;
  }
  const flat = Object.values(subjects).flat() as Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer?: number;
    correctAnswerIndex?: number;
  }>;
  const shuffled = [...flat].sort(() => Math.random() - 0.5);
  const n = Math.min(battle.totalRounds, shuffled.length);
  const picks = shuffled.slice(0, n);

  battle.rounds = picks.map((q, i) => {
    const correct =
      typeof q.correctAnswer === "number"
        ? q.correctAnswer
        : typeof q.correctAnswerIndex === "number"
          ? q.correctAnswerIndex
          : 0;
    return {
      roundNumber: i,
      question: {
        questionId: q.id,
        question: q.question,
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswerIndex: correct,
      },
      player1Answer: null,
      player2Answer: null,
      winner: null,
      completedAt: null,
    };
  });
}

export async function initiateNewBattle(
  userId: string,
  userName: string,
  userLevel: number,
  battleMode: "random" | "friend_challenge" = "random",
  targetUserId?: string,
  grade: string = "year_5"
): Promise<{
  success: boolean;
  battle?: TriviaBattle;
  battleId?: string;
  waitingForOpponent?: boolean;
  inviteCode?: string;
  message: string;
}> {
  const battleId = `battle_${userId}_${Date.now()}`;

  try {
    const existingKey = `user_pending_battle:${userId}`;
    const existing = await kv.get(existingKey);
    if (existing != null) {
      return {
        success: false,
        message: "You already have an active battle. Complete it first!",
      };
    }

    const participant: BattleParticipant = {
      userId,
      userName,
      userLevel,
      score: 0,
      answeredQuestions: 0,
      averageSpeed: 0,
      currentQuestion: 0,
    };

    if (battleMode === "friend_challenge") {
      const inviteCode = generateInviteCode();
      const battle: TriviaBattle = {
        id: battleId,
        player1: participant,
        player2: null,
        totalRounds: 5,
        currentRound: 0,
        rounds: [],
        status: "pending",
        createdAtMs: Date.now(),
        startedAtMs: null,
        completedAtMs: null,
        winner: null,
        inviteCode,
      };

      const invite: BattleInvite = {
        inviteCode,
        fromUserId: userId,
        toUserId: targetUserId ?? null,
        battleId,
        createdAtMs: Date.now(),
        expiresAtMs: Date.now() + 3600000,
        status: "pending",
      };

      await kv.set(battleKey(battleId), battle);
      await kv.set(`battle_invite:${inviteCode}`, invite);
      await kv.set(existingKey, { battleId });

      return {
        success: true,
        waitingForOpponent: true,
        inviteCode,
        battleId,
        message: `Invite sent! Share code ${inviteCode} with your friend.`,
      };
    }

    const waitingListKey = `battle_waiting_list:${userLevel}`;
    const waitingEntry = await kv.get(waitingListKey);
    let opponent: BattleParticipant | null = null;

    if (waitingEntry != null) {
      const waitingBattle = waitingEntry as {
        battleId: string;
        participant: BattleParticipant;
      };

      const existingBattleRaw = await kv.get(battleKey(waitingBattle.battleId));
      if (existingBattleRaw != null) {
        const battle = existingBattleRaw as TriviaBattle;
        if (Date.now() - battle.createdAtMs < 300000) {
          opponent = waitingBattle.participant;
        }
      }
    }

    if (!opponent) {
      const battle: TriviaBattle = {
        id: battleId,
        player1: participant,
        player2: null,
        totalRounds: 5,
        currentRound: 0,
        rounds: [],
        status: "pending",
        createdAtMs: Date.now(),
        startedAtMs: null,
        completedAtMs: null,
        winner: null,
        inviteCode: null,
      };

      await kv.set(battleKey(battleId), battle);
      await kv.set(waitingListKey, { battleId, participant });
      await kv.set(existingKey, { battleId });

      return {
        success: true,
        waitingForOpponent: true,
        battleId,
        message: "Searching for opponent...",
      };
    }

    const openBattleId = (waitingEntry as { battleId: string; participant: BattleParticipant }).battleId;
    const openRaw = await kv.get(battleKey(openBattleId));
    if (openRaw == null) {
      await kv.del(waitingListKey);
      return {
        success: false,
        message: "Match expired — try again",
      };
    }

    const openBattle = openRaw as TriviaBattle;
    openBattle.player2 = participant;
    openBattle.status = "active";
    openBattle.startedAtMs = Date.now();
    await seedBattleRounds(openBattle, grade);

    await kv.set(battleKey(openBattleId), openBattle);
    await kv.set(existingKey, { battleId: openBattleId });
    await kv.set(`user_pending_battle:${openBattle.player1.userId}`, {
      battleId: openBattleId,
    });
    await kv.del(waitingListKey);

    return {
      success: true,
      battle: openBattle,
      battleId: openBattleId,
      message: "Battle started!",
    };
  } catch (error) {
    console.error("Error initiating battle:", error);
    return {
      success: false,
      message: "Error creating battle",
    };
  }
}

export async function acceptBattleInvite(
  userId: string,
  userName: string,
  inviteCode: string
): Promise<{
  success: boolean;
  battle?: TriviaBattle;
  battleId?: string;
  message: string;
}> {
  try {
    const inviteRaw = await kv.get(`battle_invite:${inviteCode}`);
    if (inviteRaw == null) {
      return {
        success: false,
        message: "Invalid or expired invite code",
      };
    }

    const invite = inviteRaw as BattleInvite;

    if (invite.status !== "pending") {
      return {
        success: false,
        message: "This invite has already been used",
      };
    }

    if (invite.expiresAtMs < Date.now()) {
      invite.status = "expired";
      await kv.set(`battle_invite:${inviteCode}`, invite);
      return {
        success: false,
        message: "Invite has expired",
      };
    }

    const battleRaw = await kv.get(battleKey(invite.battleId));
    if (battleRaw == null) {
      return {
        success: false,
        message: "Battle not found",
      };
    }

    const battle = battleRaw as TriviaBattle;

    battle.player2 = {
      userId,
      userName,
      userLevel: 1,
      score: 0,
      answeredQuestions: 0,
      averageSpeed: 0,
      currentQuestion: 0,
    };

    battle.status = "active";
    battle.startedAtMs = Date.now();

    await seedBattleRounds(battle, "year_5");

    invite.status = "accepted";
    await kv.set(`battle_invite:${inviteCode}`, invite);
    await kv.set(battleKey(battle.id), battle);
    await kv.set(`user_pending_battle:${userId}`, { battleId: battle.id });

    return {
      success: true,
      battle,
      battleId: battle.id,
      message: "Battle started!",
    };
  } catch (error) {
    console.error("Error accepting invite:", error);
    return {
      success: false,
      message: "Error accepting invite",
    };
  }
}

export async function recordBattleAnswer(
  battleId: string,
  userId: string,
  questionIndex: number,
  answer: number,
  timeMs: number
): Promise<{
  success: boolean;
  opponentAnswered: boolean;
  roundComplete: boolean;
  battleComplete?: boolean;
  message: string;
}> {
  try {
    const battleRaw = await kv.get(battleKey(battleId));
    if (battleRaw == null) {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Battle not found",
      };
    }

    const battle = battleRaw as TriviaBattle;

    if (battle.status !== "active") {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Battle is not active",
      };
    }

    if (!battle.player2) {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Waiting for opponent",
      };
    }

    const isPlayer1 = battle.player1.userId === userId;
    const isPlayer2 = battle.player2.userId === userId;

    if (!isPlayer1 && !isPlayer2) {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "You are not in this battle",
      };
    }

    if (questionIndex !== battle.currentRound) {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Invalid round",
      };
    }

    const currentRound = battle.rounds[battle.currentRound];
    if (!currentRound?.question) {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Battle not ready",
      };
    }

    if (isPlayer1 && currentRound.player1Answer !== null) {
      return {
        success: false,
        opponentAnswered: currentRound.player2Answer !== null,
        roundComplete: false,
        message: "You already answered this round",
      };
    }
    if (isPlayer2 && currentRound.player2Answer !== null) {
      return {
        success: false,
        opponentAnswered: currentRound.player1Answer !== null,
        roundComplete: false,
        message: "You already answered this round",
      };
    }

    const correctIdx = currentRound.question.correctAnswerIndex;
    const serverIsCorrect =
      typeof correctIdx === "number" &&
      answer === correctIdx;

    const playerAnswer = { answer, timeMs, isCorrect: serverIsCorrect };

    if (isPlayer1) {
      currentRound.player1Answer = playerAnswer;
      battle.player1.answeredQuestions += 1;
    } else {
      currentRound.player2Answer = playerAnswer;
      battle.player2.answeredQuestions += 1;
    }

    const roundComplete =
      currentRound.player1Answer !== null && currentRound.player2Answer !== null;

    if (roundComplete) {
      const p1 = currentRound.player1Answer!;
      const p2 = currentRound.player2Answer!;

      const p1Correct = p1.isCorrect;
      const p2Correct = p2.isCorrect;

      if (p1Correct && !p2Correct) {
        currentRound.winner = battle.player1.userId;
        battle.player1.score += 1;
      } else if (!p1Correct && p2Correct) {
        currentRound.winner = battle.player2!.userId;
        battle.player2!.score += 1;
      } else if (p1Correct && p2Correct) {
        if (p1.timeMs < p2.timeMs) {
          currentRound.winner = battle.player1.userId;
          battle.player1.score += 1;
        } else {
          currentRound.winner = battle.player2!.userId;
          battle.player2!.score += 1;
        }
      }

      currentRound.completedAt = Date.now();

      let battleComplete = false;
      if (battle.currentRound >= battle.totalRounds - 1) {
        battle.status = "completed";
        battle.completedAtMs = Date.now();
        battleComplete = true;

        if (battle.player1.score > battle.player2!.score) {
          battle.winner = battle.player1.userId;
        } else if (battle.player2!.score > battle.player1.score) {
          battle.winner = battle.player2!.userId;
        }

        await kv.set(`battle_result:${battleId}`, battle);
        await kv.del(`user_pending_battle:${battle.player1.userId}`);
        await kv.del(`user_pending_battle:${battle.player2!.userId}`);
      } else {
        battle.currentRound += 1;
      }

      await kv.set(battleKey(battleId), battle);

      return {
        success: true,
        opponentAnswered: true,
        roundComplete,
        battleComplete,
        message: battleComplete ? "Battle complete" : "Round complete",
      };
    }

    await kv.set(battleKey(battleId), battle);

    return {
      success: true,
      opponentAnswered: isPlayer1
        ? currentRound.player2Answer !== null
        : currentRound.player1Answer !== null,
      roundComplete,
      battleComplete: false,
      message: roundComplete ? "Round complete" : "Waiting for opponent",
    };
  } catch (error) {
    console.error("Error recording battle answer:", error);
    return {
      success: false,
      opponentAnswered: false,
      roundComplete: false,
      message: "Error recording answer",
    };
  }
}

export async function getBattleStatus(battleId: string): Promise<TriviaBattle | null> {
  try {
    const raw = await kv.get(battleKey(battleId));
    return (raw as TriviaBattle) || null;
  } catch (error) {
    console.error("Error getting battle status:", error);
    return null;
  }
}

export async function getWeeklyBattleLeaderboard(): Promise<
  Array<{
    rank: number;
    userId: string;
    userName: string;
    wins: number;
    losses: number;
    winRate: number;
    rating: number;
  }>
> {
  return [];
}

export async function getUserBattleStats(_userId: string): Promise<{
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  rating: number;
}> {
  return {
    totalBattles: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    rating: 1000,
  };
}

export default {
  initiateNewBattle,
  acceptBattleInvite,
  recordBattleAnswer,
  getBattleStatus,
  getWeeklyBattleLeaderboard,
  getUserBattleStats,
};
