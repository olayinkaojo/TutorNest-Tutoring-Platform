/**
 * Extended trivia API under /trivia-extended: daily challenge + time attack (Postgres kv_store).
 */
import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import * as dailyChallengeService from "./daily-challenge-service.tsx";
import * as timeAttackService from "./time-attack-service.tsx";
import { recordDailyChallengeCompletion, recordTimeAttackCompletion } from "./achievement-service.tsx";

const app = new Hono();

app.get("/daily-challenge", async (c) => {
  try {
    const challenge = await dailyChallengeService.getDailyChallenge();

    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    let hasCompleted = false;
    let streakInfo = null;

    if (accessToken) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const { data: userData } = await supabase.auth.getUser(accessToken);

      if (userData?.user) {
        hasCompleted = await dailyChallengeService.hasCompletedToday(
          userData.user.id
        );
        streakInfo = await dailyChallengeService.getStreakInfo(
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

    const body = await c.req.json();
    const challenge = await dailyChallengeService.getDailyChallenge();
    const isCorrect =
      typeof body.answerIndex === "number"
        ? body.answerIndex === challenge.correctAnswer
        : Boolean(body.isCorrect);

    const result = await dailyChallengeService.recordDailyCompletion(
      userData.user.id,
      isCorrect
    );

    if (!result.success) {
      return c.json({ ...result }, 200);
    }

    // Feed the shared achievement system via the dedicated helper that
    // already existed for exactly this (achievement-service.tsx) — it was
    // written but never actually called from anywhere, so a completed
    // daily challenge never reached user:<id>:stats and could never
    // unlock a badge or count toward the Achievements tab.
    const newBadges = await recordDailyChallengeCompletion(
      userData.user.id,
      result.xpReward?.totalXp || 0,
      result.streakInfo?.currentStreak ?? 0,
    );

    return c.json({
      success: true,
      message: result.message,
      xpReward: result.xpReward,
      streakInfo: result.streakInfo,
      newBadges,
    });
  } catch (error) {
    console.error("Error submitting daily challenge:", error);
    return c.json({ error: "Failed to submit daily challenge" }, 500);
  }
});

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

    const streakInfo = await dailyChallengeService.getStreakInfo(
      userData.user.id
    );

    return c.json({ streakInfo });
  } catch (error) {
    console.error("Error fetching streak info:", error);
    return c.json({ error: "Failed to fetch streak info" }, 500);
  }
});

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

    const result = await dailyChallengeService.useStreakFreeze(
      userData.user.id
    );

    return c.json(result);
  } catch (error) {
    console.error("Error using streak freeze:", error);
    return c.json({ error: "Failed to use streak freeze" }, 500);
  }
});

// ─── Time Attack (matches TimeAttackMode.tsx) ─────────────────────────────

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

    const grade = c.req.query("grade") || "year_5";
    const mod = await import("./comprehensive-trivia-data.tsx");
    const COMPREHENSIVE_TRIVIA = mod.COMPREHENSIVE_TRIVIA as Record<
      string,
      Record<string, unknown[]>
    >;
    const allQuestions = COMPREHENSIVE_TRIVIA[grade];
    if (!allQuestions) {
      return c.json({ error: "Grade not found" }, 404);
    }

    const allQuestionsFlattened = Object.values(allQuestions).flat() as Array<{
      id: string;
      question: string;
      options: string[];
      correctAnswer?: number;
      correctAnswerIndex?: number;
    }>;

    const shuffled = [...allQuestionsFlattened].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 10);

    const session = await timeAttackService.initializeTimeAttackSession(
      userData.user.id
    );

    const meta: Record<string, number> = {};
    for (const q of selectedQuestions) {
      const idx =
        typeof q.correctAnswer === "number"
          ? q.correctAnswer
          : typeof q.correctAnswerIndex === "number"
            ? q.correctAnswerIndex
            : 0;
      meta[q.id] = idx;
    }
    await kv.set(`time_attack_meta:${session.id}`, meta);

    return c.json({
      sessionId: session.id,
      durationSeconds: 300,
      totalQuestions: 10,
      questions: selectedQuestions.map((q) => ({
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

app.post("/time-attack/:sessionId/answer", async (c) => {
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

    const sessionId = c.req.param("sessionId");
    const body = await c.req.json();
    const questionId = String(body.questionId ?? "");
    const answerIndex = Number(body.answerIndex);
    const timeSpentMs = Number(body.timeSpentMs);

    const session = await timeAttackService.getTimeAttackSession(sessionId);
    if (!session || session.userId !== userData.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const meta = (await kv.get(`time_attack_meta:${sessionId}`)) as Record<
      string,
      number
    > | null;
    const correctIdx = meta && questionId ? meta[questionId] : undefined;
    const isCorrect =
      typeof correctIdx === "number" &&
      !Number.isNaN(answerIndex) &&
      answerIndex === correctIdx;

    const result = await timeAttackService.recordTimeAttackAnswer(sessionId, {
      questionId,
      selectedAnswerIndex: answerIndex,
      timeSpentMs,
      isCorrect,
    });

    return c.json({ ...result, isCorrect });
  } catch (error) {
    console.error("Error recording time attack answer:", error);
    return c.json({ error: "Failed to record answer" }, 500);
  }
});

app.post("/time-attack/:sessionId/complete", async (c) => {
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

    const sessionId = c.req.param("sessionId");
    const session = await timeAttackService.getTimeAttackSession(sessionId);
    if (!session || session.userId !== userData.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const result = await timeAttackService.completeTimeAttackSession(sessionId);
    try {
      await kv.del(`time_attack_meta:${sessionId}`);
    } catch {
      /* non-fatal */
    }

    const newBadges = result.success
      ? await recordTimeAttackCompletion(
          userData.user.id,
          result.results.totalXp || 0,
          result.results.accuracy || 0,
          result.results.averageTimePerQuestion || 0,
        )
      : [];

    return c.json({ ...result, newBadges });
  } catch (error) {
    console.error("Error completing time attack:", error);
    return c.json({ error: "Failed to complete time attack" }, 500);
  }
});

app.get("/time-attack/leaderboard/weekly", async (c) => {
  try {
    const leaderboard = await timeAttackService.getWeeklyTimeAttackLeaderboard();
    return c.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching time attack leaderboard:", error);
    return c.json({ error: "Failed to fetch leaderboard" }, 500);
  }
});

export default app;
