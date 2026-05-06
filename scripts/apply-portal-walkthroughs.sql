-- Portal-side daily walkthroughs (GM-driven). Idempotent.

CREATE TABLE IF NOT EXISTS "portal_walkthroughs" (
  "id"                TEXT NOT NULL,
  "client_id"         TEXT NOT NULL,
  "location_id"       TEXT NOT NULL,
  "completed_by_id"   TEXT NOT NULL,
  "zones"             JSONB NOT NULL DEFAULT '[]',
  "notes"             TEXT,
  "photo_count"       INTEGER NOT NULL DEFAULT 0,
  "overall_rating"    TEXT,
  "captured_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "portal_walkthroughs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "portal_walkthroughs_client_id_captured_at_idx"
  ON "portal_walkthroughs"("client_id", "captured_at");
CREATE INDEX IF NOT EXISTS "portal_walkthroughs_location_id_captured_at_idx"
  ON "portal_walkthroughs"("location_id", "captured_at");

DO $$ BEGIN
  ALTER TABLE "portal_walkthroughs" ADD CONSTRAINT "portal_walkthroughs_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "portal_walkthroughs" ADD CONSTRAINT "portal_walkthroughs_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "portal_walkthroughs" ADD CONSTRAINT "portal_walkthroughs_completed_by_id_fkey"
    FOREIGN KEY ("completed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
