-- OAuth 2.1 authorization-server tables for remote MCP connectors
-- (claude.ai web/mobile, Claude Code). Mirrors the OAuthClient /
-- OAuthAuthorizationCode / OAuthToken models in prisma/schema.prisma.
-- Idempotent. Apply with:
--   npm run apply-sql -- scripts/apply-oauth-schema.sql

CREATE TABLE IF NOT EXISTS "oauth_clients" (
  "id"                         TEXT PRIMARY KEY,
  "client_name"                TEXT,
  "client_uri"                 TEXT,
  "redirect_uris"              TEXT[] NOT NULL DEFAULT '{}',
  "token_endpoint_auth_method" TEXT NOT NULL DEFAULT 'none',
  "client_secret_hash"         TEXT,
  "created_ip"                 TEXT,
  "last_used_at"               TIMESTAMP(3),
  "created_at"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "oauth_authorization_codes" (
  "id"                    TEXT PRIMARY KEY,
  "code_hash"             TEXT NOT NULL,
  "client_id"             TEXT NOT NULL,
  "user_id"               TEXT NOT NULL,
  "redirect_uri"          TEXT NOT NULL,
  "code_challenge"        TEXT NOT NULL,
  "code_challenge_method" TEXT NOT NULL DEFAULT 'S256',
  "scope"                 TEXT NOT NULL,
  "resource"              TEXT,
  "expires_at"            TIMESTAMP(3) NOT NULL,
  "used_at"               TIMESTAMP(3),
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oauth_authorization_codes_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "oauth_authorization_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_authorization_codes_code_hash_key" ON "oauth_authorization_codes"("code_hash");
CREATE INDEX IF NOT EXISTS "oauth_authorization_codes_user_id_idx" ON "oauth_authorization_codes"("user_id");
CREATE INDEX IF NOT EXISTS "oauth_authorization_codes_expires_at_idx" ON "oauth_authorization_codes"("expires_at");

CREATE TABLE IF NOT EXISTS "oauth_tokens" (
  "id"                 TEXT PRIMARY KEY,
  "access_token_hash"  TEXT NOT NULL,
  "refresh_token_hash" TEXT,
  "client_id"          TEXT NOT NULL,
  "user_id"            TEXT NOT NULL,
  "scope"              TEXT NOT NULL,
  "scopes"             TEXT[] NOT NULL DEFAULT '{}',
  "access_expires_at"  TIMESTAMP(3) NOT NULL,
  "refresh_expires_at" TIMESTAMP(3),
  "revoked_at"         TIMESTAMP(3),
  "last_used_at"       TIMESTAMP(3),
  "last_used_ip"       TEXT,
  "usage_count"        INTEGER NOT NULL DEFAULT 0,
  "created_ip"         TEXT,
  "created_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "oauth_tokens_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "oauth_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_tokens_access_token_hash_key" ON "oauth_tokens"("access_token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_tokens_refresh_token_hash_key" ON "oauth_tokens"("refresh_token_hash");
CREATE INDEX IF NOT EXISTS "oauth_tokens_user_id_idx" ON "oauth_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "oauth_tokens_client_id_idx" ON "oauth_tokens"("client_id");
