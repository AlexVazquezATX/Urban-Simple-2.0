// The nightly sourcing run: ask each source for candidates, merge the ones
// that are the same business, attach signals to accounts already in the CRM,
// and add the best new ones up to the daily caps. In dry-run nothing is
// written except the run log, which says what would have happened.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getStartOfLocalDay } from '@/lib/services/autopilot-schedule'
import { ProspectIndex, seenKey } from './match'
import { placesCallsThisMonth, runStage, skipStage } from './runs'
import { getSettings, SOURCE_LABELS, type SourceKey } from './settings'
import { fetchAlcoholSalesCandidates } from './sources/alcohol-sales'
import { fetchPlacesHotelCandidates } from './sources/places-hotels'
import { fetchTabcCandidates } from './sources/tabc'
import type { Candidate, FetchLike, SignalDraft } from './sources/types'

const PLACES_EVERY_MS = 6 * 86_400_000

type Merged = Candidate & { sources: SourceKey[]; reasons: string[] }

const SEGMENT_RANK: Record<Candidate['segment'], number> = { resort: 4, hotel: 3, bar: 2, restaurant: 1 }

// Whose name to show when sources disagree: Google's public name beats a
// license trade name, which beats the Comptroller's taxpayer-style name
// ("Regency Beverage Company" is the Hyatt Regency's bar permit).
const NAME_RANK: Record<SourceKey, number> = { places_hotels: 3, tabc: 2, alcohol_sales: 1 }

function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>
}

/** Fold candidates that are the same business into one, keeping every signal. */
export function mergeCandidates(candidates: Candidate[]): Merged[] {
  const merged: Merged[] = []
  const index = new ProspectIndex()
  for (const c of candidates) {
    const hit = index.find(c.name, c.address.street)
    const existing = hit ? merged[Number(hit)] : undefined
    if (existing) {
      existing.signals.push(...c.signals)
      if (!existing.sources.includes(c.source)) existing.sources.push(c.source)
      existing.reasons.push(c.reason)
      if (SEGMENT_RANK[c.segment] > SEGMENT_RANK[existing.segment]) existing.segment = c.segment
      if (Math.max(...existing.sources.filter((s) => s !== c.source).map((s) => NAME_RANK[s])) < NAME_RANK[c.source]) {
        existing.name = c.name
      }
      existing.legalName = existing.legalName || c.legalName
      if (c.priority > existing.priority) {
        existing.priority = c.priority
        existing.source = c.source
      }
      // Fill gaps only; an explicit undefined must not erase a known street.
      existing.address = { ...compact(c.address), ...compact(existing.address) }
      continue
    }
    merged.push({ ...c, signals: [...c.signals], sources: [c.source], reasons: [c.reason] })
    index.add({ id: String(merged.length - 1), companyName: c.name, street: c.address.street })
  }
  return merged
}

/** Pick new accounts in priority order within the per-source and total caps. */
export function allocate(fresh: Merged[], caps: Record<SourceKey, number>, totalCap: number): { picked: Merged[]; overCap: number } {
  const used: Record<string, number> = {}
  const picked: Merged[] = []
  for (const m of [...fresh].sort((a, b) => b.priority - a.priority)) {
    if (picked.length >= totalCap) break
    if ((used[m.source] ?? 0) >= (caps[m.source] ?? 0)) continue
    used[m.source] = (used[m.source] ?? 0) + 1
    picked.push(m)
  }
  return { picked, overCap: fresh.length - picked.length }
}

function signalRows(companyId: string, prospectId: string, signals: SignalDraft[]): Prisma.ProspectSignalCreateManyInput[] {
  return signals.map((s) => ({
    companyId,
    prospectId,
    kind: s.kind,
    sourceKey: s.sourceKey,
    observedAt: s.observedAt,
    data: s.data as Prisma.InputJsonValue,
  }))
}

export type SourcingResult = {
  dryRun: boolean
  candidates: number
  matchedExisting: number
  created: number
  overCap: number
  signalsAdded: number
  createdNames: string[]
}

