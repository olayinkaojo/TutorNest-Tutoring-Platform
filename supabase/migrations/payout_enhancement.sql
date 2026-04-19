-- Payout System Enhancement: International Standards & Best Practices
-- Run this migration to add audit trails, batch processing, and compliance features

-- ─── Add columns to existing payouts table for international compliance ─────
ALTER TABLE IF EXISTS payouts ADD COLUMN IF NOT EXISTS
  batch_id UUID,
  state TEXT NOT NULL DEFAULT 'pending_approval' CHECK (state IN ('pending_approval', 'approved', 'processing', 'completed', 'failed')),
  failure_reason TEXT,
  idempotency_key TEXT UNIQUE,
  scheduled_date DATE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  approval_notes TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  currency TEXT DEFAULT 'NGN',
  exchange_rate NUMERIC,
  fees NUMERIC DEFAULT 0,
  net_amount NUMERIC,
  provider_reference TEXT,
  webhook_sent BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}';

-- ─── Payout Batches (for weekly batch processing) ──────────────────────────
CREATE TABLE IF NOT EXISTS payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL UNIQUE,
  scheduled_date DATE NOT NULL,
  process_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),
  total_payouts INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by UUID,
  processed_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_summary TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payout_batches_scheduled_date ON payout_batches (scheduled_date);
CREATE INDEX IF NOT EXISTS payout_batches_status ON payout_batches (status);

-- ─── Payout Audit Log (complete transaction history) ──────────────────────
CREATE TABLE IF NOT EXISTS payout_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payouts (id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'approved', 'rejected', 'processing', 'completed', 'failed', 'retried', 'cancelled')),
  old_state TEXT,
  new_state TEXT,
  actor_id UUID,
  actor_role TEXT,
  reason TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payout_audit_log_payout_id ON payout_audit_log (payout_id);
CREATE INDEX IF NOT EXISTS payout_audit_log_created_at ON payout_audit_log (created_at);

-- ─── Payout Verification (KYC compliance) ────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL UNIQUE REFERENCES profiles (id) ON DELETE CASCADE,
  kyc_status TEXT NOT NULL DEFAULT 'unverified' CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected', 'expired')),
  kyc_document_url TEXT,
  bank_verification_status TEXT DEFAULT 'unverified' CHECK (bank_verification_status IN ('unverified', 'verified', 'failed')),
  bank_account_last4 TEXT,
  tax_id TEXT,
  identity_verified_at TIMESTAMPTZ,
  bank_verified_at TIMESTAMPTZ,
  verification_expires_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payout_verifications_tutor_id ON payout_verifications (tutor_id);
CREATE INDEX IF NOT EXISTS payout_verifications_kyc_status ON payout_verifications (kyc_status);

-- ─── Payout Settings (per-tutor configuration) ────────────────────────────
CREATE TABLE IF NOT EXISTS payout_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL UNIQUE REFERENCES profiles (id) ON DELETE CASCADE,
  payout_schedule TEXT NOT NULL DEFAULT 'weekly' CHECK (payout_schedule IN ('weekly', 'biweekly', 'monthly', 'manual')),
  minimum_threshold NUMERIC DEFAULT 50,
  preferred_payout_day TEXT, -- 'monday', 'friday', etc.
  preferred_payout_time TEXT, -- 'HH:MM' format
  auto_payout_enabled BOOLEAN DEFAULT TRUE,
  hold_period_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payout_settings_tutor_id ON payout_settings (tutor_id);

-- ─── Enhanced Earnings table with transaction tracking ───────────────────
ALTER TABLE IF EXISTS earnings ADD COLUMN IF NOT EXISTS
  transaction_id TEXT,
  booking_completed_at TIMESTAMPTZ,
  net_earnings NUMERIC,
  tutor_commission_rate NUMERIC DEFAULT 0.80,
  tax_withheld NUMERIC DEFAULT 0,
  reference_id TEXT,
  metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS earnings_reference_id ON earnings (reference_id);
CREATE INDEX IF NOT EXISTS earnings_transaction_id ON earnings (transaction_id);

-- ─── Payout Configuration ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID
);

