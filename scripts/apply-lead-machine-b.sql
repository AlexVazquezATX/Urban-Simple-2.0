-- Lead machine Phase B: per-account research, contact finding and first drafts.
-- Additive and idempotent; apply BEFORE deploying the code that reads it:
--   npm run apply-sql -- scripts/apply-lead-machine-b.sql

ALTER TABLE "lead_machine_settings"
  ADD COLUMN IF NOT EXISTS "prep_daily_cap" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS "findymail_monthly_cap" INTEGER NOT NULL DEFAULT 500;

-- Research looks up each account on Google (one call apiece), so the shared
-- monthly Google cap needs room for it. Only raises the original default.
UPDATE "lead_machine_settings" SET "places_monthly_call_cap" = 600 WHERE "places_monthly_call_cap" = 300;
ALTER TABLE "lead_machine_settings" ALTER COLUMN "places_monthly_call_cap" SET DEFAULT 600;

CREATE TABLE IF NOT EXISTS "prospect_research" (
  "prospect_id" TEXT PRIMARY KEY REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "company_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "packet" JSONB NOT NULL,
  "contacts_found" INTEGER NOT NULL DEFAULT 0,
  "draft_message_id" TEXT,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "researched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revisit_after" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "prospect_research_company_id_status_researched_at_idx"
  ON "prospect_research"("company_id", "status", "researched_at");
