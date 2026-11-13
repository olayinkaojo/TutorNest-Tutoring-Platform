-- Same class of fix as 20261113000000 (tutor_balance, trivia), applied to
-- the gamification/achievement system: user:<id>:stats and
-- user:<id>:achievements were both read-modify-write KV blobs, and
-- achievement-leaderboard:global was a third, mutated the same way. Real
-- call sites affected: daily challenge completion, time attack completion,
-- every battle answer + battle completion, and badge unlocking — any two of
-- these landing close together for the same user could lose an update.
--
-- Also replaces the "mutated leaderboard blob" with a live query — it's
-- entirely derived data (XP + badge count), so maintaining a separately
-- written copy of it was both racy and redundant.
--
-- Backfills the small amount of real existing data (2 user:<id>:stats
-- rows, 1 user:<id>:achievements row) out of the KV store, same as the
-- previous migration did for trivia — confirmed by querying production
-- before writing this.

CREATE TABLE IF NOT EXISTS user_game_stats (
  user_id UUID PRIMARY KEY,
  user_name TEXT NOT NULL DEFAULT 'Student',
  daily_challenges_completed INTEGER NOT NULL DEFAULT 0,
  fastest_answer_time INTEGER NOT NULL DEFAULT 999999999,
  battles_played INTEGER NOT NULL DEFAULT 0,
  battle_wins INTEGER NOT NULL DEFAULT 0,
  friend_battle_wins INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  battle_win_streak INTEGER NOT NULL DEFAULT 0,
  average_answer_time INTEGER NOT NULL DEFAULT 999999999,
  global_rank INTEGER NOT NULL DEFAULT 999999,
  perfect_time_attack_games INTEGER NOT NULL DEFAULT 0,
  friends_invited INTEGER NOT NULL DEFAULT 0,
  battles_organized INTEGER NOT NULL DEFAULT 0,
  is_in_achievements_leaderboard BOOLEAN NOT NULL DEFAULT FALSE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL,
  badge_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS user_badges_user_id ON user_badges (user_id);

CREATE TABLE IF NOT EXISTS badge_unlock_stats (
  badge_id TEXT PRIMARY KEY,
  total_unlocks INTEGER NOT NULL DEFAULT 0
);

-- Backfill (safe to re-run — ON CONFLICT DO NOTHING, inert once the KV rows
-- are gone). user_name defaults to 'Student' since these KV records never
-- carried a display name; the real name fills in automatically next time
-- each user does anything, since every record_* function below refreshes
-- user_name on every write.
INSERT INTO user_game_stats (
  user_id, daily_challenges_completed, fastest_answer_time, battles_played, battle_wins,
  friend_battle_wins, current_streak, battle_win_streak, average_answer_time, global_rank,
  perfect_time_attack_games, friends_invited, battles_organized, is_in_achievements_leaderboard, total_xp
)
SELECT
  (split_part(key, ':', 2))::uuid,
  COALESCE((value->>'dailyChallengesCompleted')::int, 0),
  COALESCE((value->>'fastestAnswerTime')::int, 999999999),
  COALESCE((value->>'battlesPlayed')::int, 0),
  COALESCE((value->>'battleWins')::int, 0),
  COALESCE((value->>'friendBattleWins')::int, 0),
  COALESCE((value->>'currentStreak')::int, 0),
  COALESCE((value->>'battleWinStreak')::int, 0),
  COALESCE((value->>'averageAnswerTime')::int, 999999999),
  COALESCE((value->>'globalRank')::int, 999999),
  COALESCE((value->>'perfectTimeAttackGames')::int, 0),
  COALESCE((value->>'friendsInvited')::int, 0),
  COALESCE((value->>'battlesOrganized')::int, 0),
  COALESCE((value->>'isInAchievementsLeaderboard')::boolean, false),
  COALESCE((value->>'totalXP')::int, 0)
FROM kv_store_cbd74580
WHERE key LIKE 'user:%:stats'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_badges (user_id, badge_id, unlocked_at)
SELECT
  (split_part(key, ':', 2))::uuid,
  badge_id,
  COALESCE((value->'unlockDates'->>badge_id)::timestamptz, NOW())
FROM kv_store_cbd74580
CROSS JOIN LATERAL jsonb_array_elements_text(value->'achieved') AS badge_id
WHERE key LIKE 'user:%:achievements'
ON CONFLICT (user_id, badge_id) DO NOTHING;

INSERT INTO badge_unlock_stats (badge_id, total_unlocks)
SELECT badge_id, COUNT(*) FROM user_badges GROUP BY badge_id
ON CONFLICT (badge_id) DO UPDATE SET total_unlocks = EXCLUDED.total_unlocks;

-- ─── Badges: atomic unlock, can't double-add or double-count ──────────────
-- INSERT ... ON CONFLICT DO NOTHING is atomic under the (user_id, badge_id)
-- primary key — two concurrent attempts to unlock the same badge for the
-- same user can't both succeed, so FOUND (did this call's own INSERT
-- actually land a row) is a reliable "did I just unlock this for the first
-- time" check, and the unlock-count bump only happens for whichever call
-- actually wins.
CREATE OR REPLACE FUNCTION unlock_badge_for_user(
  p_user_id UUID,
  p_badge_id TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, p_badge_id)
  ON CONFLICT (user_id, badge_id) DO NOTHING;
  v_inserted := FOUND;

  IF v_inserted THEN
    INSERT INTO badge_unlock_stats (badge_id, total_unlocks) VALUES (p_badge_id, 1)
    ON CONFLICT (badge_id) DO UPDATE SET total_unlocks = badge_unlock_stats.total_unlocks + 1;
  END IF;

  RETURN v_inserted;
END;
$$;

