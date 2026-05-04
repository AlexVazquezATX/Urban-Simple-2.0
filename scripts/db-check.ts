/**
 * db:check — compare prisma/schema.prisma against the live database and
 * report drift. Run before committing schema changes, or as a sanity check
 * before a deploy.
 *
 *   npm run db:check
 *
 * Exits 0 if the DB matches the schema, 1 if there is any drift. Prints the
 * SQL the database is missing (or has extra) so you can decide whether to:
 *   - apply it via `prisma db execute --file scripts/your-migration.sql`
 *   - run `prisma db push` (riskier — applies ALL drift at once)
 *   - update schema.prisma to match the DB (if the DB is the source of truth
 *     for that change)
 */

import 'dotenv/config'
import { execSync } from 'node:child_process'
import path from 'node:path'

const SCHEMA_PATH = path.resolve(process.cwd(), 'prisma/schema.prisma')

function bold(s: string) {
  return `\x1b[1m${s}\x1b[0m`
}
function red(s: string) {
  return `\x1b[31m${s}\x1b[0m`
}
function yellow(s: string) {
  return `\x1b[33m${s}\x1b[0m`
}
function green(s: string) {
  return `\x1b[32m${s}\x1b[0m`
}
function dim(s: string) {
  return `\x1b[2m${s}\x1b[0m`
}

function runPrismaDiff(): string {
  // --from-schema-datasource compares the DB's actual state to
  // --to-schema-datamodel which is what schema.prisma describes.
  // Output is the SQL needed to bring the DB into alignment with schema.prisma.
  const cmd =
    `npx prisma migrate diff` +
    ` --from-schema-datasource "${SCHEMA_PATH}"` +
    ` --to-schema-datamodel "${SCHEMA_PATH}"` +
    ` --script`

  try {
    const output = execSync(cmd, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    })
    return output
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(red('Failed to run prisma migrate diff:'))
    console.error(message)
    process.exit(2)
  }
}

function isDestructive(sql: string): boolean {
  return /\b(DROP\s+TABLE|DROP\s+COLUMN|DROP\s+CONSTRAINT|DROP\s+INDEX)\b/i.test(sql)
}

function summarize(sql: string) {
  const lines = sql.split('\n')

  let createTables = 0
  let dropTables = 0
  let alterAdds = 0
  let alterDrops = 0
  let createIndexes = 0
  let dropIndexes = 0
  let foreignKeys = 0
  let other = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('--')) continue
    if (/^CREATE TABLE/i.test(trimmed)) createTables += 1
    else if (/^DROP TABLE/i.test(trimmed)) dropTables += 1
    else if (/^CREATE.*INDEX/i.test(trimmed)) createIndexes += 1
    else if (/^DROP INDEX/i.test(trimmed)) dropIndexes += 1
    else if (/^ALTER TABLE.*ADD CONSTRAINT.*FOREIGN KEY/i.test(trimmed)) foreignKeys += 1
    else if (/ADD COLUMN/i.test(trimmed)) alterAdds += 1
    else if (/DROP COLUMN|DROP CONSTRAINT/i.test(trimmed)) alterDrops += 1
    else other += 1
  }

  return { createTables, dropTables, alterAdds, alterDrops, createIndexes, dropIndexes, foreignKeys, other }
}

function main() {
  console.log(dim('Running prisma migrate diff against live database...'))
  console.log('')

  const diff = runPrismaDiff().trim()

  // Prisma prints `-- This is an empty migration.` when there is no diff but
  // it still emits a one-line stub. Treat that as a clean state.
  const meaningfulLines = diff
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('--'))

  if (meaningfulLines.length === 0) {
    console.log(green('✓ Database matches schema.prisma. No drift.'))
    process.exit(0)
  }

  const counts = summarize(diff)
  const destructive = isDestructive(diff)

  console.log(bold(red('✗ Drift detected between schema.prisma and the live database.')))
  console.log('')
  console.log(bold('Summary:'))
  if (counts.createTables) console.log(`  ${green('+')} ${counts.createTables} new table(s) to create`)
  if (counts.dropTables) console.log(`  ${red('-')} ${counts.dropTables} table(s) to drop`)
  if (counts.alterAdds) console.log(`  ${green('+')} ${counts.alterAdds} column(s) to add`)
  if (counts.alterDrops) console.log(`  ${red('-')} ${counts.alterDrops} column(s)/constraint(s) to drop`)
  if (counts.createIndexes) console.log(`  ${green('+')} ${counts.createIndexes} index(es) to create`)
  if (counts.dropIndexes) console.log(`  ${red('-')} ${counts.dropIndexes} index(es) to drop`)
  if (counts.foreignKeys) console.log(`  ${green('+')} ${counts.foreignKeys} foreign key(s) to add`)
  if (counts.other) console.log(`  ${dim('?')} ${counts.other} other statement(s)`)
  console.log('')

  if (destructive) {
    console.log(bold(red('⚠ Drift includes destructive operations (DROP). Review before applying.')))
    console.log('')
  }

  console.log(bold('Required SQL:'))
  console.log(dim('─'.repeat(60)))
  console.log(diff)
  console.log(dim('─'.repeat(60)))
  console.log('')
  console.log(bold('Next steps:'))
  console.log('  ' + yellow('1.') + ' Decide whether the DB should match schema, or vice versa.')
  console.log('  ' + yellow('2.') + ' To apply schema → DB: write SQL into ' + bold('scripts/your-migration.sql') + ',')
  console.log('     then run: ' + bold('npx prisma db execute --file scripts/your-migration.sql --schema prisma/schema.prisma'))
  console.log('  ' + yellow('3.') + ' Or to bulk-apply (risky): ' + bold('npx prisma db push'))
  console.log('  ' + yellow('4.') + ' To roll the schema back to match the DB: edit prisma/schema.prisma manually.')
  console.log('')

  process.exit(1)
}

main()
