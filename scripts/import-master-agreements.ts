/**
 * Follow-up to import-master-json.ts: back-fill ServiceAgreement records from
 * the master JSON's monthly_revenue field so financial data lives in the
 * proper billing-side model rather than only as text in Location.serviceNotes.
 *
 *   Dry run:    npx tsx scripts/import-master-agreements.ts
 *   Apply:      npx tsx scripts/import-master-agreements.ts --apply
 *
 * Skip rules:
 *   - Locations with monthly_revenue <= 0 are skipped (the brief notes some
 *     are intentional zeros — e.g., Capital Grille BOH where FOH carries the
 *     full revenue. Setting up an explicit $0 ServiceAgreement isn't useful
 *     for billing.)
 *   - Locations whose client was skipped by import-master-json.ts (Vince
 *     Young, Wu Chow dup, White Lodging parent) have no client record, so
 *     they're skipped here too.
 *   - Idempotent: re-running skips locations that already have a
 *     ServiceAgreement.
 *
 * Notes:
 *   - Labor cost and profit live only in Location.serviceNotes — no schema
 *     home for them yet. If you want proper P&L tracking, that's a separate
 *     model to add.
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const COMPANY_NAME = 'Urban Simple LLC'
const MASTER_FILE = path.resolve(process.cwd(), 'scripts/data/base44-export/master.json')

const SKIP_CLIENT_NAMES = new Set([
  'Vince Young Steakhouse',
  'Wu Chow (UrbanServ duplicate)',
  'White Lodging (parent)',
])

const SKIP_LOCATION_NAMES_BY_CLIENT: Record<string, Set<string>> = {
  'Horseshoe Bay Resort': new Set(['Horseshoe Bay Resort']),
}

function parseMoney(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const cleaned = String(raw).replace(/[$,\s]/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function parseFlexibleDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const t = raw.trim()
  const fullMatch = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(t)
  if (fullMatch) {
    const d = new Date(`${fullMatch[1]} ${fullMatch[2]}, ${fullMatch[3]} 00:00:00 UTC`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const monthMatch = /^([A-Za-z]+)\s+(\d{4})$/.exec(t)
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} 1, ${monthMatch[2]} 00:00:00 UTC`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d
}

async function main() {
  console.log(APPLY ? 'APPLY MODE\n' : 'DRY RUN — use --apply to commit.\n')

  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } })
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found.`)

  const raw = fs.readFileSync(MASTER_FILE, 'utf8')
  const master = JSON.parse(raw)

  type Result = {
    clientName: string
    locationName: string
    action: 'create' | 'skip'
    reason?: string
    monthlyAmount?: number
  }
  const results: Result[] = []

  for (const c of master.clients) {
    if (SKIP_CLIENT_NAMES.has(c.canonical_name)) continue

    const client = await prisma.client.findFirst({
      where: { companyId: company.id, name: { equals: c.canonical_name, mode: 'insensitive' } },
      select: { id: true, paymentTerms: true },
    })
    if (!client) {
      for (const l of c.locations || []) {
        results.push({ clientName: c.canonical_name, locationName: l.name, action: 'skip', reason: 'client not found in DB' })
      }
      continue
    }

    const skipSet = SKIP_LOCATION_NAMES_BY_CLIENT[c.canonical_name] || new Set<string>()

    for (const loc of c.locations || []) {
      if (skipSet.has(loc.name)) continue

      const monthlyAmount = parseMoney(loc.monthly_revenue)
      if (monthlyAmount === null || monthlyAmount <= 0) {
        results.push({
          clientName: c.canonical_name,
          locationName: loc.name,
          action: 'skip',
          reason: monthlyAmount === null ? 'no revenue value' : 'revenue is $0',
        })
        continue
      }

      const location = await prisma.location.findFirst({
        where: { clientId: client.id, name: { equals: loc.name, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!location) {
        results.push({ clientName: c.canonical_name, locationName: loc.name, action: 'skip', reason: 'location not found in DB' })
        continue
      }

      const existing = await prisma.serviceAgreement.findFirst({
        where: { locationId: location.id, isActive: true },
        select: { id: true },
      })
      if (existing) {
        results.push({ clientName: c.canonical_name, locationName: loc.name, action: 'skip', reason: 'agreement already exists' })
        continue
      }

      const startDate =
        parseFlexibleDate(loc.start_date) ||
        parseFlexibleDate(c.client_start_date) ||
        new Date()

      const description = [
        `Service for ${loc.name}`,
        loc.schedule ? `(${loc.schedule})` : null,
      ].filter(Boolean).join(' ')

      if (APPLY) {
        await prisma.serviceAgreement.create({
          data: {
            clientId: client.id,
            locationId: location.id,
            description,
            monthlyAmount,
            billingDay: 1,
            paymentTerms: client.paymentTerms || 'NET_30',
            startDate,
            isActive: true,
          },
        })
      }

      results.push({
        clientName: c.canonical_name,
        locationName: loc.name,
        action: 'create',
        monthlyAmount,
      })
    }
  }

  console.log('=== SERVICE AGREEMENTS ===')
  for (const r of results) {
    const tag = r.action === 'create' ? '[CREATE]' : '[SKIP  ]'
    const summary = r.action === 'create'
      ? ` — $${r.monthlyAmount?.toLocaleString()}/mo`
      : r.reason ? ` — ${r.reason}` : ''
    console.log(`  ${tag} ${r.clientName} → ${r.locationName}${summary}`)
  }

  const created = results.filter(r => r.action === 'create').length
  const skipped = results.filter(r => r.action === 'skip').length
  const totalMrr = results.filter(r => r.action === 'create').reduce((sum, r) => sum + (r.monthlyAmount || 0), 0)

  console.log('')
  console.log(`${APPLY ? 'Applied' : 'Would apply'}: ${created} agreements (${skipped} skipped). MRR added: $${totalMrr.toLocaleString()}.`)
  if (!APPLY) console.log('Re-run with --apply to commit.')
}

main()
  .catch(err => { console.error('FAILED:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
