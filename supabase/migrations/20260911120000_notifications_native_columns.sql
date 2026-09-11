-- Notifications: Postgres becomes the sole source of truth.
--
-- Until now, notification-broker.tsx (used by most call sites) wrote
-- exclusively to KV, while two spots in payment-routes.tsx wrote exclusively
-- to Postgres via db.createNotification — two separate storage systems,
-- merged back together on every read in notifications-routes.tsx. This adds
-- the columns Postgres was missing to carry everything the KV records held
-- (description, actionUrl, priority, sentVia, readAt), so the KV write path
-- and the read-side merge can both be retired.
--
-- legacy_kv_id lets the one-off backfill of pre-existing KV notification
-- records (see POST /admin/backfill-notifications-to-postgres) be re-run
-- safely without duplicating rows.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_via_email BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS sent_via_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS legacy_kv_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_legacy_kv_id_uidx
  ON notifications (legacy_kv_id)
  WHERE legacy_kv_id IS NOT NULL;
