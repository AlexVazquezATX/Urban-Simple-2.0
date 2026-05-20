-- Separate owner draws from operating expenses.
--
-- recurring_expenses.expense_type classifies each row as 'operating' (a real
-- business cost) or 'owner_draw' (a distribution to the owners). The financials
-- dashboard keeps owner draws out of operating profit.
--
-- monthly_financial_snapshots.owner_draws stores the owner-draw slice of a
-- month's overhead so the split survives in history. monthly_overhead keeps its
-- existing all-in meaning, so operating expenses = monthly_overhead - owner_draws.
--
-- Additive and idempotent — safe to run more than once.

ALTER TABLE "recurring_expenses"
  ADD COLUMN IF NOT EXISTS "expense_type" TEXT NOT NULL DEFAULT 'operating';

ALTER TABLE "monthly_financial_snapshots"
  ADD COLUMN IF NOT EXISTS "owner_draws" DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Tag the existing owner-draw rows. Best-effort match by name; if these were
-- renamed this updates nothing — set the type from the expense form instead.
UPDATE "recurring_expenses"
  SET "expense_type" = 'owner_draw'
  WHERE "name" IN ('Alex''s Monthly Salary', 'Demian''s Monthly Salary');
