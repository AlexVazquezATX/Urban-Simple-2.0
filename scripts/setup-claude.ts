// Provision the "Claude" agent: a key-only SUPER_ADMIN service account used by
// Claude (via the /api/mcp MCP server) to manage the backend from anywhere.
//
// Mirrors scripts/setup-merc.ts, with one deliberate difference: Claude's key
// carries the opt-in `backhaus` scope, so unlike Merc it is NOT fenced off the
// BackHaus subtree.
//
// Usage:
//   npm run setup-claude                     # ensure account + mint a key if none exists
//   npm run setup-claude -- --rotate         # revoke existing keys + mint a fresh one
//   npm run setup-claude -- --ip=203.0.113.7 # pin the active key to source IP(s) (comma-sep)
//
// The raw key is printed ONCE and never recoverable — store it immediately.
import { config } from 'dotenv'
import { resolve } from 'path'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

const CLAUDE_EMAIL = 'claude@urbansimple.net'
const KEY_NAME = 'Claude (MCP agent)'
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
  const alex = await prisma.user.findFirst({
    where: { email: 'alex@urbansimple.net' },
    select: { companyId: true },
  })
  if (alex?.companyId) return alex.companyId

  const byName = await prisma.company.findFirst({
    where: { name: { contains: 'Urban', mode: 'insensitive' } },
    select: { id: true },
  })
  if (byName) return byName.id

  throw new Error('Could not determine Urban Simple company id (alex@urbansimple.net not found).')
}

async function main() {
  const { rotate, allowedIps } = parseArgs(process.argv.slice(2))
  console.log('🤖 Provisioning Claude (MCP) agent...\n')

  const companyId = await resolveCompanyId()

  // 1. Ensure the key-only SUPER_ADMIN service account (authId stays null).
  const claude = await prisma.user.upsert({
    where: { email: CLAUDE_EMAIL },
    update: { role: 'SUPER_ADMIN', isActive: true },
    create: {
      email: CLAUDE_EMAIL,
      authId: null, // key-only: can never hold a browser session
      companyId,
      firstName: 'Claude',
      lastName: 'Agent',
      displayName: 'Claude',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: { id: true, email: true, role: true, companyId: true },
  })
  console.log(`✅ Service account: ${claude.email}  (id=${claude.id}, role=${claude.role})`)

  // 2. Existing active keys.
  const activeKeys = await prisma.apiKey.findMany({
    where: { userId: claude.id, isActive: true, revokedAt: null },
    select: { id: true, keyPrefix: true },
  })

  // 2a. Pin-only: --ip given, key exists, not rotating → update IPs in place.
  if (allowedIps && !rotate && activeKeys.length > 0) {
    await prisma.apiKey.updateMany({
      where: { userId: claude.id, isActive: true, revokedAt: null },
      data: { allowedIps },
    })
    console.log(`\n🔒 Pinned ${activeKeys.length} active key(s) to allowedIps: [${allowedIps.join(', ')}]`)
    return
  }

  // 2b. Key exists, not rotating → nothing to mint.
  if (activeKeys.length > 0 && !rotate) {
    console.log(`\nℹ️  An active Claude key already exists (id=${activeKeys[0].id}, ${activeKeys[0].keyPrefix}…).`)
    console.log('   To replace it:  npm run setup-claude -- --rotate')
    return
  }

  // 2c. Rotating → revoke existing keys first.
  if (rotate && activeKeys.length > 0) {
    await prisma.apiKey.updateMany({
      where: { userId: claude.id, isActive: true, revokedAt: null },
      data: { isActive: false, revokedAt: new Date() },
    })
    console.log(`🔁 Revoked ${activeKeys.length} previous Claude key(s).`)
  }

  // 3. Mint a fresh key. `backhaus` is granted explicitly — Claude covers the
  // whole backend, including the BackHaus subtree Merc is fenced from.
  const rawKey = generateRawApiKey()
  const created = await prisma.apiKey.create({
    data: {
      userId: claude.id,
      companyId: claude.companyId,
      name: KEY_NAME,
      description: 'Claude MCP agent key. SUPER_ADMIN, full surface incl. BackHaus (backhaus scope granted).',
      keyHash: hashApiKey(rawKey),
      keyPrefix: rawKey.substring(0, 12),
      scopes: ['*', 'backhaus'],
      allowedIps: allowedIps ?? [], // [] = unlocked (Claude connects from anywhere)
    },
    select: { id: true, scopes: true, allowedIps: true },
  })

  console.log('\n🔑 NEW API KEY (shown once — copy it now):\n')
  console.log(`    ${rawKey}\n`)
  console.log(`    key id:      ${created.id}`)
  console.log(`    scopes:      [${created.scopes.join(', ')}]`)
  console.log(`    allowedIps:  ${created.allowedIps.length ? created.allowedIps.join(', ') : '(unlocked)'}`)
  // www host on purpose: the apex 307-redirects to www and clients drop the
  // Authorization header on the cross-origin redirect.
  console.log('\n   MCP endpoint:  https://www.urbansimple.net/api/mcp')
  console.log('   Header:        Authorization: Bearer ' + rawKey.slice(0, 12) + '…')
  console.log('   Revoke:        DELETE /api/growth/api-keys/' + created.id)
}

main()
  .catch((e) => {
    console.error('❌ setup-claude failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
