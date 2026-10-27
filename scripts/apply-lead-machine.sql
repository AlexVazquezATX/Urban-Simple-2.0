-- Lead machine Phase A: settings, run log, prospect signals.
-- Additive and idempotent; apply BEFORE deploying the code that reads it:
--   npm run apply-sql -- scripts/apply-lead-machine.sql

CREATE TABLE IF NOT EXISTS "lead_machine_settings" (
  "company_id" TEXT PRIMARY KEY REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "dry_run" BOOLEAN NOT NULL DEFAULT true,
  "daily_new_cap" INTEGER NOT NULL DEFAULT 25,
  "source_caps" JSONB NOT NULL DEFAULT '{}',
  "places_monthly_call_cap" INTEGER NOT NULL DEFAULT 300,
  "brief_enabled" BOOLEAN NOT NULL DEFAULT true,
  "notify_email" TEXT,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "lead_machine_runs" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "stage" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "dry_run" BOOLEAN NOT NULL DEFAULT false,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  "stats" JSONB,
  "error" TEXT
);
CREATE INDEX IF NOT EXISTS "lead_machine_runs_company_id_stage_started_at_idx"
  ON "lead_machine_runs"("company_id", "stage", "started_at");

CREATE TABLE IF NOT EXISTS "prospect_signals" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "prospect_id" TEXT REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "kind" TEXT NOT NULL,
  "source_key" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "prospect_signals_company_id_source_key_key"
  ON "prospect_signals"("company_id", "source_key");
CREATE INDEX IF NOT EXISTS "prospect_signals_prospect_id_idx" ON "prospect_signals"("prospect_id");
CREATE INDEX IF NOT EXISTS "prospect_signals_company_id_kind_observed_at_idx"
  ON "prospect_signals"("company_id", "kind", "observed_at");
