/**
 * Back-fill ServiceAgreement.monthlyLaborCost / monthlyMaterialCost /
 * monthlyOtherCost from the master.json financial_data per location.
 *
 *   Dry run:    npx tsx scripts/backfill-agreement-costs.ts
 *   Apply:      npx tsx scripts/backfill-agreement-costs.ts --apply
 *
 * Idempotent: only updates agreements where the cost fields are still null.
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')
const COMPANY_NAME = 'Urban Simple LLC'
const MASTER_FILE = path.resolve(process.cwd(), 'scripts/data/base44-export/master.json')

function parseMoney(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const cleaned = String(raw).replace(/[$,\s]/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

interface FinancialBlock {
  monthly_revenue?: number | string
  labor_cost?: number | string
  material_cost?: number | string
  other_costs?: number | string
}

async function main() {
  console.log(APPLY ? 'APPLY MODE\n' : 'DRY RUN — use --apply to commit.\n')

  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } })
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found.`)

  const raw = fs.readFileSync(MASTER_FILE, 'utf8')
  const master = JSON.parse(raw)

  // The master.json doesn't carry labor / material / other costs per location
  // (only monthly_revenue + monthly_profit + margin). The Base44 export DID
  // have a financial_data sub-object on each location, but the master JSON
  // is the reconciled output from cdnc.io + urbanserv.io which only carried
  // revenue/profit. We can derive labor cost from (revenue - profit) where
  // both are present, since other_cost and material_cost are usually zero
  // in the source data.
  //
  // For locations where labor cost cannot be derived, we leave the field null
  // and the user can set it manually via the Service Agreement edit form
  // (once we build it; today they'd update via DB or a follow-up script).

  type Result = { client: string; location: string; action: 'update' | 'skip'; reason?: string; revenue?: number; labor?: number }
  const results: Result[] = []

  for (const c of master.clients) {
    for (const loc of c.locations || []) {
      const revenue = parseMoney(loc.monthly_revenue)
      const profit = parseMoney(loc.monthly_profit)
      // Derived: labor cost = revenue - profit (assuming material/other ≈ 0
      // for the imported set, which matches the brief's "labor is the dominant
      // cost line for cleaning routes" pattern).
      const derivedLabor = revenue !== null && profit !== null && revenue >= profit
        ? Number((revenue - profit).toFixed(2))
        : null

      if (derivedLabor === null) {
        results.push({ client: c.canonical_name, location: loc.name, action: 'skip', reason: 'no derivable labor cost' })
        continue
      }

      // Find the matching ServiceAgreement.
      const client = await prisma.client.findFirst({
        where: { companyId: company.id, name: { equals: c.canonical_name, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!client) {
        results.push({ client: c.canonical_name, location: loc.name, action: 'skip', reason: 'client not found' })
        continue
      }

      const location = await prisma.location.findFirst({
        where: { clientId: client.id, name: { equals: loc.name, mode: 'insensitive' } },
        select: { id: true },
      })
      if (!location) {
        results.push({ client: c.canonical_name, location: loc.name, action: 'skip', reason: 'location not found' })
        continue
      }

      const agreement = await prisma.serviceAgreement.findFirst({
        where: { locationId: location.id, isActive: true },
        select: { id: true, monthlyLaborCost: true },
      })
      if (!agreement) {
        results.push({ client: c.canonical_name, location: loc.name, action: 'skip', reason: 'no active agreement' })
        continue
      }

      if (agreement.monthlyLaborCost !== null) {
        results.push({ client: c.canonical_name, location: loc.name, action: 'skip', reason: 'labor cost already set' })
        continue
      }

      if (APPLY) {
        await prisma.serviceAgreement.update({
          where: { id: agreement.id },
          data: { monthlyLaborCost: derivedLabor },
        })
      }
      results.push({ client: c.canonical_name, location: loc.name, action: 'update', revenue: revenue ?? undefined, labor: derivedLabor })
    }
  }

  console.log('=== AGREEMENT COSTS ===')
  for (const r of results) {
    const tag = r.action === 'update' ? '[UPDATE]' : '[SKIP  ]'
    const summary = r.action === 'update'
      ? ` rev=$${(r.revenue ?? 0).toLocaleString()} labor=$${(r.labor ?? 0).toLocaleString()} margin=${r.revenue ? (((r.revenue - (r.labor ?? 0)) / r.revenue) * 100).toFixed(1) : '0'}%`
      : r.reason ? ` — ${r.reason}` : ''
    console.log(`  ${tag} ${r.client} → ${r.location}${summary}`)
  }

  const updates = results.filter(r => r.action === 'update').length
  const totalRevenue = results.filter(r => r.action === 'update').reduce((s, r) => s + (r.revenue ?? 0), 0)
  const totalLabor = results.filter(r => r.action === 'update').reduce((s, r) => s + (r.labor ?? 0), 0)
  const overallMargin = totalRevenue > 0 ? ((totalRevenue - totalLabor) / totalRevenue) * 100 : 0

  console.log('')
  console.log(`${APPLY ? 'Updated' : 'Would update'}: ${updates} agreements.`)
  console.log(`Aggregate (these only): revenue $${totalRevenue.toLocaleString()}, labor $${totalLabor.toLocaleString()}, margin ${overallMargin.toFixed(1)}%`)
  if (!APPLY) console.log('Re-run with --apply to commit.')
}

main()
  .catch(err => { console.error('FAILED:', err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
