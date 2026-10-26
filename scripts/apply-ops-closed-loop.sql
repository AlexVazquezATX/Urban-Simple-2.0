-- Ops closed loop: associate "not done" flags, client contact alert routing,
-- SMS opt-in, issue typing/visibility, client visit ratings. Idempotent and
-- purely additive (safe to run before or after the matching code deploys).
--
--   npm run apply-sql -- scripts/apply-ops-closed-loop.sql

-- Users: SMS alert opt-in + field-screen language
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sms_alerts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" TEXT NOT NULL DEFAULT 'en';

-- Client contacts: per-location alert routing + channel opt-ins
ALTER TABLE "client_contacts" ADD COLUMN IF NOT EXISTS "location_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "client_contacts" ADD COLUMN IF NOT EXISTS "alert_email" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "client_contacts" ADD COLUMN IF NOT EXISTS "alert_sms" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "client_contacts" ADD COLUMN IF NOT EXISTS "sms_consent_at" TIMESTAMP(3);
ALTER TABLE "client_contacts" ADD COLUMN IF NOT EXISTS "sms_opted_out_at" TIMESTAMP(3);

-- Service logs: associate-flagged unfinished items
ALTER TABLE "service_logs" ADD COLUMN IF NOT EXISTS "incomplete_items" JSONB DEFAULT '[]';
ALTER TABLE "service_logs" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3);

-- Issues: type / source / client visibility / request date
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'issue';
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "visible_to_client" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "client_notified_at" TIMESTAMP(3);
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "preferred_date" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "issues_client_id_status_idx" ON "issues"("client_id", "status");
CREATE INDEX IF NOT EXISTS "issues_location_id_created_at_idx" ON "issues"("location_id", "created_at");

-- Notifications (in-app bell)
CREATE INDEX IF NOT EXISTS "notifications_user_id_is_read_created_at_idx"
  ON "notifications"("user_id", "is_read", "created_at");

-- Client visit ratings
CREATE TABLE IF NOT EXISTS "client_visit_ratings" (
  "id"             TEXT NOT NULL,
  "client_id"      TEXT NOT NULL,
  "location_id"    TEXT NOT NULL,
  "service_log_id" TEXT,
  "shift_id"       TEXT,
  "service_date"   DATE NOT NULL,
  "rating"         INTEGER NOT NULL,
  "comment"        TEXT,
  "created_by_id"  TEXT NOT NULL,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "client_visit_ratings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "client_visit_ratings_created_by_id_location_id_service_date_key"
  ON "client_visit_ratings"("created_by_id", "location_id", "service_date");
CREATE INDEX IF NOT EXISTS "client_visit_ratings_client_id_service_date_idx"
  ON "client_visit_ratings"("client_id", "service_date");

DO $$ BEGIN
  ALTER TABLE "client_visit_ratings" ADD CONSTRAINT "client_visit_ratings_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "client_visit_ratings" ADD CONSTRAINT "client_visit_ratings_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "client_visit_ratings" ADD CONSTRAINT "client_visit_ratings_service_log_id_fkey"
    FOREIGN KEY ("service_log_id") REFERENCES "service_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "client_visit_ratings" ADD CONSTRAINT "client_visit_ratings_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Existing manager-review pain points are internal QA; keep them off the
-- client portal (managers can share individual ones from the issue page).
-- Only touches rows created by nightly reviews before this column existed.
UPDATE "issues" i SET "visible_to_client" = false, "source" = 'manager_review'
WHERE i."source" = 'staff'
  AND EXISTS (
    SELECT 1 FROM "service_reviews" r
    WHERE r."service_log_id" IS NOT NULL AND r."service_log_id" = i."service_log_id"
  );
