-- Fix the autopilot send-days default (G13).
-- The original default ARRAY[2,3,4,5,6] under the 0=Sun..6=Sat scheme is
-- Tue-Sat — it sends cold email on Saturdays and skips Mondays. The intended
-- business window is Mon-Fri = ARRAY[1,2,3,4,5].
--
-- Prisma applies scalar-list defaults at the DB level and this project uses
-- manual SQL migrations (never `prisma migrate`), so the schema.prisma @default
-- change has no effect without this ALTER. Apply via `prisma db execute`.
-- Idempotent: safe to re-run.

-- 1. Correct the column default for future companies.
ALTER TABLE "companies"
  ALTER COLUMN "autopilot_send_days_of_week" SET DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];

-- 2. Migrate existing companies that still carry the old buggy default so they
--    stop emailing on Saturdays. Only touches rows that were never customized
--    (still exactly the old Tue-Sat default); leaves any hand-tuned window alone.
UPDATE "companies"
  SET "autopilot_send_days_of_week" = ARRAY[1, 2, 3, 4, 5]::INTEGER[]
  WHERE "autopilot_send_days_of_week" = ARRAY[2, 3, 4, 5, 6]::INTEGER[];
