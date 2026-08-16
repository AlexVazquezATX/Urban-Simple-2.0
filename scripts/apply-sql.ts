// Apply an idempotent scripts/apply-*.sql file against the database.
//
// Why: this repo does NOT use `prisma migrate` (abandoned/drifted history —
// see docs). Schema changes ship as idempotent SQL files. The Prisma CLI can't
// see .env.local, so this tiny runner loads it and executes the file over `pg`
// (multi-statement simple query; DIRECT_URL preferred to bypass the pooler).
//
// Usage:
//   npm run apply-sql -- scripts/apply-oauth-schema.sql
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { Client } from 'pg'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const file = process.argv[2]
if (!file) {
  console.error('Usage: npm run apply-sql -- <path/to/file.sql>')
  process.exit(2)
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('DIRECT_URL / DATABASE_URL not set (expected in .env.local)')
  process.exit(2)
}

const sql = readFileSync(resolve(process.cwd(), file), 'utf8')
const client = new Client({ connectionString })

async function main() {
  await client.connect()
  const host = new URL(connectionString!).host
  console.log(`Applying ${file} → ${host}`)
  await client.query('BEGIN')
  try {
    await client.query(sql)
    await client.query('COMMIT')
    console.log('✅ Applied successfully')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

main()
  .catch((e) => {
    console.error('❌ apply-sql failed:', e)
    process.exit(1)
  })
  .finally(() => client.end())
