// Provision the "Mercury" (Merc) agent: a key-only SUPER_ADMIN service account
// for Urban Simple, plus an API key for it.
//
// Usage:
//   npm run setup-merc                     # ensure account + mint a key if none exists
//   npm run setup-merc -- --rotate         # revoke existing Merc keys + mint a fresh one
//   npm run setup-merc -- --ip=203.0.113.7 # pin the active key to source IP(s) (comma-sep)
//
// The raw key is printed ONCE and never recoverable — store it immediately.
import { config } from 'dotenv'
import { resolve } from 'path'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

// Env lives in .env.local (Next convention); fall back to .env.
config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

const MERC_EMAIL = 'merc@urbansimple.net'
const KEY_NAME = 'Mercury (Telegram agent)'
const KEY_PREFIX = 'us_live_'

function generateRawApiKey(): string {
  return KEY_PREFIX + crypto.randomBytes(32).toString('hex')
}
function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

function parseArgs(argv: string[]) {
  const rotate = argv.includes('--rotate')
  const ipArg = argv.find((a) => a.startsWith('--ip='))
  const allowedIps = ipArg
    ? ipArg
        .slice('--ip='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null // null = leave as-is / unrestricted
  return { rotate, allowedIps }
}

async function resolveCompanyId(): Promise<string> {
  // Most robust: share Alex's company.
  const alex = await prisma.user.findFirst({
    where: { email: 'alex@urbansimple.net' },
    select: { companyId: true },
  })
  if (alex?.companyId) return alex.companyId

  if (process.env.MERC_COMPANY_ID) return process.env.MERC_COMPANY_ID

  const byName = await prisma.company.findFirst({
    where: { name: { contains: 'Urban', mode: 'insensitive' } },
    select: { id: true, name: true },
  })
  if (byName) return byName.id

  throw new Error(
    'Could not determine Urban Simple company id. Set MERC_COMPANY_ID or ensure alex@urbansimple.net exists.',
  )
}

async function main() {
  const { rotate, allowedIps } = parseArgs(process.argv.slice(2))
  console.log('🪐 Provisioning Mercury (Merc) agent...\n')

  const companyId = await resolveCompanyId()

  // 1. Ensure the key-only SUPER_ADMIN service account (authId stays null).
  const merc = await prisma.user.upsert({
    where: { email: MERC_EMAIL },
    update: { role: 'SUPER_ADMIN', isActive: true },
    create: {
      email: MERC_EMAIL,
      authId: null, // key-only: Merc can never hold a browser session
      companyId,
      firstName: 'Mercury',
      lastName: 'Agent',
      displayName: 'Merc',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: { id: true, email: true, role: true, companyId: true },
  })
  console.log(`✅ Service account: ${merc.email}  (id=${merc.id}, role=${merc.role})`)

  // 2. Look at existing active keys for Merc.
  const activeKeys = await prisma.apiKey.findMany({
    where: { userId: merc.id, isActive: true, revokedAt: null },
    select: { id: true, keyPrefix: true, allowedIps: true, scopes: true },
  })

  // 2a. Pin-only operation: --ip given, a key exists, not rotating → update IPs.
  if (allowedIps && !rotate && activeKeys.length > 0) {
    await prisma.apiKey.updateMany({
      where: { userId: merc.id, isActive: true, revokedAt: null },
      data: { allowedIps },
    })
    console.log(
      `\n🔒 Pinned ${activeKeys.length} active Merc key(s) to allowedIps: [${allowedIps.join(', ')}]`,
    )
    console.log('   (no new key minted; existing key value is unchanged)')
    return
  }

  // 2b. Key already exists and we're not rotating → nothing to mint.
  if (activeKeys.length > 0 && !rotate) {
    console.log(`\nℹ️  An active Merc key already exists (id=${activeKeys[0].id}, ${activeKeys[0].keyPrefix}…).`)
    console.log('   The raw value can only be shown at creation time. To replace it:')
    console.log('     npm run setup-merc -- --rotate')
    console.log('   To pin it to an IP:')
    console.log('     npm run setup-merc -- --ip=<your.box.ip>')
    return
  }

  // 2c. Rotating → revoke existing active keys first.
  if (rotate && activeKeys.length > 0) {
    await prisma.apiKey.updateMany({
      where: { userId: merc.id, isActive: true, revokedAt: null },
      data: { isActive: false, revokedAt: new Date() },
    })
    console.log(`🔁 Revoked ${activeKeys.length} previous Merc key(s).`)
  }

  // 3. Mint a fresh key.
  const rawKey = generateRawApiKey()
  const created = await prisma.apiKey.create({
    data: {
      userId: merc.id,
      companyId: merc.companyId,
      name: KEY_NAME,
      description: 'Full-access agent key. SUPER_ADMIN. BackHaus fenced off (no `backhaus` scope).',
      keyHash: hashApiKey(rawKey),
      keyPrefix: rawKey.substring(0, 12),
      scopes: ['*'], // all standard scopes; `backhaus` is opt-in and intentionally absent
      allowedIps: allowedIps ?? [], // [] = unlocked; pin later with --ip
    },
    select: { id: true, scopes: true, allowedIps: true },
  })

  console.log('\n🔑 NEW API KEY (shown once — copy it now):\n')
  console.log(`    ${rawKey}\n`)
  console.log(`    key id:      ${created.id}`)
  console.log(`    scopes:      [${created.scopes.join(', ')}]`)
  console.log(`    allowedIps:  ${created.allowedIps.length ? created.allowedIps.join(', ') : '(unlocked)'}`)
  console.log('\n   Use it as:  Authorization: Bearer ' + rawKey.slice(0, 12) + '…')
  console.log('   Revoke any time:  DELETE /api/growth/api-keys/' + created.id)
}

main()
  .catch((e) => {
    console.error('❌ setup-merc failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
