-- =====================================================
-- TUTORNEST PAYMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This schema supports Trial, Weekly, and Twice-Weekly tutoring plans
-- with automated booking generation and payment tracking

-- =====================================================
-- 1. PAYMENT PLANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE CHECK (plan_type IN ('trial', 'once_weekly', 'twice_weekly')),
  name TEXT NOT NULL,
  description TEXT,
  price_naira INTEGER NOT NULL,
  sessions_count INTEGER NOT NULL,
  duration_weeks INTEGER NOT NULL,
  sessions_per_week INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO payment_plans (plan_type, name, description, price_naira, sessions_count, duration_weeks, sessions_per_week) VALUES
('trial', 'Trial Plan', 'One-time tutoring session to try our service', 20000, 1, 1, 1),
('once_weekly', 'Once Weekly Plan', '13-week package with 1 session per week', 260000, 13, 13, 1),
('twice_weekly', 'Twice Weekly Plan', '13-week package with 2 sessions per week', 520000, 26, 13, 2)
ON CONFLICT (plan_type) DO NOTHING;

-- =====================================================
-- 2. PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and Plan Info
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id UUID NOT NULL REFERENCES payment_plans(id),
  
  -- Payment Details
  amount_naira INTEGER NOT NULL,
  payment_reference TEXT UNIQUE NOT NULL, -- Paystack reference
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'paystack',
  
  -- Paystack Specific
  paystack_reference TEXT UNIQUE,
  paystack_access_code TEXT,
  paystack_authorization_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT valid_amount CHECK (amount_naira > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_tutor_id ON payments(tutor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- =====================================================
-- 3. BOOKINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES payment_plans(id),
  
  -- Session Details
  session_number INTEGER NOT NULL, -- 1-26 depending on plan
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  
  -- Status
  booking_status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    booking_status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show')
  ),
  
  -- Session Info
  subject TEXT,
  notes TEXT,
  location TEXT, -- 'online' or physical location
  meeting_link TEXT,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_session_number CHECK (session_number > 0),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0),
  CONSTRAINT unique_tutor_datetime UNIQUE (tutor_id, scheduled_date, scheduled_time)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_payment_id ON bookings(payment_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_id ON bookings(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date ON bookings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_bookings_tutor_date ON bookings(tutor_id, scheduled_date);

-- =====================================================
-- 4. TUTOR AVAILABILITY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS tutor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Time Slot
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Availability Window
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE, -- NULL means indefinite
  
  -- Status
  is_available BOOLEAN DEFAULT true,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_date_range CHECK (effective_until IS NULL OR effective_until > effective_from)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_day ON tutor_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_tutor_availability_dates ON tutor_availability(effective_from, effective_until);

-- =====================================================
-- 5. TUTOR BLOCKED DATES TABLE
-- =====================================================
-- For specific dates when tutor is not available (holidays, etc.)
CREATE TABLE IF NOT EXISTS tutor_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_tutor_blocked_date UNIQUE (tutor_id, blocked_date)
);

CREATE INDEX IF NOT EXISTS idx_tutor_blocked_tutor_id ON tutor_blocked_dates(tutor_id);
CREATE INDEX IF NOT EXISTS idx_tutor_blocked_date ON tutor_blocked_dates(blocked_date);

-- =====================================================
-- 6. WEBHOOK LOGS TABLE
-- =====================================================
-- Track all webhook events from Paystack for debugging and audit
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_type TEXT NOT NULL,
  payment_reference TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_reference ON webhook_logs(payment_reference);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_processed ON webhook_logs(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- =====================================================
-- 7. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
DROP TRIGGER IF EXISTS update_payment_plans_updated_at ON payment_plans;
CREATE TRIGGER update_payment_plans_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tutor_availability_updated_at ON tutor_availability;
CREATE TRIGGER update_tutor_availability_updated_at
  BEFORE UPDATE ON tutor_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Payment Plans: Public read access
CREATE POLICY "Anyone can view payment plans"
  ON payment_plans FOR SELECT
  USING (is_active = true);

-- Payments: Users can view their own payments
CREATE POLICY "Users can view their own payments"
  ON payments FOR SELECT
  USING (auth.uid() = user_id);

-- Payments: Service role can manage all payments
CREATE POLICY "Service role can manage payments"
  ON payments FOR ALL
  USING (auth.role() = 'service_role');

-- Bookings: Users can view their own bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = tutor_id);

-- Bookings: Users can update their own bookings
CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = tutor_id);

