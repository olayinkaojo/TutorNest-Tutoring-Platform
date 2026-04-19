-- ============================================================
-- TutorNest — Enable Row-Level Security on all public tables
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================
--
-- SAFETY NOTE: All Edge Function backend calls use SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS completely. These policies only govern direct
-- Supabase client calls (anon/authenticated JWT from the browser).
-- Enabling RLS here will NOT break any existing backend functionality.
-- ============================================================


-- ─── 1. Enable RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_balance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kv_store_cbd74580 ENABLE ROW LEVEL SECURITY;

-- Conditional: only runs if these tables exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payouts') THEN
    EXECUTE 'ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'earnings') THEN
    EXECUTE 'ALTER TABLE public.earnings ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;


-- ─── 2. profiles ──────────────────────────────────────────────────────────────
-- Drop first to avoid duplicates on re-run
DROP POLICY IF EXISTS "profiles: read own"           ON public.profiles;
DROP POLICY IF EXISTS "profiles: read tutor profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles: insert own"         ON public.profiles;
DROP POLICY IF EXISTS "profiles: update own"         ON public.profiles;

-- Every authenticated user can read their own profile
CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Any authenticated user can read tutor profiles (needed for booking flow)
CREATE POLICY "profiles: read tutor profiles"
  ON public.profiles FOR SELECT
  USING (role = 'tutor' AND auth.role() = 'authenticated');

-- Users can create their own profile row on signup
CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "profiles: update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);


-- ─── 3. bookings ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "bookings: read own" ON public.bookings;

-- Users can see bookings they're involved in (as payer, tutor, or student)
CREATE POLICY "bookings: read own"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = user_id    OR
    auth.uid() = tutor_id   OR
    auth.uid() = student_id
  );


-- ─── 4. payments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "payments: read own" ON public.payments;

CREATE POLICY "payments: read own"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = user_id    OR
    auth.uid() = tutor_id   OR
    auth.uid() = student_id
  );


-- ─── 5. notifications ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications: read own"   ON public.notifications;
DROP POLICY IF EXISTS "notifications: update own" ON public.notifications;

-- Users see only their own notifications
CREATE POLICY "notifications: read own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "notifications: update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);


-- ─── 6. tutor_balance ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tutor_balance: read own" ON public.tutor_balance;

-- Tutors can only see their own balance row
CREATE POLICY "tutor_balance: read own"
  ON public.tutor_balance FOR SELECT
  USING (auth.uid() = tutor_id);


-- ─── 7. kv_store_cbd74580 ─────────────────────────────────────────────────────
-- This is an internal backend store — no direct client access permitted.
-- With RLS enabled and no policies created, all direct client queries are denied.
-- The Edge Function service role key bypasses this automatically.


-- ─── 8. payouts (if it exists) ────────────────────────────────────────────────
-- Tutors can only see their own payout records.
-- Tries common column names: tutor_id, user_id.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payouts') THEN
    -- Drop first
    EXECUTE 'DROP POLICY IF EXISTS "payouts: read own" ON public.payouts';
    -- Prefer tutor_id column; fall back to user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payouts' AND column_name = 'tutor_id') THEN
      EXECUTE 'CREATE POLICY "payouts: read own" ON public.payouts FOR SELECT USING (auth.uid() = tutor_id)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payouts' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "payouts: read own" ON public.payouts FOR SELECT USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;


-- ─── 9. earnings (if it exists) ───────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'earnings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "earnings: read own" ON public.earnings';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'earnings' AND column_name = 'tutor_id') THEN
      EXECUTE 'CREATE POLICY "earnings: read own" ON public.earnings FOR SELECT USING (auth.uid() = tutor_id)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'earnings' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "earnings: read own" ON public.earnings FOR SELECT USING (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;
