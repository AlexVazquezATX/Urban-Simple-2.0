-- Phase 4: portal subscription state on Client. Idempotent.

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "is_self_serve"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "portal_plan"             TEXT,
  ADD COLUMN IF NOT EXISTS "portal_status"           TEXT,
  ADD COLUMN IF NOT EXISTS "portal_trial_ends_at"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "portal_subscription_id"  TEXT,
  ADD COLUMN IF NOT EXISTS "portal_signup_origin"    TEXT;
