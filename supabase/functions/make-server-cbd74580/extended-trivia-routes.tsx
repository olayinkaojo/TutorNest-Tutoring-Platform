import { Hono } from "npm:hono";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import * as dailyChallengeService from "./daily-challenge-service.tsx";
import * as timeAttackService from "./time-attack-service.tsx";
import * as multiplayerBattleService from "./multiplayer-battle-service.tsx";
import { COMPREHENSIVE_TRIVIA } from "./comprehensive-trivia-data.tsx";

const app = new Hono();

// ==================== DAILY CHALLENGES ====================

// Get today's daily challenge
app.get("/daily-challenge", async (c) => {
  try {
    const kvStore = await kv.getKVStore();
    const challenge = await dailyChallengeService.getDailyChallenge(kvStore);

    // Check if user completed it
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    let hasCompleted = false;
    let streakInfo = null;

    if (accessToken) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: userData, error: userError } = await supabase.auth.getUser(
        accessToken
      );

      if (userData?.user) {
        hasCompleted = await dailyChallengeService.hasCompletedToday(
          kvStore,
          userData.user.id
        );
        streakInfo = await dailyChallengeService.getStreakInfo(
          kvStore,
          userData.user.id
        );
      }
    }

    return c.json({
      challenge: {
        id: challenge.id,
        date: challenge.date,
        topic: challenge.topicId,
        question: challenge.question,
        options: challenge.options,
        difficulty: challenge.difficulty,
        baseXpReward: challenge.baseXpReward,
      },
      hasCompleted,
      streakInfo,
    });
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
    return c.json({ error: "Failed to fetch daily challenge" }, 500);
  }
});

// Submit daily challenge answer
app.post("/daily-challenge/submit", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { isCorrect } = await c.req.json();
    const kvStore = await kv.getKVStore();

    const result = await dailyChallengeService.recordDailyCompletion(
      kvStore,
      userData.user.id,
      isCorrect
    );

    if (!result.success) {
      return c.json({ ...result }, 200);
    }

    // Award XP to user
    // TODO: Integrate with gamification/user stats system
    // await updateUserXP(userData.user.id, result.xpReward.totalXp);

    return c.json({
      success: true,
      message: result.message,
      xpReward: result.xpReward,
      streakInfo: result.streakInfo,
    });
  } catch (error) {
    console.error("Error submitting daily challenge:", error);
    return c.json({ error: "Failed to submit daily challenge" }, 500);
  }
});

// Get user's streak info
app.get("/daily-challenge/streak", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const kvStore = await kv.getKVStore();
    const streakInfo = await dailyChallengeService.getStreakInfo(
      kvStore,
      userData.user.id
    );

    return c.json({ streakInfo });
  } catch (error) {
    console.error("Error fetching streak info:", error);
    return c.json({ error: "Failed to fetch streak info" }, 500);
  }
});

// Use streak freeze
app.post("/daily-challenge/use-freeze", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const kvStore = await kv.getKVStore();
    const result = await dailyChallengeService.useStreakFreeze(
      kvStore,
      userData.user.id
    );

    return c.json(result);
  } catch (error) {
    console.error("Error using streak freeze:", error);
    return c.json({ error: "Failed to use streak freeze" }, 500);
  }
});

// ==================== TIME ATTACK MODE ====================

// Initialize time attack session
app.post("/time-attack/start", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const kvStore = await kv.getKVStore();
    const session = await timeAttackService.initializeTimeAttackSession(
      kvStore,
      userData.user.id
    );

    // Fetch 10 random questions
    const grade = c.req.query("grade") || "year_5";
    const allQuestions =
      COMPREHENSIVE_TRIVIA[grade as keyof typeof COMPREHENSIVE_TRIVIA];

    if (!allQuestions) {
      return c.json({ error: "Grade not found" }, 404);
    }

    // Collect all questions from all subjects
    const allQuestionsFlattened = Object.values(allQuestions).flat();
    const shuffled = [...allQuestionsFlattened].sort(
      () => Math.random() - 0.5
    );
    const selectedQuestions = shuffled.slice(0, 10);

    return c.json({
      sessionId: session.id,
      durationSeconds: 300,
      totalQuestions: 10,
      questions: selectedQuestions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
      })),
    });
  } catch (error) {
    console.error("Error starting time attack:", error);
    return c.json({ error: "Failed to start time attack" }, 500);
  }
});

