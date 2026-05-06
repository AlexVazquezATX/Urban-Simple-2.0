-- Portal compliance binder: per-client document storage. Idempotent.

CREATE TABLE IF NOT EXISTS "portal_documents" (
  "id"                    TEXT NOT NULL,
  "client_id"             TEXT NOT NULL,
  "uploaded_by_id"        TEXT,
  "category"              TEXT NOT NULL DEFAULT 'other',
  "name"                  TEXT NOT NULL,
  "description"           TEXT,
  "file_url"              TEXT NOT NULL,
  "file_path"             TEXT NOT NULL,
  "file_size"             INTEGER,
  "mime_type"             TEXT,
  "expires_at"            TIMESTAMP(3),
  "uploaded_from_portal"  BOOLEAN NOT NULL DEFAULT false,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "portal_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "portal_documents_client_id_category_idx"
  ON "portal_documents"("client_id", "category");
CREATE INDEX IF NOT EXISTS "portal_documents_client_id_expires_at_idx"
  ON "portal_documents"("client_id", "expires_at");

DO $$ BEGIN
  ALTER TABLE "portal_documents" ADD CONSTRAINT "portal_documents_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "portal_documents" ADD CONSTRAINT "portal_documents_uploaded_by_id_fkey"
    FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
