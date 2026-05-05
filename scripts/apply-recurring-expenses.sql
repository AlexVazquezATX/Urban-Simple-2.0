-- Recurring expenses (rent, software, insurance, etc.) for the financials
-- dashboard's cash-flow view. Idempotent.

CREATE TABLE IF NOT EXISTS "recurring_expenses" (
  "id"             TEXT NOT NULL,
  "company_id"     TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "category"       TEXT NOT NULL DEFAULT 'other',
  "monthly_amount" DECIMAL(10, 2) NOT NULL,
  "vendor"         TEXT,
  "payment_method" TEXT,
  "billing_day"    INTEGER NOT NULL DEFAULT 1,
  "start_date"     TIMESTAMP(3) NOT NULL,
  "end_date"       TIMESTAMP(3),
  "is_active"      BOOLEAN NOT NULL DEFAULT true,
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "recurring_expenses_company_id_is_active_idx"
  ON "recurring_expenses"("company_id", "is_active");
CREATE INDEX IF NOT EXISTS "recurring_expenses_company_id_category_idx"
  ON "recurring_expenses"("company_id", "category");

DO $$ BEGIN
  ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