// Record time attack answer
app.post("/time-attack/:sessionId/answer", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sessionId = c.req.param("sessionId");
    const { questionId, answerIndex, timeSpentMs, isCorrect } = await c.req.json();

    const kvStore = await kv.getKVStore();
    const result = await timeAttackService.recordTimeAttackAnswer(
      kvStore,
      sessionId,
      questionId,
      { questionId, selectedAnswerIndex: answerIndex, timeSpentMs, isCorrect }
    );

    return c.json(result);
  } catch (error) {
    console.error("Error recording time attack answer:", error);
    return c.json({ error: "Failed to record answer" }, 500);
  }
});

// Complete time attack session
app.post("/time-attack/:sessionId/complete", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sessionId = c.req.param("sessionId");
    const kvStore = await kv.getKVStore();
    const result = await timeAttackService.completeTimeAttackSession(
      kvStore,
      sessionId
    );

    return c.json(result);
  } catch (error) {
    console.error("Error completing time attack:", error);
    return c.json({ error: "Failed to complete time attack" }, 500);
  }
});

// Get time attack leaderboard (weekly)
app.get("/time-attack/leaderboard/weekly", async (c) => {
  try {
    const kvStore = await kv.getKVStore();
    const leaderboard = await timeAttackService.getWeeklyTimeAttackLeaderboard(kvStore);

    return c.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching time attack leaderboard:", error);
    return c.json({ error: "Failed to fetch leaderboard" }, 500);
  }
});

// ==================== MULTIPLAYER BATTLES ====================

// Initiate new battle
app.post("/battle/start", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { battleMode = "random", targetUserId } = await c.req.json();
    const kvStore = await kv.getKVStore();

    // Get user profile for name and level
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", userData.user.id)
      .single();

    const result = await multiplayerBattleService.initiateNewBattle(
      kvStore,
      userData.user.id,
      profile?.full_name || "Student",
      1, // Default level
      battleMode as "random" | "friend_challenge",
      targetUserId
    );

    return c.json(result);
  } catch (error) {
    console.error("Error starting battle:", error);
    return c.json({ error: "Failed to start battle" }, 500);
  }
});

// Accept battle invite
app.post("/battle/accept/:inviteCode", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const inviteCode = c.req.param("inviteCode");
    const kvStore = await kv.getKVStore();

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", userData.user.id)
      .single();

    const result = await multiplayerBattleService.acceptBattleInvite(
      kvStore,
      userData.user.id,
      profile?.full_name || "Student",
      1,
      inviteCode
    );

    return c.json(result);
  } catch (error) {
    console.error("Error accepting battle invite:", error);
    return c.json({ error: "Failed to accept invite" }, 500);
  }
});

// Record battle answer
app.post("/battle/:battleId/answer", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const battleId = c.req.param("battleId");
    const { questionIndex, answerIndex, timeMs, isCorrect } = await c.req.json();

    const kvStore = await kv.getKVStore();
    const result = await multiplayerBattleService.recordBattleAnswer(
      kvStore,
      battleId,
      userData.user.id,
      questionIndex,
      answerIndex,
      timeMs,
      isCorrect
    );

    return c.json(result);
  } catch (error) {
    console.error("Error recording battle answer:", error);
    return c.json({ error: "Failed to record answer" }, 500);
  }
});

// Get battle status
app.get("/battle/:battleId", async (c) => {
  try {
    const battleId = c.req.param("battleId");
    const kvStore = await kv.getKVStore();
    const battle = await multiplayerBattleService.getBattleStatus(kvStore, battleId);

    if (!battle) {
      return c.json({ error: "Battle not found" }, 404);
    }

    return c.json({ battle });
  } catch (error) {
    console.error("Error fetching battle status:", error);
    return c.json({ error: "Failed to fetch battle status" }, 500);
  }
});

// Get battle leaderboard (weekly)
app.get("/battle/leaderboard/weekly", async (c) => {
  try {
    const kvStore = await kv.getKVStore();
    const leaderboard = await multiplayerBattleService.getWeeklyBattleLeaderboard(kvStore);

    return c.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching battle leaderboard:", error);
    return c.json({ error: "Failed to fetch leaderboard" }, 500);
  }
});

export default app;
