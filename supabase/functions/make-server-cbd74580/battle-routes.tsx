/**
 * Multiplayer battle API at /battle/* (matches BattleArena.tsx BASE + /battle/...).
 */
import { Hono } from "npm:hono@4";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as db from "./db.tsx";
import * as multiplayerBattleService from "./multiplayer-battle-service.tsx";

const app = new Hono();

/** Strip correct indices before sending battle JSON to clients */
function sanitizeBattle(b: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!b) return null;
  const rounds = (b.rounds as unknown[] | undefined) ?? [];
  return {
    ...b,
    rounds: rounds.map((r) => {
      const round = r as Record<string, unknown>;
      const q = round.question as Record<string, unknown> | undefined;
      return {
        ...round,
        question: q
          ? {
              questionId: q.questionId,
              question: q.question,
              options: q.options,
            }
          : null,
      };
    }),
  };
}

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

    const body = await c.req.json().catch(() => ({}));
    const { battleMode = "random", targetUserId, grade = "year_5" } = body as {
      battleMode?: string;
      targetUserId?: string;
      grade?: string;
    };
    const profile = await db.getProfile(userData.user.id);
    const userName =
      profile?.fullName ||
      profile?.full_name ||
      profile?.name ||
      "Student";

    const result = await multiplayerBattleService.initiateNewBattle(
      userData.user.id,
      userName,
      1,
      battleMode as "random" | "friend_challenge",
      targetUserId as string | undefined,
      typeof grade === "string" && grade.length > 0 ? grade : "year_5"
    );

    return c.json({
      ...result,
      battle: result.battle
        ? sanitizeBattle(result.battle as unknown as Record<string, unknown>)
        : undefined,
    });
  } catch (error) {
    console.error("Error starting battle:", error);
    return c.json({ error: "Failed to start battle" }, 500);
  }
});

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
    const profile = await db.getProfile(userData.user.id);
    const userName =
      profile?.fullName ||
      profile?.full_name ||
      profile?.name ||
      "Student";

    const result = await multiplayerBattleService.acceptBattleInvite(
      userData.user.id,
      userName,
      inviteCode
    );

    return c.json({
      ...result,
      battle: result.battle
        ? sanitizeBattle(result.battle as unknown as Record<string, unknown>)
        : undefined,
    });
  } catch (error) {
    console.error("Error accepting battle invite:", error);
    return c.json({ error: "Failed to accept invite" }, 500);
  }
});

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
    const { questionIndex, answerIndex, timeMs } = await c.req.json();

    const result = await multiplayerBattleService.recordBattleAnswer(
      battleId,
      userData.user.id,
      Number(questionIndex),
      Number(answerIndex),
      Number(timeMs)
    );

    return c.json(result);
  } catch (error) {
    console.error("Error recording battle answer:", error);
    return c.json({ error: "Failed to record answer" }, 500);
  }
});

/** Static path before /battle/:battleId so "leaderboard" is not captured as an id */
app.get("/battle/leaderboard/weekly", async (c) => {
  try {
    const leaderboard = await multiplayerBattleService.getWeeklyBattleLeaderboard();
    return c.json({ leaderboard });
  } catch (error) {
    console.error("Error fetching battle leaderboard:", error);
    return c.json({ error: "Failed to fetch leaderboard" }, 500);
  }
});

app.get("/battle/:battleId", async (c) => {
  try {
    const battleId = c.req.param("battleId");
    const battle = await multiplayerBattleService.getBattleStatus(battleId);

    if (!battle) {
      return c.json({ error: "Battle not found" }, 404);
    }

    return c.json({
      battle: sanitizeBattle(battle as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Error fetching battle status:", error);
    return c.json({ error: "Failed to fetch battle status" }, 500);
  }
});

export default app;
