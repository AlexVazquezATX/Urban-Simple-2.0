-- Communications Hub: unified message store (mirrors CommMessage in
-- prisma/schema.prisma). Idempotent. Apply with:
--   npm run apply-sql -- scripts/apply-comms-schema.sql

CREATE TABLE IF NOT EXISTS "comm_messages" (
  "id"                TEXT PRIMARY KEY,
  "company_id"        TEXT NOT NULL,
  "direction"         TEXT NOT NULL,
  "channel"           TEXT NOT NULL DEFAULT 'email',
  "category"          TEXT NOT NULL,
  "from_email"        TEXT,
  "to_email"          TEXT,
  "subject"           TEXT,
  "body"              TEXT,
  "prospect_id"       TEXT,
  "client_id"         TEXT,
  "invoice_id"        TEXT,
  "user_id"           TEXT,
  "resend_email_id"   TEXT,
  "message_id_header" TEXT,
  "thread_key"        TEXT,
  "status"            TEXT NOT NULL DEFAULT 'logged',
  "sent_at"           TIMESTAMP(3),
  "delivered_at"      TIMESTAMP(3),
  "opened_at"         TIMESTAMP(3),
  "clicked_at"        TIMESTAMP(3),
  "bounced_at"        TIMESTAMP(3),
  "received_at"       TIMESTAMP(3),
  "triage_state"      TEXT,
  "assigned_to_id"    TEXT,
  "snoozed_until"     TIMESTAMP(3),
  "ai_category"       TEXT,
  "ai_summary"        TEXT,
  "source_type"       TEXT,
  "source_id"         TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "comm_messages_resend_email_id_key" ON "comm_messages"("resend_email_id");
CREATE UNIQUE INDEX IF NOT EXISTS "comm_messages_source_type_source_id_key" ON "comm_messages"("source_type", "source_id");
CREATE INDEX IF NOT EXISTS "comm_messages_company_id_created_at_idx" ON "comm_messages"("company_id", "created_at");
CREATE INDEX IF NOT EXISTS "comm_messages_company_id_direction_triage_state_idx" ON "comm_messages"("company_id", "direction", "triage_state");
CREATE INDEX IF NOT EXISTS "comm_messages_client_id_idx" ON "comm_messages"("client_id");
CREATE INDEX IF NOT EXISTS "comm_messages_prospect_id_idx" ON "comm_messages"("prospect_id");
CREATE INDEX IF NOT EXISTS "comm_messages_to_email_idx" ON "comm_messages"("to_email");
CREATE INDEX IF NOT EXISTS "comm_messages_from_email_idx" ON "comm_messages"("from_email");
CREATE INDEX IF NOT EXISTS "comm_messages_thread_key_idx" ON "comm_messages"("thread_key");
