-- Admin audit log for tracking all admin actions on the platform
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID NOT NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_actor_id   ON admin_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_action     ON admin_audit_log (action);