export async function runSourcing(companyId: string, opts: {
  dryRun?: boolean
  forcePlaces?: boolean
  now?: Date
  fetchImpl?: FetchLike
} = {}): Promise<SourcingResult | null> {
  const settings = await getSettings(companyId)
  const dryRun = opts.dryRun ?? settings.dryRun
  const now = opts.now ?? new Date()
  const fetchImpl = opts.fetchImpl

  // ---- Sources (each logs its own run row; a failure skips only that source) ----
  const found: Candidate[] = []

  if (settings.sourceCaps.tabc > 0) {
    const r = await runStage(companyId, 'tabc', dryRun, async () => {
      const { candidates, stats } = await fetchTabcCandidates({ fetchImpl, now })
      return { value: candidates, stats }
    })
    if (r) found.push(...r)
  }

  if (settings.sourceCaps.alcohol_sales > 0) {
    const r = await runStage(companyId, 'alcohol_sales', dryRun, async () => {
      const { candidates, stats } = await fetchAlcoholSalesCandidates({ fetchImpl })
      return { value: candidates, stats }
    })
    if (r) found.push(...r)
  }

  if (settings.sourceCaps.places_hotels > 0) {
    // Weekly from the last attempt, failed ones included: a run that keeps
    // failing after spending calls must not retry (and spend) every night.
    const lastPlaces = await prisma.leadMachineRun.findFirst({
      where: { companyId, stage: 'places_hotels', status: { in: ['succeeded', 'failed'] } },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    })
    const due = opts.forcePlaces || !lastPlaces || now.getTime() - lastPlaces.startedAt.getTime() >= PLACES_EVERY_MS
    const budget = settings.placesMonthlyCallCap - (await placesCallsThisMonth(companyId, now))
    if (!process.env.GOOGLE_PLACES_API_KEY) {
      await skipStage(companyId, 'places_hotels', dryRun, 'GOOGLE_PLACES_API_KEY is not set')
    } else if (!due) {
      await skipStage(companyId, 'places_hotels', dryRun, 'Ran within the last 6 days (weekly source)')
    } else if (budget <= 0) {
      await skipStage(companyId, 'places_hotels', dryRun, `Monthly Google Places cap of ${settings.placesMonthlyCallCap} calls reached`)
    } else {
      const r = await runStage(companyId, 'places_hotels', dryRun, async () => {
        const { candidates, stats } = await fetchPlacesHotelCandidates({
          apiKey: process.env.GOOGLE_PLACES_API_KEY,
          callBudget: budget,
          fetchImpl,
        })
        return { value: candidates, stats }
      })
      if (r) found.push(...r)
    }
  }

  // ---- Merge, match, cap, write ----
  return runStage(companyId, 'sourcing', dryRun, async () => {
    const merged = mergeCandidates(found)

    const street = (a: unknown) => (a as { street?: string } | null)?.street ?? null
    const [existingRows, clients] = await Promise.all([
      // Deleted and lost prospects included on purpose: never re-add someone
      // Alex already ruled out.
      prisma.prospect.findMany({
        where: { companyId },
        select: { id: true, companyName: true, address: true },
      }),
      // Current and past clients (and their locations) are never cold prospects.
      prisma.client.findMany({
        where: { companyId },
        select: { id: true, name: true, legalName: true, address: true, locations: { select: { name: true, address: true } } },
      }),
    ])
    const index = new ProspectIndex(existingRows.map((p) => ({ id: p.id, companyName: p.companyName, street: street(p.address) })))
    for (const c of clients) {
      const id = `client:${c.id}`
      index.add({ id, companyName: c.name, street: street(c.address) })
      if (c.legalName) index.add({ id, companyName: c.legalName, street: street(c.address) })
      for (const loc of c.locations) index.add({ id, companyName: loc.name, street: street(loc.address) })
    }

    // Signals already on file (including "seen" markers, which outlive a
    // deleted or renamed prospect) identify a business the machine has
    // handled before, whatever its CRM record looks like now.
    const keysFor = (m: Merged) => [seenKey(m.name, m.address.street), ...m.signals.map((s) => s.sourceKey)]
    const known = await prisma.prospectSignal.findMany({
      where: { companyId, sourceKey: { in: merged.flatMap(keysFor) } },
      select: { sourceKey: true, prospectId: true },
    })
    const knownByKey = new Map(known.map((k) => [k.sourceKey, k.prospectId]))

    const matched: Array<{ prospectId: string; m: Merged }> = []
    const fresh: Merged[] = []
    let clientsSkipped = 0
    let previouslyRemoved = 0
    for (const m of merged) {
      const id = index.find(m.name, m.address.street)
      if (id?.startsWith('client:')) {
        clientsSkipped++
        continue
      }
      if (id) {
        matched.push({ prospectId: id, m })
        continue
      }
      const priorKey = keysFor(m).find((k) => knownByKey.has(k))
      if (priorKey) {
        const priorProspect = knownByKey.get(priorKey)
        if (priorProspect) matched.push({ prospectId: priorProspect, m })
        else previouslyRemoved++ // its prospect was deleted: leave it out
        continue
      }
      fresh.push(m)
    }

    // The daily cap counts everything the machine added today, so a second
    // run on the same day can't double it.
    const branch = await prisma.branch.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, timezone: true },
    })
    const dayStart = getStartOfLocalDay(now, branch?.timezone || 'America/Chicago')
    const addedToday = await prisma.prospect.count({
      where: { companyId, source: 'lead_machine', createdAt: { gte: dayStart } },
    })
    const { picked, overCap } = allocate(fresh, settings.sourceCaps, Math.max(0, settings.dailyNewCap - addedToday))

    let signalsAdded = 0
    if (!dryRun) {
      for (const { prospectId, m } of matched) {
        const res = await prisma.prospectSignal.createMany({
          data: signalRows(companyId, prospectId, m.signals),
          skipDuplicates: true,
        })
        signalsAdded += res.count
      }
      const stamp = now.toISOString().slice(0, 10)
      for (const m of picked) {
        const prospect = await prisma.prospect.create({
          data: {
            companyId,
            branchId: branch?.id ?? null,
            companyName: m.name,
            legalName: m.legalName ?? null,
            businessType: m.segment === 'resort' ? 'hotel' : m.segment,
            industry: 'hospitality',
            address: m.address as Prisma.InputJsonValue,
            // Holding area: researched and drafted in Phase B before it
            // reaches the active pipeline or anyone's to-do list.
            status: 'prospect',
            priority: m.segment === 'hotel' || m.segment === 'resort' ? 'high' : 'medium',
            source: 'lead_machine',
            sourceDetail: SOURCE_LABELS[m.source],
            tags: ['lead-machine', m.segment, ...m.sources.map((s) => `src:${s}`)],
            notes: `Found by the lead machine on ${stamp}.\n${m.reasons.map((r) => `- ${r}`).join('\n')}`,
          },
          select: { id: true },
        })
        const res = await prisma.prospectSignal.createMany({
          data: [
            ...signalRows(companyId, prospect.id, m.signals),
            {
              companyId,
              prospectId: prospect.id,
              kind: 'machine_seen',
              sourceKey: seenKey(m.name, m.address.street),
              observedAt: now,
              data: { name: m.name, street: m.address.street ?? null },
            },
          ],
          skipDuplicates: true,
        })
        signalsAdded += res.count
      }
    }

    const result: SourcingResult = {
      dryRun,
      candidates: merged.length,
      matchedExisting: matched.length,
      created: dryRun ? 0 : picked.length,
      overCap,
      signalsAdded,
      createdNames: picked.map((m) => `${m.name} (${m.segment})`),
    }
    return {
      value: result,
      stats: {
        ...result,
        ...(dryRun ? { wouldCreate: picked.length } : {}),
        createdNames: result.createdNames.slice(0, 50),
        addedEarlierToday: addedToday,
        clientsSkipped,
        previouslyRemoved,
      },
    }
  })
}
