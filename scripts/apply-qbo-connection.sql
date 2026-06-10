-- QuickBooks Online connection storage (one row per company).
-- Idempotent. Apply with:
--   npx prisma db execute --file scripts/apply-qbo-connection.sql --schema prisma/schema.prisma

CREATE TABLE IF NOT EXISTS "qbo_connections" (
  "id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "realm_id" TEXT NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT NOT NULL,
  "access_token_expires_at" TIMESTAMP(3) NOT NULL,
  "refresh_token_expires_at" TIMESTAMP(3) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "connected_by_id" TEXT,
  "last_sync_at" TIMESTAMP(3),
  "last_sync_status" TEXT,
  "last_sync_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "qbo_connections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "qbo_connections" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "qbo_connections" ADD COLUMN IF NOT EXISTS "connected_by_id" TEXT;
ALTER TABLE "qbo_connections" ADD COLUMN IF NOT EXISTS "last_sync_status" TEXT;
ALTER TABLE "qbo_connections" ADD COLUMN IF NOT EXISTS "last_sync_error" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "qbo_connections_company_id_key" ON "qbo_connections"("company_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'qbo_connections_company_id_fkey'
  ) THEN
    ALTER TABLE "qbo_connections"
      ADD CONSTRAINT "qbo_connections_company_id_fkey"
      FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
