import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

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
  winner: string | null; // userId of winner or null if tie
  completedAt: number | null;
}

interface TriviaBattle {
  id: string;
  player1: BattleParticipant;
  player2: BattleParticipant;
  totalRounds: number; // Usually 5 questions
  currentRound: number;
  rounds: BattleRound[];
  status: "pending" | "active" | "completed";
  createdAtMs: number;
  startedAtMs: number | null;
  completedAtMs: number | null;
  winner: string | null; // userId
  inviteCode: string | null; // For friend challenges
}

interface BattleInvite {
  inviteCode: string;
  fromUserId: string;
  toUserId: string | null; // null if public invite
  battleId: string;
  createdAtMs: number;
  expiresAtMs: number;
  status: "pending" | "accepted" | "rejected" | "expired";
}

// Generate random invite code (4 chars)
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Find or create a battle (auto-match or friend challenge)
export async function initiateNewBattle(
  kv: Deno.KvStore,
  userId: string,
  userName: string,
  userLevel: number,
  battleMode: "random" | "friend_challenge" = "random",
  targetUserId?: string
): Promise<{
  success: boolean;
  battle?: TriviaBattle;
  waitingForOpponent?: boolean;
  inviteCode?: string;
  message: string;
}> {
  const battleId = `battle_${userId}_${Date.now()}`;

  try {
    // Check if user already has a pending battle
    const existingKey = `user_pending_battle:${userId}`;
    const existing = await kv.get([existingKey]);
    if (existing.value) {
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

    if (battleMode === "friend_challenge" && targetUserId) {
      // Create invite for friend
      const inviteCode = generateInviteCode();
      const invite: BattleInvite = {
        inviteCode,
        fromUserId: userId,
        toUserId: targetUserId,
        battleId,
        createdAtMs: Date.now(),
        expiresAtMs: Date.now() + 3600000, // 1 hour expiry
        status: "pending",
      };

      await kv.set([`battle_invite:${inviteCode}`], invite, { expirationTtl: 3600 });

      return {
        success: true,
        waitingForOpponent: true,
        inviteCode,
        message: `Invite sent! Share code ${inviteCode} with your friend.`,
      };
    }

    // Random matchmaking
    // Look for someone else waiting
    const waitingListKey = `battle_waiting_list:${userLevel}`;
    const waitingEntry = await kv.get([waitingListKey]);
    let opponent: BattleParticipant | null = null;

    if (waitingEntry.value) {
      const waitingBattle = waitingEntry.value as {
        battleId: string;
        participant: BattleParticipant;
      };

      // Check if it's not stale (older than 5 minutes)
      const existingBattle = await kv.get([`battle:${waitingBattle.battleId}`]);
      if (existingBattle.value) {
        const battle = existingBattle.value as TriviaBattle;
        if (Date.now() - battle.createdAtMs < 300000) {
          opponent = waitingBattle.participant;
        }
      }
    }

    if (!opponent) {
      // No opponent available, add to waiting list
      const battle: TriviaBattle = {
        id: battleId,
        player1: participant,
        player2: null as any, // Will be populated when opponent joins
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

      await kv.set([`battle:${battleId}`], battle, { expirationTtl: 600 }); // 10 min TTL
      await kv.set(
        [waitingListKey],
        { battleId, participant },
        { expirationTtl: 600 }
      );
      await kv.set([existingKey], { battleId });

      return {
        success: true,
        waitingForOpponent: true,
        message: "Searching for opponent...",
      };
    }

    // Create battle with both players
    const battle: TriviaBattle = {
      id: battleId,
      player1: participant,
      player2: opponent,
      totalRounds: 5,
      currentRound: 0,
      rounds: [],
      status: "active",
      createdAtMs: Date.now(),
      startedAtMs: Date.now(),
      completedAtMs: null,
      winner: null,
      inviteCode: null,
    };

    await kv.set([`battle:${battleId}`], battle, { expirationTtl: 1800 }); // 30 min
    await kv.set([existingKey], { battleId });
    await kv.set([`user_pending_battle:${opponent.userId}`], { battleId });

    // Remove from waiting list
    await kv.delete([waitingListKey]);

    return {
      success: true,
      battle,
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

// Accept friend invite
export async function acceptBattleInvite(
  kv: Deno.KvStore,
  userId: string,
  userName: string,
  userLevel: number,
  inviteCode: string
): Promise<{
  success: boolean;
  battle?: TriviaBattle;
  message: string;
}> {
  try {
    const inviteEntry = await kv.get([`battle_invite:${inviteCode}`]);
    if (!inviteEntry.value) {
      return {
        success: false,
        message: "Invalid or expired invite code",
      };
    }

    const invite = inviteEntry.value as BattleInvite;

    if (invite.status !== "pending") {
      return {
        success: false,
        message: "This invite has already been used",
      };
    }

    if (invite.expiresAtMs < Date.now()) {
      invite.status = "expired";
      await kv.set([`battle_invite:${inviteCode}`], invite);
      return {
        success: false,
        message: "Invite has expired",
      };
    }

    // Get the battle
    const battleEntry = await kv.get([`battle:${invite.battleId}`]);
    if (!battleEntry.value) {
      return {
        success: false,
        message: "Battle not found",
      };
    }

    const battle = battleEntry.value as TriviaBattle;

    // Add as player2
    battle.player2 = {
      userId,
      userName,
      userLevel,
      score: 0,
      answeredQuestions: 0,
      averageSpeed: 0,
      currentQuestion: 0,
    };

    battle.status = "active";
    battle.startedAtMs = Date.now();

    // Update invite status
    invite.status = "accepted";
    await kv.set([`battle_invite:${inviteCode}`], invite);

    // Save battle
    await kv.set([`battle:${battle.id}`], battle);
    await kv.set([`user_pending_battle:${userId}`], { battleId: battle.id });

    return {
      success: true,
      battle,
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

// Record answer in battle
export async function recordBattleAnswer(
  kv: Deno.KvStore,
  battleId: string,
  userId: string,
  questionIndex: number,
  answer: number,
  timeMs: number,
  isCorrect: boolean
): Promise<{
  success: boolean;
  opponentAnswered: boolean;
  roundComplete: boolean;
  message: string;
}> {
  try {
    const battleEntry = await kv.get([`battle:${battleId}`]);
    if (!battleEntry.value) {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Battle not found",
      };
    }

    const battle = battleEntry.value as TriviaBattle;

    if (battle.status !== "active") {
      return {
        success: false,
        opponentAnswered: false,
        roundComplete: false,
        message: "Battle is not active",
      };
    }

    // Determine which player is answering
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

    // Get or create current round
    let currentRound = battle.rounds[battle.currentRound];
    if (!currentRound) {
      currentRound = {
        roundNumber: battle.currentRound,
        question: null as any,
        player1Answer: null,
        player2Answer: null,
        winner: null,
        completedAt: null,
      };
      battle.rounds.push(currentRound);
    }

    // Record answer
    const playerAnswer = { answer, timeMs, isCorrect };

    if (isPlayer1) {
      currentRound.player1Answer = playerAnswer;
      battle.player1.answeredQuestions += 1;
    } else {
      currentRound.player2Answer = playerAnswer;
      battle.player2.answeredQuestions += 1;
    }

    // Check if round is complete (both players answered)
    const roundComplete =
      currentRound.player1Answer !== null && currentRound.player2Answer !== null;

    if (roundComplete) {
      // Determine round winner
      const p1Correct = currentRound.player1Answer.isCorrect;
      const p2Correct = currentRound.player2Answer.isCorrect;

      if (p1Correct && !p2Correct) {
        currentRound.winner = battle.player1.userId;
        battle.player1.score += 1;
      } else if (!p1Correct && p2Correct) {
        currentRound.winner = battle.player2.userId;
        battle.player2.score += 1;
      } else if (p1Correct && p2Correct) {
        // Both correct - faster wins
        if (currentRound.player1Answer.timeMs < currentRound.player2Answer.timeMs) {
          currentRound.winner = battle.player1.userId;
          battle.player1.score += 1;
        } else {
          currentRound.winner = battle.player2.userId;
          battle.player2.score += 1;
        }
      }
      // If both wrong or tie on time, no point awarded

      currentRound.completedAt = Date.now();

      // Check if battle complete
      if (battle.currentRound >= battle.totalRounds - 1) {
        battle.status = "completed";
        battle.completedAtMs = Date.now();

        // Determine overall winner
        if (battle.player1.score > battle.player2.score) {
          battle.winner = battle.player1.userId;
        } else if (battle.player2.score > battle.player1.score) {
          battle.winner = battle.player2.userId;
        }
        // If tie, winner = null

        // Store battle result
        await kv.set([`battle_result:${battleId}`], battle);
        await kv.delete([`user_pending_battle:${battle.player1.userId}`]);
        await kv.delete([`user_pending_battle:${battle.player2.userId}`]);
      } else {
        // Advance to next round
        battle.currentRound += 1;
      }
    }

    await kv.set([`battle:${battleId}`], battle, { expirationTtl: 1800 });

    return {
      success: true,
      opponentAnswered: isPlayer1 ? currentRound.player2Answer !== null : currentRound.player1Answer !== null,
      roundComplete,
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

// Get battle status (for real-time updates)
export async function getBattleStatus(
  kv: Deno.KvStore,
  battleId: string
): Promise<TriviaBattle | null> {
  try {
    const entry = await kv.get([`battle:${battleId}`]);
    return (entry.value as TriviaBattle) || null;
  } catch (error) {
    console.error("Error getting battle status:", error);
    return null;
  }
}

// Get battle leaderboard (weekly)
export async function getWeeklyBattleLeaderboard(kv: Deno.KvStore): Promise<
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
  // This would aggregate battle results for the week
  return [];
}

// Get user's battle stats
export async function getUserBattleStats(
  kv: Deno.KvStore,
  userId: string
): Promise<{
  totalBattles: number;
  wins: number;
  losses: number;
  winRate: number;
  rating: number;
}> {
  // This would query all completed battles for user
  return {
    totalBattles: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    rating: 1000, // Elo-like rating
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
