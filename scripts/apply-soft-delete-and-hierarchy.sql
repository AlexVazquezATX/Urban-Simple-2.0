-- Phase A + B foundations:
--   * Soft delete on Client + Location (mirrors Prospect pattern)
--   * Self-referential parentClientId on Client for parent-org hierarchy
-- Idempotent.

ALTER TABLE "clients"
  ADD COLUMN IF NOT EXISTS "deleted_at"        TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_id"     TEXT,
  ADD COLUMN IF NOT EXISTS "parent_client_id"  TEXT;

ALTER TABLE "locations"
  ADD COLUMN IF NOT EXISTS "deleted_at"     TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by_id"  TEXT;

CREATE INDEX IF NOT EXISTS "clients_parent_client_id_idx"
  ON "clients"("parent_client_id");

DO $$ BEGIN
  ALTER TABLE "clients" ADD CONSTRAINT "clients_parent_client_id_fkey"
    FOREIGN KEY ("parent_client_id") REFERENCES "clients"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