-- Insert default configuration
INSERT INTO payout_config (key, value, description) VALUES
  ('payout_day_of_week', 'friday', 'Day of week for weekly payouts'),
  ('payout_time_utc', '14:00', 'Time UTC to process payouts'),
  ('minimum_payout_amount', '50', 'Minimum amount in NGN for payout request'),
  ('tutor_commission_rate', '0.80', 'Tutor commission rate (80%)'),
  ('platform_fee_rate', '0.20', 'Platform fee rate (20%)'),
  ('payout_retry_max', '3', 'Maximum retry attempts for failed payouts'),
  ('payout_retry_delay_minutes', '30', 'Delay between retry attempts in minutes'),
  ('tax_withholding_enabled', 'true', 'Enable tax withholding calculations'),
  ('tax_withholding_rate', '0.05', 'Tax withholding rate (5% for Nigeria)')
ON CONFLICT DO NOTHING;

-- ─── Add foreign key constraints ─────────────────────────────────────────
ALTER TABLE IF EXISTS payouts ADD CONSTRAINT IF NOT EXISTS
  fk_payouts_batch_id FOREIGN KEY (batch_id) REFERENCES payout_batches(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS payouts ADD CONSTRAINT IF NOT EXISTS
  fk_payouts_tutor_id FOREIGN KEY (tutor_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ─── Create indexes for performance ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS payouts_batch_id ON payouts (batch_id);
CREATE INDEX IF NOT EXISTS payouts_state ON payouts (state);
CREATE INDEX IF NOT EXISTS payouts_created_date ON payouts (DATE(requested_at));
CREATE INDEX IF NOT EXISTS payouts_idempotency_key ON payouts (idempotency_key);
CREATE INDEX IF NOT EXISTS payout_audit_action ON payout_audit_log (action);

-- ─── Create view for payout dashboard ────────────────────────────────────
CREATE OR REPLACE VIEW v_tutor_payout_summary AS
SELECT 
  p.id as tutor_id,
  p.full_name as tutor_name,
  p.email,
  COALESCE(tb.total_earnings, 0) as total_earnings,
  COALESCE(tb.available_balance, 0) as available_balance,
  COALESCE(tb.pending_balance, 0) as pending_balance,
  COALESCE(tb.total_payouts, 0) as total_payouts,
  COALESCE(ps.payout_schedule, 'weekly') as payout_schedule,
  COALESCE(ps.minimum_threshold, 50) as minimum_threshold,
  COALESCE(pv.kyc_status, 'unverified') as kyc_status,
  COALESCE(pv.bank_verification_status, 'unverified') as bank_verification_status,
  p.updated_at
FROM profiles p
LEFT JOIN tutor_balance tb ON p.id = tb.tutor_id
LEFT JOIN payout_settings ps ON p.id = ps.tutor_id
LEFT JOIN payout_verifications pv ON p.id = pv.tutor_id
WHERE p.role = 'tutor';

-- ─── Enable Row Level Security (RLS) for sensitive tables ────────────────
ALTER TABLE payout_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_audit_log ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ────────────────────────────────────────────────────────
-- Tutors can only see their own verification status
CREATE POLICY IF NOT EXISTS tutor_payout_verification_policy
  ON payout_verifications FOR SELECT
  USING (auth.uid() = tutor_id);

-- Tutors can only see their own settings
CREATE POLICY IF NOT EXISTS tutor_payout_settings_policy
  ON payout_settings FOR SELECT
  USING (auth.uid() = tutor_id);

-- Tutors can see their own audit logs
CREATE POLICY IF NOT EXISTS tutor_payout_audit_policy
  ON payout_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payouts p
      WHERE p.id = payout_audit_log.payout_id
      AND p.tutor_id = auth.uid()
    )
  );

-- ─── Triggers to maintain audit trail ────────────────────────────────────
CREATE OR REPLACE FUNCTION log_payout_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.state IS DISTINCT FROM OLD.state) THEN
    INSERT INTO payout_audit_log (payout_id, action, old_state, new_state, created_at)
    VALUES (NEW.id, 'state_change', OLD.state, NEW.state, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_payout_state_change
  AFTER UPDATE ON payouts
  FOR EACH ROW
  EXECUTE FUNCTION log_payout_state_change();

-- Grant appropriate permissions
GRANT SELECT ON v_tutor_payout_summary TO authenticated;
GRANT SELECT ON payouts TO authenticated;
GRANT SELECT ON payout_audit_log TO authenticated;
