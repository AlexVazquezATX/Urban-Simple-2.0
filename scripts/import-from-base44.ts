/**
 * One-shot import: Base44 → Urban Simple.
 *
 * Reads CSV exports placed in scripts/data/base44-export/ and creates Client,
 * ClientContact, Location, and LocationServiceProfile records.
 *
 * Also looks for any existing prospects whose name matches a newly-imported
 * client and marks them as won + links via convertedToClientId, so the CRM
 * doesn't show duplicates between Prospects and Clients tables.
 *
 *   Dry run (default — prints what would happen, makes no changes):
 *     npx tsx scripts/import-from-base44.ts
 *
 *   Apply for real:
 *     npx tsx scripts/import-from-base44.ts --apply
 *
 * Idempotent: re-running skips clients/locations that already exist by name.
 */

import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const APPLY = process.argv.includes('--apply')
const COMPANY_NAME = 'Urban Simple LLC'
const EXPORT_DIR = path.resolve(process.cwd(), 'scripts/data/base44-export')
const CLIENT_FILE = path.join(EXPORT_DIR, 'Client_export.csv')
const LOCATION_FILE = path.join(EXPORT_DIR, 'Location_export.csv')

// Day name → numeric index (0=Sun .. 6=Sat) matching Date.getDay() / our schema.
const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

// Minimal CSV parser. Handles quoted fields with embedded commas, newlines,
// and `""` escapes. Sufficient for Base44's export format.
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      current.push(field)
      field = ''
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      current.push(field)
      rows.push(current)
      current = []
      field = ''
      continue
    }
    field += ch
  }
  if (field.length > 0 || current.length > 0) {
    current.push(field)
    rows.push(current)
  }

  if (rows.length === 0) return []
  const headers = rows[0]
  return rows.slice(1).filter(r => r.some(v => v.length > 0)).map(row => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? ''
    })
    return obj
  })
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = full.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function parseServiceDays(raw: string): number[] {
  if (!raw || raw === '[]') return []
  try {
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const indices = arr
      .map(v => (typeof v === 'string' ? DAY_INDEX[v.toLowerCase()] : null))
      .filter((v): v is number => typeof v === 'number')
    return Array.from(new Set(indices)).sort((a, b) => a - b)
  } catch {
    return []
  }
}

function parseAssignedAssociates(raw: string): Array<{ name: string; email: string }> {
  if (!raw || raw === '[]') return []
  try {
    const arr: unknown = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr
      .map(v => {
        if (!v || typeof v !== 'object') return null
        const o = v as Record<string, unknown>
        return {
          name: typeof o.user_name === 'string' ? o.user_name : '',
          email: typeof o.user_email === 'string' ? o.user_email : '',
        }
      })
      .filter((v): v is { name: string; email: string } => v !== null && (v.name !== '' || v.email !== ''))
  } catch {
    return []
  }
}

function parseFinancialData(raw: string): { monthlyRevenue: number | null; laborCost: number | null } {
  if (!raw) return { monthlyRevenue: null, laborCost: null }
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>
    const mr = typeof obj.monthly_revenue === 'number' ? obj.monthly_revenue : null
    const lc = typeof obj.labor_cost === 'number' ? obj.labor_cost : null
    return { monthlyRevenue: mr, laborCost: lc }
  } catch {
    return { monthlyRevenue: null, laborCost: null }
  }
}

