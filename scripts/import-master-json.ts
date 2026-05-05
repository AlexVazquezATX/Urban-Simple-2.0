/**
 * One-shot import: master reconciled JSON → Urban Simple.
 *
 * Reads scripts/data/base44-export/master.json (the canonical reconciliation
 * across cdnc.io and urbanserv.io) and creates Client, ClientContact, Location,
 * and LocationServiceProfile records. Marks matching prospects as won.
 *
 *   Dry run (default — prints what would happen, makes no changes):
 *     npx tsx scripts/import-master-json.ts
 *
 *   Apply for real:
 *     npx tsx scripts/import-master-json.ts --apply
 *
 * Idempotent: re-running skips clients/locations that already exist by name.
 *
 * Skip rules (set during 2026-05-05 discussion):
 *   - Skip "Vince Young Steakhouse" (closed Jan 2026)
 *   - Skip "Wu Chow (UrbanServ duplicate)" (zero locations, JSON flags as dup)
 *   - Skip "White Lodging (parent)" (zero locations, parent shell)
 *   - Skip the *parent* "Horseshoe Bay Resort" location row inside the HSB
 *     client (its 12 sub-locations cover the same revenue and including it
 *     would double-count $42k/mo)
 *   - Round Rock High School imports as inactive (zero revenue but kept for history)
 *   - Bar Hacienda + Urban Simple internal: client created without ClientContact
 *     (their primary_contact.name is null)
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

// Locations to skip by their `name` value within a client's locations array.
const SKIP_LOCATION_NAMES_BY_CLIENT: Record<string, Set<string>> = {
  'Horseshoe Bay Resort': new Set(['Horseshoe Bay Resort']),
}

// Inactive on-import clients (full client + locations created but marked inactive).
const FORCE_INACTIVE_CLIENTS = new Set(['Round Rock High School'])

// ============================================================================
// Type definitions for the master.json shape (loose; we hand-validate)
// ============================================================================

interface MasterContact {
  name: string | null
  email: string | null
  phone: string | null
}

interface MasterLocation {
  name: string
  address: string | null
  cdnc_source_card?: string | null
  urbanserv_source_location?: string | null
  monthly_revenue: string | null
  monthly_profit?: string | null
  margin?: string | null
  schedule: string | null
  start_date: string | null
  status_in_cdnc?: string | null
  notes: string | null
}

interface MasterClient {
  canonical_name: string
  urbanserv_client_record?: string
  primary_contact: MasterContact
  billing_email: string | null
  client_start_date: string | null
  notes: string | null
  locations: MasterLocation[]
}

interface MasterFile {
  generated: string
  source: string
  clients: MasterClient[]
}

// ============================================================================
// Parsers
// ============================================================================

function splitName(full: string | null | undefined): { firstName: string; lastName: string } {
  if (!full) return { firstName: '', lastName: '' }
  const trimmed = full.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const parts = trimmed.split(/\s+/)
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

function parseMoney(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null
  const cleaned = String(raw).replace(/[$,\s]/g, '').trim()
  if (!cleaned || cleaned === '0') return cleaned === '0' ? 0 : null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

// Parse "5x/week" or "5 days/week" or "1 day/week" → integer days per week.
function parseDaysPerWeek(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = /(\d+)\s*(?:x|days?)\s*\/\s*week/i.exec(raw)
  if (!m) return null
  const n = parseInt(m[1], 10)
  return Number.isFinite(n) && n >= 0 && n <= 7 ? n : null
}

// Map days_per_week → conventional service-day indices (0=Sun..6=Sat).
// Defaults: 7→all, 6→Mon-Sat, 5→Mon-Fri, etc. Documented in serviceNotes so
// the user can adjust per-location.
function defaultServiceDays(daysPerWeek: number): number[] {
  switch (daysPerWeek) {
    case 7: return [0, 1, 2, 3, 4, 5, 6]
    case 6: return [1, 2, 3, 4, 5, 6]
    case 5: return [1, 2, 3, 4, 5]
    case 4: return [1, 2, 3, 4]
    case 3: return [1, 2, 3]
    case 2: return [1, 2]
    case 1: return [1]
    default: return []
  }
}

// "Mar 24, 2024" or "Apr 2022" → Date or null.
function parseFlexibleDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  const trimmed = raw.trim()
  // Mar 24, 2024
  const fullMatch = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(trimmed)
  if (fullMatch) {
    const d = new Date(`${fullMatch[1]} ${fullMatch[2]}, ${fullMatch[3]} 00:00:00 UTC`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // Apr 2022 → first of month
  const monthMatch = /^([A-Za-z]+)\s+(\d{4})$/.exec(trimmed)
  if (monthMatch) {
    const d = new Date(`${monthMatch[1]} 1, ${monthMatch[2]} 00:00:00 UTC`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // Fallback: let JS try
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d
}

interface ParsedAddress {
  street: string
  city?: string
  state?: string
  zip?: string
}

// Known Austin-area cities. Used to split "no-comma" addresses like
// "2525 W. Anderson Ln Austin, TX 78757" into street + city correctly.
// Multi-word cities (Round Rock, Cedar Park) come first so the longer match
// wins over a substring match.
const KNOWN_CITIES = [
  'Round Rock',
  'Cedar Park',
  'Horseshoe Bay',
  'Bee Cave',
  'Dripping Springs',
  'Pflugerville',
  'Lakeway',
  'Austin',
] as const

function parseAddress(raw: string | null | undefined): ParsedAddress | null {
  if (!raw) return null
  // Strip "EE. UU" / "Estados Unidos" suffix the brief flagged.
  const trimmed = raw.trim().replace(/[\s,]*(?:EE\.\s*UU\.?|Estados\s+Unidos)\s*$/i, '').trim()
  if (!trimmed) return null

  // Pattern: "<street>, <city>, <ST> <ZIP>"
  const full = /^(.+?),\s*([^,]+?),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/.exec(trimmed)
  if (full) {
    return { street: full[1].trim(), city: full[2].trim(), state: full[3], zip: full[4] }
  }

  // Pattern: "<street> <city>, <ST> <ZIP>"  (NO comma between street and city)
  // Split on a known-city match rather than a greedy regex, which previously
  // mis-grabbed "Anderson Ln Austin" as the city for "2525 W. Anderson Ln Austin".
  const compactMatch = /^(.+?),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/.exec(trimmed)
  if (compactMatch) {
    const beforeStateZip = compactMatch[1].trim()
    const stateAbbr = compactMatch[2]
    const zip = compactMatch[3]
    for (const city of KNOWN_CITIES) {
      const cityIdx = beforeStateZip.toLowerCase().lastIndexOf(city.toLowerCase())
      if (cityIdx > 0 && cityIdx + city.length === beforeStateZip.length) {
        return {
          street: beforeStateZip.slice(0, cityIdx).trim().replace(/,$/, '').trim(),
          city,
          state: stateAbbr,
          zip,
        }
      }
    }
    // Couldn't find a known city — assume Austin and treat the rest as street.
    return { street: beforeStateZip, city: 'Austin', state: stateAbbr, zip }
  }

  // Pattern: "<street>, <city>, <ST>"  (no zip)
  const noZip = /^(.+?),\s*([^,]+?),\s*([A-Z]{2})$/.exec(trimmed)
  if (noZip) {
    return { street: noZip[1].trim(), city: noZip[2].trim(), state: noZip[3] }
  }

  // Fallback: whole thing as street, default city/state to Austin/TX
  return { street: trimmed, city: 'Austin', state: 'TX' }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log(APPLY ? 'APPLY MODE — changes will be written.\n' : 'DRY RUN — no changes will be written. Use --apply to commit.\n')

  // Resolve company + branch + creator.
  const company = await prisma.company.findFirst({ where: { name: COMPANY_NAME } })
  if (!company) throw new Error(`Company "${COMPANY_NAME}" not found.`)

  const branch = await prisma.branch.findFirst({
    where: { companyId: company.id, code: 'AUS', isActive: true },
  })
  if (!branch) throw new Error('Austin branch (code=AUS) not found.')

  console.log(`Company: ${company.name} (${company.id})`)
  console.log(`Branch:  ${branch.name} (${branch.id})\n`)

  // Load master JSON.
  const raw = fs.readFileSync(MASTER_FILE, 'utf8')
  const master = JSON.parse(raw) as MasterFile
  console.log(`Loaded master.json: ${master.clients.length} clients (generated ${master.generated}).\n`)

  type ClientResult = {
    name: string
    action: 'create' | 'skip'
    reason?: string
    ourClientId?: string
    forcedInactive?: boolean
    locationCount?: number
  }
  type LocationResult = {
    clientName: string
    name: string
    action: 'create' | 'skip'
    reason?: string
    serviceDays?: number[]
    timeWindow?: string
    revenue?: number | null
    daysPerWeek?: number | null
  }
  type ProspectMatch = {
    prospectName: string
    clientName: string
    action: 'mark_won' | 'skip'
    reason?: string
  }

  const clientResults: ClientResult[] = []
  const locationResults: LocationResult[] = []
  const prospectMatches: ProspectMatch[] = []

  for (const c of master.clients) {
    if (SKIP_CLIENT_NAMES.has(c.canonical_name)) {
      clientResults.push({ name: c.canonical_name, action: 'skip', reason: 'on skip list' })
      continue
    }

    // Idempotency: case-insensitive name match.
    const existing = await prisma.client.findFirst({
      where: { companyId: company.id, name: { equals: c.canonical_name, mode: 'insensitive' } },
      select: { id: true },
    })

    let ourClientId: string

    if (existing) {
      ourClientId = existing.id
      clientResults.push({
        name: c.canonical_name,
        action: 'skip',
        reason: 'already exists',
        ourClientId,
        locationCount: c.locations.length,
      })
    } else {
      const forcedInactive = FORCE_INACTIVE_CLIENTS.has(c.canonical_name)
      const status = forcedInactive ? 'inactive' : 'active'
      const contactName = c.primary_contact?.name?.trim() || ''
      const contactEmail = c.primary_contact?.email?.trim() || ''
      const contactPhone = c.primary_contact?.phone?.trim() || ''

      const noteParts: string[] = []
      if (c.notes) noteParts.push(c.notes)
      if (c.client_start_date) noteParts.push(`Start: ${c.client_start_date}`)
      if (c.urbanserv_client_record && c.urbanserv_client_record !== c.canonical_name) {
        noteParts.push(`UrbanServ record: ${c.urbanserv_client_record}`)
      }
      noteParts.push(`Imported from master.json on ${master.generated}`)

      if (APPLY) {
        const created = await prisma.client.create({
          data: {
            companyId: company.id,
            branchId: branch.id,
            name: c.canonical_name,
            billingEmail: c.billing_email?.trim() || contactEmail || null,
            phone: contactPhone || null,
            status,
            notes: noteParts.join('\n'),
            // Only attach a ClientContact if we have a name AND an email
            // (email is required on ClientContact).
            ...(contactName && contactEmail
              ? {
                  contacts: {
                    create: [
                      {
                        firstName: splitName(contactName).firstName || c.canonical_name,
                        lastName: splitName(contactName).lastName,
                        email: contactEmail,
                        phone: contactPhone || null,
                        role: 'primary',
                      },
                    ],
                  },
                }
              : {}),
          },
          select: { id: true },
        })
        ourClientId = created.id
      } else {
        ourClientId = `<would-create:${c.canonical_name}>`
      }

      clientResults.push({
        name: c.canonical_name,
        action: 'create',
        ourClientId,
        forcedInactive,
        locationCount: c.locations.length,
      })
    }

    // Locations under this client.
    const skipSet = SKIP_LOCATION_NAMES_BY_CLIENT[c.canonical_name] || new Set<string>()

    for (const loc of c.locations) {
      if (skipSet.has(loc.name)) {
        locationResults.push({
          clientName: c.canonical_name,
          name: loc.name,
          action: 'skip',
          reason: 'on per-client skip list (parent-row dedupe)',
        })
        continue
      }

      const isInactive =
        FORCE_INACTIVE_CLIENTS.has(c.canonical_name) ||
        loc.status_in_cdnc === 'cancelled' ||
        loc.status_in_cdnc === 'inactive'

      // Idempotency check (only meaningful when we have a real client id).
      if (!ourClientId.startsWith('<would-create')) {
        const existingLoc = await prisma.location.findFirst({
          where: { clientId: ourClientId, name: { equals: loc.name, mode: 'insensitive' } },
          select: { id: true },
        })
        if (existingLoc) {
          locationResults.push({
            clientName: c.canonical_name,
            name: loc.name,
            action: 'skip',
            reason: 'already exists',
          })
          continue
        }
      }

      const daysPerWeek = parseDaysPerWeek(loc.schedule)
      const serviceDays = daysPerWeek !== null ? defaultServiceDays(daysPerWeek) : []
      const monthlyRevenue = parseMoney(loc.monthly_revenue)
      const monthlyProfit = parseMoney(loc.monthly_profit)
      const address = parseAddress(loc.address)

      const noteLines: string[] = []
      if (loc.notes) noteLines.push(`Note: ${loc.notes}`)
      if (loc.schedule) noteLines.push(`Schedule (raw): ${loc.schedule}; days inferred — adjust if needed`)
      if (monthlyRevenue !== null) noteLines.push(`Monthly revenue: $${monthlyRevenue.toLocaleString()}`)
      if (monthlyProfit !== null) noteLines.push(`Monthly profit: $${monthlyProfit.toLocaleString()}`)
      if (loc.margin) noteLines.push(`Margin: ${loc.margin}`)
      if (loc.start_date) noteLines.push(`Started: ${loc.start_date}`)
      if (loc.status_in_cdnc && loc.status_in_cdnc !== 'active') noteLines.push(`CDNC status: ${loc.status_in_cdnc}`)
      if (loc.urbanserv_source_location) noteLines.push(`UrbanServ source: ${loc.urbanserv_source_location}`)
      if (loc.cdnc_source_card) noteLines.push(`CDNC source: ${loc.cdnc_source_card}`)

      if (APPLY && !ourClientId.startsWith('<would-create')) {
        await prisma.location.create({
          data: {
            clientId: ourClientId,
            branchId: branch.id,
            name: loc.name,
            address: address as unknown as object,
            isActive: !isInactive,
            serviceNotes: noteLines.join('\n') || null,
            serviceProfile: {
              create: {
                cadence: 'weekly',
                serviceDays: serviceDays as unknown as object,
                preferredStartTime: '21:00',
                preferredEndTime: '23:00',
                estimatedDurationMins: 120,
                autoSchedule: false, // user must set defaultManagerId first
                reviewRequired: true,
              },
            },
          },
        })
      }

      locationResults.push({
        clientName: c.canonical_name,
        name: loc.name,
        action: 'create',
        serviceDays,
        timeWindow: '21:00-23:00',
        revenue: monthlyRevenue,
        daysPerWeek,
      })
    }
  }

  // Prospect linkage sweep. Run for every client that ended up with a real id
  // (newly created or already existing), so re-runs after a partial crash can
  // still complete the prospect linking work.
  for (const cr of clientResults) {
    if (!cr.ourClientId) continue
    if (cr.ourClientId.startsWith('<would-create') && APPLY === false) {
      // dry-run: do the lookup, just don't update
    }

    const cleanedName = cr.name
      .replace(/\s+\(.*?\)$/, '') // strip parenthetical disambiguation
      .replace(/\s+LLC\.?$|\s+Inc\.?$/i, '')
      .trim()

    const prospects = await prisma.prospect.findMany({
      where: {
        companyId: company.id,
        deletedAt: null,
        OR: [
          { companyName: { equals: cr.name, mode: 'insensitive' } },
          { companyName: { contains: cleanedName, mode: 'insensitive' } },
        ],
      },
      select: { id: true, companyName: true, convertedToClientId: true },
    })

    // convertedToClientId is @unique on Prospect — check whether SOME prospect
    // is already linked to this client (e.g., from a prior partial run). If so,
    // any other matching prospects can be marked won but not linked.
    let clientAlreadyLinked = false
    if (!cr.ourClientId.startsWith('<would-create')) {
      const existingLink = await prisma.prospect.findFirst({
        where: { convertedToClientId: cr.ourClientId },
        select: { id: true },
      })
      if (existingLink) clientAlreadyLinked = true
    }

    for (const p of prospects) {
      if (p.convertedToClientId) {
        prospectMatches.push({
          prospectName: p.companyName,
          clientName: cr.name,
          action: 'skip',
          reason: 'already linked to a client',
        })
        continue
      }

      const shouldLink = !clientAlreadyLinked && !cr.ourClientId.startsWith('<would-create')

      if (APPLY && !cr.ourClientId.startsWith('<would-create')) {
        await prisma.prospect.update({
          where: { id: p.id },
          data: {
            status: 'won',
            ...(shouldLink ? { convertedToClientId: cr.ourClientId } : {}),
          },
        })
        if (shouldLink) clientAlreadyLinked = true
      } else if (!clientAlreadyLinked) {
        clientAlreadyLinked = true
      }

      prospectMatches.push({
        prospectName: p.companyName,
        clientName: cr.name,
        action: 'mark_won',
        ...(shouldLink ? {} : { reason: 'won (not linked — another prospect already carries the FK)' }),
      })
    }
  }

  // Summary.
  const dayShort: Record<number, string> = { 0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' }

  console.log('=== CLIENTS ===')
  for (const r of clientResults) {
    const tag = r.action === 'create' ? '[CREATE]' : '[SKIP  ]'
    const inactive = r.forcedInactive ? '  (inactive)' : ''
    const locs = r.locationCount !== undefined ? ` — ${r.locationCount} loc` : ''
    console.log(`  ${tag} ${r.name}${inactive}${locs}${r.reason ? ` — ${r.reason}` : ''}`)
  }

  console.log('\n=== LOCATIONS ===')
  for (const r of locationResults) {
    const tag = r.action === 'create' ? '[CREATE]' : '[SKIP  ]'
    const days = (r.serviceDays || []).map(d => dayShort[d]).join(',')
    const summary =
      r.action === 'create'
        ? ` — days=[${days}] sched=${r.daysPerWeek ?? '?'}d/wk rev=${r.revenue !== null && r.revenue !== undefined ? '$' + r.revenue.toLocaleString() : '—'}`
        : r.reason ? ` — ${r.reason}` : ''
    console.log(`  ${tag} ${r.clientName} → ${r.name}${summary}`)
  }

  console.log('\n=== PROSPECT LINKS ===')
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
  const skippedClients = clientResults.filter(r => r.action === 'skip').length
  const newLocations = locationResults.filter(r => r.action === 'create').length
  const skippedLocations = locationResults.filter(r => r.action === 'skip').length
  const linkedProspects = prospectMatches.filter(m => m.action === 'mark_won').length

  if (APPLY) {
    console.log(`Applied: ${newClients} clients (${skippedClients} skipped), ${newLocations} locations (${skippedLocations} skipped), ${linkedProspects} prospects marked won.`)
  } else {
    console.log(`Would apply: ${newClients} clients (${skippedClients} skipped), ${newLocations} locations (${skippedLocations} skipped), ${linkedProspects} prospects to be marked won.`)
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