-- Tutor Availability: Anyone can view available slots
CREATE POLICY "Anyone can view tutor availability"
  ON tutor_availability FOR SELECT
  USING (is_available = true);

-- Tutor Availability: Tutors can manage their own availability
CREATE POLICY "Tutors can manage their own availability"
  ON tutor_availability FOR ALL
  USING (auth.uid() = tutor_id);

-- Webhook logs: Only service role can access
CREATE POLICY "Only service role can access webhook logs"
  ON webhook_logs FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 9. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a time slot is available for a tutor
CREATE OR REPLACE FUNCTION is_tutor_available(
  p_tutor_id UUID,
  p_date DATE,
  p_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  v_day_of_week INTEGER;
  v_is_blocked BOOLEAN;
  v_has_booking BOOLEAN;
  v_has_availability BOOLEAN;
BEGIN
  -- Get day of week (0 = Sunday)
  v_day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Check if date is blocked
  SELECT EXISTS(
    SELECT 1 FROM tutor_blocked_dates
    WHERE tutor_id = p_tutor_id AND blocked_date = p_date
  ) INTO v_is_blocked;
  
  IF v_is_blocked THEN
    RETURN FALSE;
  END IF;
  
  -- Check if tutor has existing booking at this time
  SELECT EXISTS(
    SELECT 1 FROM bookings
    WHERE tutor_id = p_tutor_id 
      AND scheduled_date = p_date 
      AND scheduled_time = p_time
      AND booking_status NOT IN ('cancelled', 'no_show')
  ) INTO v_has_booking;
  
  IF v_has_booking THEN
    RETURN FALSE;
  END IF;
  
  -- Check if tutor has availability configured for this day/time
  SELECT EXISTS(
    SELECT 1 FROM tutor_availability
    WHERE tutor_id = p_tutor_id
      AND day_of_week = v_day_of_week
      AND p_time BETWEEN start_time AND end_time
      AND is_available = true
      AND p_date >= effective_from
      AND (effective_until IS NULL OR p_date <= effective_until)
  ) INTO v_has_availability;
  
  RETURN v_has_availability;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for active bookings with full details
CREATE OR REPLACE VIEW active_bookings_view AS
SELECT 
  b.id,
  b.payment_id,
  b.session_number,
  b.scheduled_date,
  b.scheduled_time,
  b.booking_status,
  b.subject,
  b.duration_minutes,
  
  -- Student info
  b.user_id as student_id,
  u_student.email as student_email,
  u_student.raw_user_meta_data->>'name' as student_name,
  
  -- Tutor info
  b.tutor_id,
  u_tutor.email as tutor_email,
  u_tutor.raw_user_meta_data->>'name' as tutor_name,
  
  -- Plan info
  pp.name as plan_name,
  pp.plan_type,
  
  -- Payment info
  p.payment_status,
  p.amount_naira,
  
  b.created_at,
  b.updated_at
FROM bookings b
JOIN auth.users u_student ON b.user_id = u_student.id
JOIN auth.users u_tutor ON b.tutor_id = u_tutor.id
JOIN payment_plans pp ON b.plan_id = pp.id
JOIN payments p ON b.payment_id = p.id
WHERE b.booking_status NOT IN ('cancelled', 'completed');

-- View for payment summary
CREATE OR REPLACE VIEW payment_summary_view AS
SELECT 
  p.id,
  p.payment_reference,
  p.amount_naira,
  p.payment_status,
  p.paid_at,
  p.created_at,
  
  -- User info
  u.email as student_email,
  u.raw_user_meta_data->>'name' as student_name,
  
  -- Plan info
  pp.name as plan_name,
  pp.plan_type,
  pp.sessions_count,
  
  -- Booking count
  (SELECT COUNT(*) FROM bookings WHERE payment_id = p.id) as bookings_created,
  (SELECT COUNT(*) FROM bookings WHERE payment_id = p.id AND booking_status = 'completed') as sessions_completed
  
FROM payments p
JOIN auth.users u ON p.user_id = u.id
JOIN payment_plans pp ON p.plan_id = pp.id;

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- All tables, indexes, triggers, and RLS policies are configured
