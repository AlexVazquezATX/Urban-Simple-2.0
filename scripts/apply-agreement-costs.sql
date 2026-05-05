-- Add per-agreement P&L cost fields. Idempotent.
ALTER TABLE "service_agreements"
  ADD COLUMN IF NOT EXISTS "monthly_labor_cost"    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "monthly_material_cost" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "monthly_other_cost"    DECIMAL(10,2);