-- ─── Game stats: one atomic function per real call site ──────────────────
-- Each does the same "new = f(old, incoming)" computation the old JS code
-- did, but as a single INSERT ... ON CONFLICT DO UPDATE statement, which
-- can reference both the existing row (table name) and the incoming values
-- in its SET clause — atomic under Postgres's row lock, no read-then-write
-- gap for a concurrent call to land in.

CREATE OR REPLACE FUNCTION record_daily_challenge_completion(
  p_user_id UUID, p_user_name TEXT, p_xp_earned INTEGER, p_streak INTEGER
) RETURNS user_game_stats LANGUAGE plpgsql AS $$
DECLARE v_row user_game_stats;
BEGIN
  INSERT INTO user_game_stats (user_id, user_name, daily_challenges_completed, total_xp, current_streak)
  VALUES (p_user_id, p_user_name, 1, p_xp_earned, p_streak)
  ON CONFLICT (user_id) DO UPDATE SET
    user_name = p_user_name,
    daily_challenges_completed = user_game_stats.daily_challenges_completed + 1,
    total_xp = user_game_stats.total_xp + p_xp_earned,
    current_streak = p_streak,
    updated_at = NOW()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION record_time_attack_completion(
  p_user_id UUID, p_user_name TEXT, p_xp_earned INTEGER, p_accuracy NUMERIC, p_avg_answer_time INTEGER
) RETURNS user_game_stats LANGUAGE plpgsql AS $$
DECLARE v_row user_game_stats;
BEGIN
  INSERT INTO user_game_stats (user_id, user_name, total_xp, average_answer_time, perfect_time_attack_games)
  VALUES (p_user_id, p_user_name, p_xp_earned, p_avg_answer_time, CASE WHEN p_accuracy = 100 THEN 1 ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    user_name = p_user_name,
    total_xp = user_game_stats.total_xp + p_xp_earned,
    -- The old JS formula was a plain pairwise average with the stored
    -- value, including the very first time it ran against a brand new
    -- user whose "no data yet" sentinel (999,999,999) had never been
    -- overwritten — averaging a real time against that sentinel produced
    -- a ~500-million "average," which then took many games to recover
    -- from (each game only halves the distance back to something real).
    -- Treat the sentinel as "no real average yet" and just take the new
    -- value outright in that case.
    average_answer_time = CASE
      WHEN user_game_stats.average_answer_time >= 999999999 THEN p_avg_answer_time
      ELSE (user_game_stats.average_answer_time + p_avg_answer_time) / 2
    END,
    perfect_time_attack_games = user_game_stats.perfect_time_attack_games + (CASE WHEN p_accuracy = 100 THEN 1 ELSE 0 END),
    updated_at = NOW()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION record_battle_answer_time(
  p_user_id UUID, p_user_name TEXT, p_time_ms INTEGER
) RETURNS user_game_stats LANGUAGE plpgsql AS $$
DECLARE v_row user_game_stats;
BEGIN
  INSERT INTO user_game_stats (user_id, user_name, fastest_answer_time)
  VALUES (p_user_id, p_user_name, p_time_ms)
  ON CONFLICT (user_id) DO UPDATE SET
    user_name = p_user_name,
    fastest_answer_time = LEAST(user_game_stats.fastest_answer_time, p_time_ms),
    updated_at = NOW()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION record_battle_result(
  p_user_id UUID, p_user_name TEXT, p_won BOOLEAN
) RETURNS user_game_stats LANGUAGE plpgsql AS $$
DECLARE v_row user_game_stats;
BEGIN
  INSERT INTO user_game_stats (user_id, user_name, battles_played, battle_wins, battle_win_streak)
  VALUES (p_user_id, p_user_name, 1, CASE WHEN p_won THEN 1 ELSE 0 END, CASE WHEN p_won THEN 1 ELSE 0 END)
  ON CONFLICT (user_id) DO UPDATE SET
    user_name = p_user_name,
    battles_played = user_game_stats.battles_played + 1,
    battle_wins = user_game_stats.battle_wins + (CASE WHEN p_won THEN 1 ELSE 0 END),
    battle_win_streak = CASE WHEN p_won THEN user_game_stats.battle_win_streak + 1 ELSE 0 END,
    updated_at = NOW()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION increment_user_xp(
  p_user_id UUID, p_user_name TEXT, p_xp_delta INTEGER
) RETURNS user_game_stats LANGUAGE plpgsql AS $$
DECLARE v_row user_game_stats;
BEGIN
  INSERT INTO user_game_stats (user_id, user_name, total_xp)
  VALUES (p_user_id, p_user_name, p_xp_delta)
  ON CONFLICT (user_id) DO UPDATE SET
    user_name = p_user_name,
    total_xp = user_game_stats.total_xp + p_xp_delta,
    updated_at = NOW()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

-- ─── Achievement leaderboard: a live query, not a maintained copy ────────
-- badges_unlocked is COUNT(user_badges), computed at read time — nothing
-- writes a denormalized copy of it anywhere, so there's no second place
-- for it to drift out of sync or race on.
CREATE OR REPLACE FUNCTION get_achievement_leaderboard(p_limit INTEGER DEFAULT 200)
RETURNS TABLE (user_id UUID, user_name TEXT, badges_unlocked BIGINT, total_xp INTEGER)
LANGUAGE sql AS $$
  SELECT ugs.user_id, ugs.user_name, COUNT(ub.badge_id) AS badges_unlocked, ugs.total_xp
  FROM user_game_stats ugs
  LEFT JOIN user_badges ub ON ub.user_id = ugs.user_id
  GROUP BY ugs.user_id, ugs.user_name, ugs.total_xp
  ORDER BY badges_unlocked DESC, ugs.total_xp DESC
  LIMIT p_limit;
$$;
