// Imported first by outreach-deliverability.test.ts: email-verification reads
// its API key at import time, so env must be set before that module loads.
process.env.ABSTRACT_API_KEY = 'test-abstract'
delete process.env.HUNTER_API_KEY
process.env.CRON_SECRET = 'test-secret'
process.env.NEXT_PUBLIC_APP_URL = 'https://www.example.test'
process.env.OUTREACH_REPLY_TO = 'reply@in.example.test'
process.env.OUTREACH_POSTAL_ADDRESS = 'Example LLC, PO Box 1, Austin, TX 78701'
