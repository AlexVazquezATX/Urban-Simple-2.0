-- API key source-IP allowlist (empty array = no restriction).
-- Supports binding a key (e.g. the Mercury agent's) to a fixed source IP.
-- Idempotent. Apply with:
--   npx prisma db execute --file scripts/apply-merc-ip-allowlist.sql --schema prisma/schema.prisma

ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "allowed_ips" TEXT[] NOT NULL DEFAULT '{}';
