-- Autopilot outreach + prospect soft-delete schema additions.
-- Applied manually via `prisma db execute` because the full `prisma db push`
-- would have side-effects on unrelated drift (workforce WIP, legacy qbo_connections).
-- Idempotent: uses IF NOT EXISTS so re-running is safe.

-- Companies: autopilot settings
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "default_autopilot_campaign_id" TEXT,
  ADD COLUMN IF NOT EXISTS "autopilot_daily_cap" INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS "autopilot_send_hour_start" INTEGER NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS "autopilot_send_hour_end" INTEGER NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS "autopilot_send_days_of_week" INTEGER[] DEFAULT ARRAY[2, 3, 4, 5, 6]::INTEGER[];

-- Outreach campaigns: autopilot flag
ALTER TABLE "outreach_campaigns"
  ADD COLUMN IF NOT EXISTS "autopilot" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "outreach_campaigns_company_id_autopilot_idx"
  ON "outreach_campaigns"("company_id", "autopilot");

-- Prospects: soft delete
ALTER TABLE "prospects"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
