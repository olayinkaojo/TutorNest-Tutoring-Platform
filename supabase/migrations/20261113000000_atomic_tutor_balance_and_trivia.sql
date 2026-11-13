-- Fixes two read-then-write races flagged in review: tutor_balance
-- mutations (db.tsx) and trivia stats/leaderboard updates (trivia-routes.tsx)
-- were both "read current value in JS, compute new value, write it back" —
-- two concurrent requests for the same tutor/user (double-click, two tabs, a
-- retried request) could both read the same starting value and the second
-- write clobbers the first's change, silently losing it. Postgres can do
-- these as single atomic statements instead; this migration adds the
-- functions the edge function code now calls via .rpc(), and backfills the
-- small amount of existing trivia data out of the KV store so nobody's real
-- XP/leaderboard standing resets to zero.

-- ─── Tutor balance: atomic adjustments ─────────────────────────────────────

-- General additive adjustment (positive or negative deltas), floored at 0 on
-- each column independently. Used for crediting earnings, refunding a
-- reservation, finalizing/reversing a payout. A single UPDATE/UPSERT
-- statement is atomic under Postgres's row-level locking — no separate read
-- step for two concurrent callers to race on.
CREATE OR REPLACE FUNCTION adjust_tutor_balance(
  p_tutor_id UUID,
  p_pending_delta NUMERIC DEFAULT 0,
  p_available_delta NUMERIC DEFAULT 0,
  p_earnings_delta NUMERIC DEFAULT 0,
  p_payouts_delta NUMERIC DEFAULT 0
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO tutor_balance (tutor_id, pending_balance, available_balance, total_earnings, total_payouts, updated_at)
  VALUES (
    p_tutor_id,
    GREATEST(p_pending_delta, 0),
    GREATEST(p_available_delta, 0),
    GREATEST(p_earnings_delta, 0),
    GREATEST(p_payouts_delta, 0),
    NOW()
  )
  ON CONFLICT (tutor_id) DO UPDATE SET
    pending_balance = GREATEST(tutor_balance.pending_balance + p_pending_delta, 0),
    available_balance = GREATEST(tutor_balance.available_balance + p_available_delta, 0),
    total_earnings = GREATEST(tutor_balance.total_earnings + p_earnings_delta, 0),
    total_payouts = GREATEST(tutor_balance.total_payouts + p_payouts_delta, 0),
    updated_at = NOW();
END;
$$;

-- Reserves `p_amount` out of available_balance for a payout request, atomically
-- failing (no row affected) if there isn't enough available — the WHERE
-- clause is evaluated against the row's current value under the same lock
-- the UPDATE takes, so two concurrent requests against the same balance
-- can't both succeed against funds that only exist once.
CREATE OR REPLACE FUNCTION reserve_tutor_balance_for_payout(
  p_tutor_id UUID,
  p_amount NUMERIC
) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE tutor_balance
  SET available_balance = available_balance - p_amount, updated_at = NOW()
  WHERE tutor_id = p_tutor_id AND available_balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient available balance';
  END IF;
END;
$$;

-- Moves `p_amount` from pending to available, clamped to whatever is
-- actually pending right now. SELECT ... FOR UPDATE takes a row lock for the
-- rest of this function call, so a concurrent caller reading the same
-- pending_balance has to wait rather than compute its own clamp against a
-- value this call is about to change.
CREATE OR REPLACE FUNCTION release_tutor_balance(
  p_tutor_id UUID,
  p_amount NUMERIC
) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_pending NUMERIC;
  v_moved NUMERIC;
BEGIN
  IF p_amount <= 0 THEN RETURN; END IF;

  SELECT pending_balance INTO v_pending FROM tutor_balance WHERE tutor_id = p_tutor_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  v_moved := LEAST(p_amount, GREATEST(v_pending, 0));
  IF v_moved <= 0 THEN RETURN; END IF;

  UPDATE tutor_balance
  SET pending_balance = pending_balance - v_moved,
      available_balance = available_balance + v_moved,
      updated_at = NOW()
  WHERE tutor_id = p_tutor_id;
END;
$$;

-- Claws back `p_amount` from pending first, then available, when a refund is
-- processed — same clamp-and-split logic the old JS version had, but now
-- computed and applied under one row lock instead of a separate read.
CREATE OR REPLACE FUNCTION deduct_tutor_balance_for_refund(
  p_tutor_id UUID,
  p_amount NUMERIC
) RETURNS TABLE (deducted_from_pending NUMERIC, deducted_from_available NUMERIC, shortfall NUMERIC)
LANGUAGE plpgsql AS $$
DECLARE
  v_pending NUMERIC;
  v_available NUMERIC;
  v_from_pending NUMERIC;
  v_remaining NUMERIC;
  v_from_available NUMERIC;
BEGIN
  SELECT pending_balance, available_balance INTO v_pending, v_available
    FROM tutor_balance WHERE tutor_id = p_tutor_id FOR UPDATE;

  IF NOT FOUND THEN
    v_pending := 0;
    v_available := 0;
  END IF;

  v_from_pending := LEAST(p_amount, GREATEST(v_pending, 0));
  v_remaining := p_amount - v_from_pending;
  v_from_available := LEAST(v_remaining, GREATEST(v_available, 0));

  UPDATE tutor_balance SET
    pending_balance = pending_balance - v_from_pending,
    available_balance = available_balance - v_from_available,
    updated_at = NOW()
  WHERE tutor_id = p_tutor_id;

  RETURN QUERY SELECT v_from_pending, v_from_available, (v_remaining - v_from_available);
END;
$$;

-- ─── Trivia: real tables instead of KV blobs, atomic result recording ─────

CREATE TABLE IF NOT EXISTS trivia_stats (
  user_id UUID PRIMARY KEY,
  total_games INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  best_score NUMERIC NOT NULL DEFAULT 0,
  last_played TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trivia_leaderboard (
  grade TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT 'Student',
  total_xp INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC NOT NULL DEFAULT 0,
  best_score NUMERIC NOT NULL DEFAULT 0,
  last_played TIMESTAMPTZ,
  PRIMARY KEY (grade, user_id)
);
CREATE INDEX IF NOT EXISTS trivia_leaderboard_grade_xp ON trivia_leaderboard (grade, total_xp DESC);

-- Backfill the small amount of real existing data out of the KV store so
-- nobody's XP/leaderboard standing resets to zero when this ships. Safe to
-- re-run (ON CONFLICT DO NOTHING) and inert once the KV rows are gone.
INSERT INTO trivia_stats (user_id, total_games, total_xp, total_correct, total_questions, best_score, last_played)
SELECT
  (split_part(key, ':', 2))::uuid,
  COALESCE((value->>'totalGames')::int, 0),
  COALESCE((value->>'totalXP')::int, 0),
  COALESCE((value->>'totalCorrect')::int, 0),
  COALESCE((value->>'totalQuestions')::int, 0),
  COALESCE((value->>'bestScore')::numeric, 0),
  (value->>'lastPlayed')::timestamptz
FROM kv_store_cbd74580
WHERE key LIKE 'trivia_stats:%'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO trivia_leaderboard (grade, user_id, user_name, total_xp, games_played, average_score, best_score, last_played)
SELECT
  split_part(k.key, ':', 2) AS grade,
  (entry->>'userId')::uuid,
  COALESCE(entry->>'userName', 'Student'),
  COALESCE((entry->>'totalXP')::int, 0),
  COALESCE((entry->>'gamesPlayed')::int, 0),
  COALESCE((entry->>'averageScore')::numeric, 0),
  COALESCE((entry->>'bestScore')::numeric, 0),
  (entry->>'lastPlayed')::timestamptz
FROM kv_store_cbd74580 k
CROSS JOIN LATERAL jsonb_array_elements(k.value->'entries') AS entry
WHERE k.key LIKE 'trivia_leaderboard:%'
ON CONFLICT (grade, user_id) DO NOTHING;

-- Atomically records one quiz result: updates both tables under row locks
-- (no read-modify-write gap in application code) and returns the caller's
-- new rank for that grade. Replaces trivia-routes.tsx's
-- read-KV -> mutate-in-JS -> write-KV sequence for both trivia_stats and
-- trivia_leaderboard.
CREATE OR REPLACE FUNCTION record_trivia_result(
  p_user_id UUID,
  p_user_name TEXT,
  p_grade TEXT,
  p_correct INTEGER,
  p_total_questions INTEGER,
  p_xp INTEGER,
  p_score NUMERIC
) RETURNS TABLE (
  total_games INTEGER,
  total_xp INTEGER,
  total_correct INTEGER,
  total_questions INTEGER,
  best_score NUMERIC,
  rank BIGINT,
  total_players BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO trivia_stats (user_id, total_games, total_xp, total_correct, total_questions, best_score, last_played, updated_at)
  VALUES (p_user_id, 1, p_xp, p_correct, p_total_questions, p_score, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_games = trivia_stats.total_games + 1,
    total_xp = trivia_stats.total_xp + p_xp,
    total_correct = trivia_stats.total_correct + p_correct,
    total_questions = trivia_stats.total_questions + p_total_questions,
    best_score = GREATEST(trivia_stats.best_score, p_score),
    last_played = NOW(),
    updated_at = NOW();

  INSERT INTO trivia_leaderboard (grade, user_id, user_name, total_xp, games_played, average_score, best_score, last_played)
  VALUES (p_grade, p_user_id, p_user_name, p_xp, 1, p_score, p_score, NOW())
  ON CONFLICT (grade, user_id) DO UPDATE SET
    user_name = p_user_name,
    total_xp = trivia_leaderboard.total_xp + p_xp,
    games_played = trivia_leaderboard.games_played + 1,
    average_score = ((trivia_leaderboard.average_score * trivia_leaderboard.games_played) + p_score) / (trivia_leaderboard.games_played + 1),
    best_score = GREATEST(trivia_leaderboard.best_score, p_score),
    last_played = NOW();

  RETURN QUERY
  SELECT
    ts.total_games, ts.total_xp, ts.total_correct, ts.total_questions, ts.best_score,
    (SELECT COUNT(*) FROM trivia_leaderboard tl2 WHERE tl2.grade = p_grade AND tl2.total_xp > tl.total_xp) + 1 AS rank,
    (SELECT COUNT(*) FROM trivia_leaderboard tl3 WHERE tl3.grade = p_grade) AS total_players
  FROM trivia_stats ts
  JOIN trivia_leaderboard tl ON tl.user_id = p_user_id AND tl.grade = p_grade
  WHERE ts.user_id = p_user_id;
END;
$$;
