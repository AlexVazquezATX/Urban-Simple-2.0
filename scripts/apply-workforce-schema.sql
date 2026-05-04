-- Apply workforce compliance schema additions to align production DB with the
-- committed Prisma schema. Idempotent — uses IF NOT EXISTS / DO blocks.
--
-- Why this is needed: schema.prisma was committed with workforce models and
-- columns (committed in commit 9d59585), but `db push` was never run against
-- production. This left the deployed Prisma client expecting columns/tables
-- that don't exist, which crashes any query touching LocationAssignment.

-- 1. Add workforce columns to location_assignments
ALTER TABLE "location_assignments"
  ADD COLUMN IF NOT EXISTS "estimated_hours_per_visit" DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS "cleaning_window_start" TEXT,
  ADD COLUMN IF NOT EXISTS "cleaning_window_end" TEXT,
  ADD COLUMN IF NOT EXISTS "days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "nights_per_week" INTEGER;

-- 2. Create time_entries table
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" TEXT NOT NULL,
  "associate_id" TEXT NOT NULL,
  "location_id" TEXT NOT NULL,
  "assignment_id" TEXT,
  "clock_in" TIMESTAMP(3) NOT NULL,
  "clock_out" TIMESTAMP(3),
  "total_minutes" INTEGER,
  "is_overnight" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'active',
  "edit_history" JSONB DEFAULT '[]',
  "edited_by_id" TEXT,
  "edit_reason" TEXT,
  "flag_reason" TEXT,
  "notes" TEXT,
  "week_start_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "time_entries_associate_id_week_start_date_idx"
  ON "time_entries"("associate_id", "week_start_date");
CREATE INDEX IF NOT EXISTS "time_entries_location_id_clock_in_idx"
  ON "time_entries"("location_id", "clock_in");
CREATE INDEX IF NOT EXISTS "time_entries_status_idx"
  ON "time_entries"("status");

DO $$ BEGIN
  ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_associate_id_fkey"
    FOREIGN KEY ("associate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_assignment_id_fkey"
    FOREIGN KEY ("assignment_id") REFERENCES "location_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_edited_by_id_fkey"
    FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Create weekly_hours_summaries table
CREATE TABLE IF NOT EXISTS "weekly_hours_summaries" (
  "id" TEXT NOT NULL,
  "associate_id" TEXT NOT NULL,
  "week_start_date" DATE NOT NULL,
  "total_minutes" INTEGER NOT NULL DEFAULT 0,
  "total_locations" INTEGER NOT NULL DEFAULT 0,
  "overtime_minutes" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'current',
  "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_hours_summaries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "weekly_hours_summaries_week_start_date_idx"
  ON "weekly_hours_summaries"("week_start_date");
CREATE UNIQUE INDEX IF NOT EXISTS "weekly_hours_summaries_associate_id_week_start_date_key"
  ON "weekly_hours_summaries"("associate_id", "week_start_date");

DO $$ BEGIN
  ALTER TABLE "weekly_hours_summaries" ADD CONSTRAINT "weekly_hours_summaries_associate_id_fkey"
    FOREIGN KEY ("associate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
