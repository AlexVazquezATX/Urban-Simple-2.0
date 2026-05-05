-- Monthly financial snapshots — one row per (company, year, month) capturing
-- a frozen point-in-time of company-wide totals. Drives the trend charts.
-- Idempotent.

CREATE TABLE IF NOT EXISTS "monthly_financial_snapshots" (
  "id"                     TEXT NOT NULL,
  "company_id"             TEXT NOT NULL,
  "period_year"            INTEGER NOT NULL,
  "period_month"           INTEGER NOT NULL,
  "monthly_revenue"        DECIMAL(12, 2) NOT NULL,
  "monthly_client_cost"    DECIMAL(12, 2) NOT NULL,
  "monthly_overhead"       DECIMAL(12, 2) NOT NULL,
  "net_cash_flow"          DECIMAL(12, 2) NOT NULL,
  "active_agreement_count" INTEGER NOT NULL,
  "active_expense_count"   INTEGER NOT NULL,
  "captured_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "monthly_financial_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "monthly_financial_snapshots_company_year_month_key"
  ON "monthly_financial_snapshots"("company_id", "period_year", "period_month");

CREATE INDEX IF NOT EXISTS "monthly_financial_snapshots_company_year_month_idx"
  ON "monthly_financial_snapshots"("company_id", "period_year", "period_month");

DO $$ BEGIN
  ALTER TABLE "monthly_financial_snapshots" ADD CONSTRAINT "monthly_financial_snapshots_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
