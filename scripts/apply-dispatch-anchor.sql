-- Add optional explicit anchor date for biweekly/monthly cadences.
-- Idempotent.

ALTER TABLE "location_service_profiles"
  ADD COLUMN IF NOT EXISTS "service_anchor_date" DATE;
