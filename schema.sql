-- TutorNest: Core database schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- URL: https://supabase.com/dashboard/project/wevmvbskunhnhuxzaqoz/sql/new

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Stores every user's profile data (parent, tutor, student, admin).
-- `raw_data` holds the full JSON blob for backward compat with KV-based routes.
-- The typed columns (role, email, full_name) power indexed queries.

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY,           -- matches auth.users.id
  role       TEXT CHECK (role IN ('parent', 'tutor', 'student', 'admin')),
  email      TEXT,
  full_name  TEXT,
  raw_data   JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_role ON profiles (role);

-- ─── Bookings ──────────────────────────────────────────────────────────────────
-- One row per scheduled tutoring session.
-- Plan-based bookings (Trial / Once-Weekly / Twice-Weekly) each create N rows
-- with the same payment_id.

CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     UUID,
  plan_type      TEXT,
  session_number INTEGER,
  total_sessions INTEGER,
  tutor_id       UUID NOT NULL,
  student_id     UUID NOT NULL,
  user_id        UUID NOT NULL,           -- the paying user (parent or student)
  date           DATE NOT NULL,
  start_time     TEXT NOT NULL,           -- HH:MM
  end_time       TEXT NOT NULL,           -- HH:MM
  duration       INTEGER NOT NULL DEFAULT 60,
  subject        TEXT,
  status         TEXT NOT NULL DEFAULT 'scheduled',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  meet_link      TEXT,
  calendar_event_id TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_tutor_date    ON bookings (tutor_id, date);
CREATE INDEX IF NOT EXISTS bookings_student_date  ON bookings (student_id, date);
CREATE INDEX IF NOT EXISTS bookings_payment_id    ON bookings (payment_id);
CREATE INDEX IF NOT EXISTS bookings_user_id       ON bookings (user_id);

-- ─── Payments ──────────────────────────────────────────────────────────────────
-- One row per Flutterwave transaction (one per plan purchase).

CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  tutor_id     UUID NOT NULL,
  student_id   UUID,
  plan_type    TEXT NOT NULL,
  amount       NUMERIC NOT NULL,
  reference    TEXT NOT NULL UNIQUE,     -- Flutterwave tx_ref (TNP_...)
  status       TEXT NOT NULL DEFAULT 'pending',
  start_date   DATE NOT NULL,
  start_time   TEXT NOT NULL,
  subject      TEXT,
  booking_ids  UUID[] DEFAULT '{}',
  confirmed_at TIMESTAMPTZ,
  payment_expires_at TIMESTAMPTZ,       -- Chat access expires when payment duration ends
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payments_reference ON payments (reference);
CREATE INDEX IF NOT EXISTS payments_user_id   ON payments (user_id);
CREATE INDEX IF NOT EXISTS payments_tutor_id  ON payments (tutor_id);
CREATE INDEX IF NOT EXISTS payments_expires_at ON payments (payment_expires_at);

-- ─── Tutor Balance ─────────────────────────────────────────────────────────────
-- One row per tutor, updated atomically on each payment confirmation.

CREATE TABLE IF NOT EXISTS tutor_balance (
  tutor_id          UUID PRIMARY KEY,
  pending_balance   NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  total_earnings    NUMERIC NOT NULL DEFAULT 0,
  total_payouts     NUMERIC NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL,
  type       TEXT NOT NULL,
  title      TEXT,
  message    TEXT,
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id ON notifications (user_id, created_at DESC);

-- ─── Payouts ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id     UUID NOT NULL,
  amount       NUMERIC NOT NULL,
  bank_details JSONB,
  status       TEXT NOT NULL DEFAULT 'pending',
  reference    TEXT,
  transfer_id  TEXT,
  processed_by UUID,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payouts_tutor_id ON payouts (tutor_id);

-- ─── Earnings ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS earnings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id     UUID NOT NULL,
  payment_id   UUID REFERENCES payments (id),
  booking_id   UUID REFERENCES bookings (id),
  amount       NUMERIC NOT NULL,
  platform_fee NUMERIC,
  status       TEXT NOT NULL DEFAULT 'pending',
  payout_id    UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS earnings_tutor_id ON earnings (tutor_id);

-- ─── Trivia Subscriptions ──────────────────────────────────────────────────────
-- Tracks student access to trivia by subject (N3,000 per subject per month).
-- Free trial: 30 days from first access. After trial: requires active subscription.

CREATE TABLE IF NOT EXISTS trivia_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL UNIQUE,           -- One record per student
  subject_id   TEXT NOT NULL,                  -- e.g., 'mathematics', 'english', 'science'
  status       TEXT NOT NULL DEFAULT 'free',   -- 'free' (in trial), 'active' (paid), 'expired'
  free_trial_started_at TIMESTAMPTZ,          -- When free 30-day trial started
  free_trial_expires_at TIMESTAMPTZ,          -- Trial expires (started_at + 30 days)
  paid_expires_at TIMESTAMPTZ,                -- When paid subscription expires
  payment_id   UUID,                          -- Link to payments table
  subject_name TEXT,                          -- Display name (e.g., 'Mathematics')
  price_per_month NUMERIC DEFAULT 3000,       -- NGN 3,000 per month
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trivia_subscriptions_student_id ON trivia_subscriptions (student_id);
CREATE INDEX IF NOT EXISTS trivia_subscriptions_status ON trivia_subscriptions (status);
CREATE INDEX IF NOT EXISTS trivia_subscriptions_expires ON trivia_subscriptions (free_trial_expires_at, paid_expires_at);
