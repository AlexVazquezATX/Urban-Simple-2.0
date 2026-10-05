-- Additive website receipt/outbox schema. Apply only to the approved database:
-- npm run apply-sql -- scripts/apply-lead-intake.sql
-- Uses the repository's established SQL rollout path (other tables have drifted
-- beyond the historical Prisma migration baseline). Does not touch CRM rows.
-- scripts/apply-sql.ts wraps this entire file in one transaction.
CREATE TABLE IF NOT EXISTS "lead_intakes" (
  "id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "prospect_id" TEXT NOT NULL REFERENCES "prospects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "submission_id" TEXT NOT NULL,
  "payload_hash" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "lead_intakes_submission_id_key" ON "lead_intakes"("submission_id");
CREATE INDEX IF NOT EXISTS "lead_intakes_company_id_payload_hash_created_at_idx" ON "lead_intakes"("company_id", "payload_hash", "created_at");
CREATE INDEX IF NOT EXISTS "lead_intakes_prospect_id_idx" ON "lead_intakes"("prospect_id");

CREATE TABLE IF NOT EXISTS "lead_deliveries" (
  "id" TEXT PRIMARY KEY,
  "intake_id" TEXT NOT NULL REFERENCES "lead_intakes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind" TEXT NOT NULL CHECK ("kind" IN ('notification', 'autoresponder', 'enrollment')),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'processing', 'sent', 'failed')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_until" TIMESTAMP(3),
  "lock_token" TEXT,
  "first_attempt_at" TIMESTAMP(3),
  "last_error" TEXT,
  "provider_id" TEXT,
  "request" JSONB,
  "sent_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "lead_deliveries_intake_id_kind_key" ON "lead_deliveries"("intake_id", "kind");
CREATE INDEX IF NOT EXISTS "lead_deliveries_status_next_attempt_at_idx" ON "lead_deliveries"("status", "next_attempt_at");
CREATE INDEX IF NOT EXISTS "lead_deliveries_status_locked_until_idx" ON "lead_deliveries"("status", "locked_until");

-- Server-only PII. Prisma's database owner/service connection bypasses RLS;
-- browser anon/authenticated roles have no direct policies for these tables.
ALTER TABLE "lead_intakes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_deliveries" ENABLE ROW LEVEL SECURITY;
