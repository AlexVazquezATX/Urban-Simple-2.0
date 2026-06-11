-- Per-task time logging + completion percent.
-- Idempotent. Apply with:
--   npx prisma db execute --file scripts/apply-task-time-tracking.sql --schema prisma/schema.prisma

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "logged_minutes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completion_percent" INTEGER NOT NULL DEFAULT 0;