async function main() {
  console.log(APPLY ? 'APPLY MODE — changes will be written.\n' : 'DRY RUN — no changes will be written. Use --apply to commit.\n')

  // 1. Resolve target company + branch + creator user.
  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } })
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found.`)

  const branch = await prisma.branch.findFirst({ where: { companyId: company.id, code: 'AUS', isActive: true } })
  if (!branch) throw new Error('Austin branch (code=AUS) not found.')

  const creator = await prisma.user.findFirst({
    where: { companyId: company.id, role: 'SUPER_ADMIN' },
  })
  if (!creator) throw new Error('No SUPER_ADMIN user found for the company.')

  console.log(`Company: ${company.name} (${company.id})`)
  console.log(`Branch:  ${branch.name} (${branch.id})`)
  console.log(`Creator: ${creator.email}`)
  console.log('')

  // 2. Load CSVs.
  const clientCsv = fs.readFileSync(CLIENT_FILE, 'utf8')
  const locationCsv = fs.readFileSync(LOCATION_FILE, 'utf8')
  const clientRows = parseCsv(clientCsv)
  const locationRows = parseCsv(locationCsv)
  console.log(`Loaded ${clientRows.length} client rows and ${locationRows.length} location rows.`)
  console.log('')

  // 3. Process clients.
  type ClientResult = {
    base44Id: string
    name: string
    action: 'create' | 'skip'
    reason?: string
    ourClientId?: string
  }
  const clientResults: ClientResult[] = []
  // Map base44 client id → our client id (for resolving location.client_id refs).
  const clientIdMap = new Map<string, string>()

  for (const row of clientRows) {
    const base44Id = row.id
    const name = row.client_name?.trim()
    if (!name) {
      clientResults.push({ base44Id, name: '(missing)', action: 'skip', reason: 'missing client_name' })
      continue
    }

    const existing = await prisma.client.findFirst({
      where: { companyId: company.id, name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    })
    if (existing) {
      clientIdMap.set(base44Id, existing.id)
      clientResults.push({ base44Id, name, action: 'skip', reason: 'already exists', ourClientId: existing.id })
      continue
    }

    if (!APPLY) {
      clientResults.push({ base44Id, name, action: 'create' })
      // Use a placeholder id so the dry-run can still produce a coherent
      // location preview that references this client.
      clientIdMap.set(base44Id, `<would-create:${base44Id}>`)
      continue
    }

    const { firstName, lastName } = splitName(row.primary_contact_name || '')
    const contactEmail = row.service_email?.trim() || ''
    const phone = row.phone_number?.trim() || null

    const created = await prisma.client.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        name,
        billingEmail: contactEmail || null,
        phone,
        status: row.is_active === 'true' ? 'active' : 'inactive',
        notes: `Imported from Base44 (id=${base44Id})`,
        // ClientContact requires email — only attach a contact if we have one.
        ...(contactEmail
          ? {
              contacts: {
                create: [
                  {
                    firstName: firstName || name,
                    lastName,
                    email: contactEmail,
                    phone,
                    role: 'primary',
                  },
                ],
              },
            }
          : {}),
      },
      select: { id: true },
    })

    clientIdMap.set(base44Id, created.id)
    clientResults.push({ base44Id, name, action: 'create', ourClientId: created.id })
  }

  // 4. Process locations.
  type LocationResult = {
    name: string
    clientName: string
    action: 'create' | 'skip'
    reason?: string
    serviceDays?: number[]
    timeWindow?: string
    notes?: string[]
  }
  const locationResults: LocationResult[] = []

  for (const row of locationRows) {
    const base44ClientId = row.client_id
    const ourClientId = clientIdMap.get(base44ClientId)
    const name = row.name?.trim()
    const clientName = row.client_name?.trim()

    if (!ourClientId) {
      locationResults.push({
        name: name || '(missing)',
        clientName: clientName || '(unknown)',
        action: 'skip',
        reason: `client_id ${base44ClientId} not in import set`,
      })
      continue
    }

    if (!name) {
      locationResults.push({ name: '(missing)', clientName, action: 'skip', reason: 'missing name' })
      continue
    }

    // Only check for existing if we have a real (not placeholder) client id.
    if (APPLY || !ourClientId.startsWith('<would-create')) {
      const existing = await prisma.location.findFirst({
        where: { clientId: ourClientId, name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      })
      if (existing) {
        locationResults.push({ name, clientName, action: 'skip', reason: 'already exists' })
        continue
      }
    }

    const serviceDays = parseServiceDays(row.service_days)
    const associates = parseAssignedAssociates(row.assigned_associates)
    const financial = parseFinancialData(row.financial_data)

    const noteParts: string[] = []
    if (row.service_type) noteParts.push(`Service type: ${row.service_type}`)
    if (associates.length > 0) {
      noteParts.push(
        `Assigned associates (from Base44): ${associates.map(a => `${a.name} <${a.email}>`).join('; ')}`
      )
    }
    if (financial.monthlyRevenue) {
      noteParts.push(`Monthly revenue (Base44): $${financial.monthlyRevenue}`)
    }
    if (financial.laborCost) {
      noteParts.push(`Monthly labor (Base44): $${financial.laborCost}`)
    }
    noteParts.push(`Imported from Base44 (id=${row.id})`)

    if (!APPLY) {
      locationResults.push({
        name,
        clientName,
        action: 'create',
        serviceDays,
        timeWindow: `${row.preferred_time_start}-${row.preferred_time_end}`,
        notes: noteParts,
      })
      continue
    }

    await prisma.location.create({
      data: {
        clientId: ourClientId,
        branchId: branch.id,
        name,
        address: {
          street: row.address?.trim() || '',
          city: 'Austin',
          state: 'TX',
        },
        accessInstructions: row.manager_notes?.trim() || null,
        serviceNotes: noteParts.join('\n') || null,
        isActive: row.is_active === 'true',
        serviceProfile: {
          create: {
            cadence: 'weekly',
            serviceDays: serviceDays as unknown as object,
            preferredStartTime: row.preferred_time_start?.trim() || null,
            preferredEndTime: row.preferred_time_end?.trim() || null,
            estimatedDurationMins: 120,
            // No manager auto-assigned (Base44 only had associates, not managers).
            // User can set defaultManagerId from the Location form.
            autoSchedule: false,
            reviewRequired: true,
          },
        },
      },
    })

    locationResults.push({
      name,
      clientName,
      action: 'create',
      serviceDays,
      timeWindow: `${row.preferred_time_start}-${row.preferred_time_end}`,
      notes: noteParts,
    })
  }

  // 5. Mark matching prospects as won.
  type ProspectMatch = { prospectName: string; clientName: string; action: 'mark_won' | 'skip'; reason?: string }
  const prospectMatches: ProspectMatch[] = []

  // Only do prospect-link work in apply mode (we need real client IDs).
  if (APPLY) {
    for (const result of clientResults) {
      if (!result.ourClientId) continue
      // Match prospects whose name contains the client name OR vice versa, case-insensitive.
      // Examples:
      //   client "Truluck's"          ↔ prospect "Truluck's Downtown Austin"
      //   client "Caliz Beverages LLC" ↔ prospect "Caliz Beverages"
      //   client "Capital Grille"     ↔ prospect "The Capital Grille" / "Capital Grille - Downtown"
      const clientNameClean = result.name.replace(/\s+LLC$|\s+Inc$/i, '').trim()
      const prospects = await prisma.prospect.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          OR: [
            { companyName: { equals: result.name, mode: 'insensitive' } },
            { companyName: { contains: clientNameClean, mode: 'insensitive' } },
          ],
        },
        select: { id: true, companyName: true, status: true, convertedToClientId: true },
      })
      for (const p of prospects) {
        if (p.convertedToClientId) {
          prospectMatches.push({
            prospectName: p.companyName,
            clientName: result.name,
            action: 'skip',
            reason: 'already linked to a client',
          })
          continue
        }
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            status: 'won',
            convertedToClientId: result.ourClientId,
          },
        })
        prospectMatches.push({
          prospectName: p.companyName,
          clientName: result.name,
          action: 'mark_won',
        })
      }
    }
  } else {
    // Dry-run preview of prospect matches.
    for (const result of clientResults) {
      const clientNameClean = result.name.replace(/\s+LLC$|\s+Inc$/i, '').trim()
      const prospects = await prisma.prospect.findMany({
        where: {
          companyId: company.id,
          deletedAt: null,
          OR: [
            { companyName: { equals: result.name, mode: 'insensitive' } },
            { companyName: { contains: clientNameClean, mode: 'insensitive' } },
          ],
        },
        select: { id: true, companyName: true, convertedToClientId: true },
      })
      for (const p of prospects) {
        if (p.convertedToClientId) {
          prospectMatches.push({
            prospectName: p.companyName,
            clientName: result.name,
            action: 'skip',
            reason: 'already linked to a client',
          })
        } else {
          prospectMatches.push({
            prospectName: p.companyName,
            clientName: result.name,
            action: 'mark_won',
          })
        }
      }
    }
  }

  // 6. Print summary.
  console.log('=== CLIENTS ===')
  for (const r of clientResults) {
    const tag = r.action === 'create' ? '[CREATE]' : `[SKIP   ]`
    console.log(`  ${tag} ${r.name}${r.reason ? ` — ${r.reason}` : ''}`)
  }

  console.log('')
  console.log('=== LOCATIONS ===')
  for (const r of locationResults) {
    const tag = r.action === 'create' ? '[CREATE]' : `[SKIP   ]`
    console.log(`  ${tag} ${r.clientName} → ${r.name}${r.reason ? ` — ${r.reason}` : ''}`)
    if (r.action === 'create') {
      const dayNames = (r.serviceDays || []).map(d => Object.entries(DAY_INDEX).find(([, v]) => v === d)?.[0]).join(',')
      console.log(`           days=[${dayNames}] window=${r.timeWindow}`)
      for (const n of r.notes || []) {
        console.log(`           note: ${n}`)
      }
    }
  }

  console.log('')
  console.log('=== PROSPECT LINKS ===')
  if (prospectMatches.length === 0) {
    console.log('  (none)')
  } else {
    for (const m of prospectMatches) {
      const tag = m.action === 'mark_won' ? '[WIN ]' : '[SKIP]'
      console.log(`  ${tag} prospect "${m.prospectName}" ↔ client "${m.clientName}"${m.reason ? ` — ${m.reason}` : ''}`)
    }
  }

  console.log('')
  const newClients = clientResults.filter(r => r.action === 'create').length
  const newLocations = locationResults.filter(r => r.action === 'create').length
  const linkedProspects = prospectMatches.filter(m => m.action === 'mark_won').length

  if (APPLY) {
    console.log(`Applied: ${newClients} clients, ${newLocations} locations, ${linkedProspects} prospects marked won.`)
  } else {
    console.log(`Would apply: ${newClients} clients, ${newLocations} locations, ${linkedProspects} prospects marked won.`)
    console.log('Re-run with --apply to commit.')
  }
}

main()
  .catch(err => {
    console.error('IMPORT FAILED:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
