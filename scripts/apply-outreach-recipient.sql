-- Pin each outreach message to the contact it is addressed to.
-- Additive and idempotent; apply BEFORE deploying the code that reads it:
--   npm run apply-sql -- scripts/apply-outreach-recipient.sql

ALTER TABLE "outreach_messages" ADD COLUMN IF NOT EXISTS "contact_id" TEXT;
ALTER TABLE "outreach_messages" ADD COLUMN IF NOT EXISTS "recipient_email" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'outreach_messages_contact_id_fkey'
  ) THEN
    ALTER TABLE "outreach_messages"
      ADD CONSTRAINT "outreach_messages_contact_id_fkey"
      FOREIGN KEY ("contact_id") REFERENCES "prospect_contacts"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "outreach_messages_contact_id_idx" ON "outreach_messages"("contact_id");
