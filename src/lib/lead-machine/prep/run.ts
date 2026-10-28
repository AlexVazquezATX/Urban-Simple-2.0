// Nightly account prep (Phase B): for each new account the machine added,
// look it up on Google, read its website, have Claude pick out who runs it
// and what's worth mentioning, find a verified email, and queue a first-touch
// draft for Alex's approval. Nothing is ever sent from here: drafts land in
// the approval queue with no schedule, so only a human click sends them.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { getStartOfLocalDay } from '@/lib/services/autopilot-schedule'
import { pickRecipient } from '@/lib/services/outreach-recipient'
import { resolveOutreachActorId } from '@/lib/services/outreach-guards'
import { displayName } from '../match'
import { placesCallsThisMonth, runStage, skipStage } from '../runs'
import { getSettings } from '../settings'
import type { FetchLike } from '../sources/types'
import { ClaudeWriter, OutOfTime, type ResearchNotes } from './claude'
import { findContacts, type FoundContact } from './contacts'
import { Findymail, FindymailStopped } from './findymail'
import { lookupPlace, type PlaceFacts } from './places-lookup'
import { ownDomain, readSite, type SiteFacts } from './site'

const DAY = 86_400_000
// Stop starting new accounts after this, and finish every call by the hard
// deadline, so the function ends inside Vercel's 300s limit. Whatever is left
// goes first the next night.
const START_BUDGET_MS = 150_000
const HARD_DEADLINE_MS = 270_000
const MAX_ATTEMPTS = 3

export type PrepOutcome = {
  prospectId: string
  name: string
  status: 'drafted' | 'no_contact' | 'no_draft' | 'failed'
  contact: { name: string; email: string; status: string; source: string } | null
  draft: { subject: string; body: string; angle: string } | null
  problems: string[]
  notes: ResearchNotes | null
  /** Why no contact was found, for the brief and the next attempt. */
  noContactReason?: NoContactReason
  error?: string
}

// chain_site: a branded hotel whose only website is the brand's (marriott.com,
// hyatt.com), so there is no property domain to search; the GM needs a
// LinkedIn lookup by a person.
export type NoContactReason = 'no_website' | 'chain_site' | 'nothing_found' | 'no_findymail'

type ProspectForPrep = Prisma.ProspectGetPayload<{
  include: {
    contacts: true
    signals: { select: { kind: true; observedAt: true; data: true } }
    research: { select: { attempts: true } }
  }
}>

/** Findymail credits spent this calendar month (UTC), dry runs included. */
export async function findymailUsedThisMonth(companyId: string, now = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const runs = await prisma.leadMachineRun.findMany({
    where: { companyId, stage: 'prep', startedAt: { gte: monthStart } },
    select: { stats: true },
  })
  return runs.reduce((sum, r) => {
    const s = (r.stats as { findymail?: { finds?: number; verifies?: number; employeeLookups?: number } } | null)?.findymail
    return sum + (s?.finds ?? 0) + (s?.verifies ?? 0) + (s?.employeeLookups ?? 0)
  }, 0)
}

function segmentOf(p: ProspectForPrep): string {
  if (p.tags.includes('resort')) return 'resort'
  return p.businessType === 'hotel' || p.businessType === 'bar' ? p.businessType : 'restaurant'
}

function signalLine(s: { kind: string; observedAt: Date; data: unknown }): string | null {
  const d = (s.data ?? {}) as Record<string, unknown>
  const day = s.observedAt.toISOString().slice(0, 10)
  switch (s.kind) {
    case 'tabc_new_license':
      return `Texas liquor license application (${d.licenseType ?? '?'}) filed ${day}, status ${d.status ?? 'pending'}; owner on the filing: ${d.owner ?? 'not listed'}; trade name: ${d.tradeName ?? 'not listed'}.`
    case 'alcohol_sales':
      return `State alcohol sales records: about $${Number(d.totalReceipts ?? 0).toLocaleString('en-US')} in alcohol sales in ${d.month ?? 'a recent month'} (a busy operation); taxpayer: ${d.taxpayer ?? 'not listed'}.`
    case 'google_places':
      return `Google: ${d.rating ?? '?'} stars from ${d.reviews ?? '?'} reviews.`
    default:
      return null
  }
}

/** Everything the research step reads, as plain text. */
export function buildMaterial(p: { companyName: string; legalName: string | null; address: unknown; notes: string | null }, segment: string, signals: string[], place: PlaceFacts | null, site: SiteFacts | null): string {
  const addr = (p.address ?? {}) as { street?: string; city?: string }
  const parts = [
    `BUSINESS: ${p.companyName}${p.legalName && p.legalName !== p.companyName ? ` (legal name ${p.legalName})` : ''}`,
    `TYPE: ${segment}`,
    `ADDRESS: ${[addr.street, addr.city].filter(Boolean).join(', ') || 'unknown'}`,
    signals.length ? `PUBLIC RECORDS:\n${signals.map((s) => `- ${s}`).join('\n')}` : '',
  ]
  if (place) {
    parts.push(
      `GOOGLE LISTING: ${place.name}, ${place.address ?? ''}. ${place.type ?? ''}. ${place.rating ?? '?'} stars, ${place.reviewCount ?? '?'} reviews. Price level ${place.priceLevel ?? 'unknown'}. Status ${place.status ?? 'unknown'}.${place.summary ? ` Summary: ${place.summary}` : ''}`,
      place.reviews.length ? `RECENT REVIEWS (for context only, never quote them):\n${place.reviews.map((r) => `- (${r.rating ?? '?'} stars, ${r.when ?? ''}) ${r.text}`).join('\n')}` : '',
    )
  }
  if (site) parts.push(`THEIR WEBSITE (${site.url}):\n${site.text}`)
  return parts.filter(Boolean).join('\n\n')
}

function draftBrief(name: string, segment: string, notes: ResearchNotes, recipient: { firstName: string; title: string | null } | null): string {
  return [
    `Write the first email to ${name} (${segment}).`,
    recipient?.firstName ? `Recipient: ${recipient.firstName}${recipient.title ? `, ${recipient.title}` : ''}. Greet them as "Hi ${recipient.firstName},".` : 'Recipient: a general inbox, no name. Greet with "Hi,".',
    `What kind of operation: ${notes.segmentNote || segment}`,
    notes.highlights.length ? `Research notes you may use:\n${notes.highlights.map((h) => `- ${h}`).join('\n')}` : 'Research notes: nothing specific beyond the name, type and location.',
    notes.cautions.length ? `Avoid:\n${notes.cautions.map((c) => `- ${c}`).join('\n')}` : '',
  ].filter(Boolean).join('\n\n')
}

async function prepOne(p: ProspectForPrep, deps: {
  write: boolean
  claude: ClaudeWriter
  findymail: Findymail | null
  placesKey: string | null
  placesBudget: { remaining: number }
  stats: { placesCalls: number }
  fetchImpl?: FetchLike
  actorId: string | null
  now: Date
  signal: AbortSignal
}): Promise<PrepOutcome> {
  const segment = segmentOf(p)
  const addr = (p.address ?? {}) as { street?: string; city?: string }
  const signals = p.signals.map(signalLine).filter((s): s is string => !!s)

  let place: PlaceFacts | null = null
  if (deps.placesKey && deps.placesBudget.remaining > 0) {
    deps.placesBudget.remaining--
    deps.stats.placesCalls++
    place = await lookupPlace({ apiKey: deps.placesKey, name: p.companyName, street: addr.street, city: addr.city, fetchImpl: deps.fetchImpl }).catch(() => null)
  }
  const website = p.website || place?.website || null
  const site = website ? await readSite(website, { fetchImpl: deps.fetchImpl }) : null
  const notes = await deps.claude.research(buildMaterial(p, segment, signals, place, site))
  if (deps.signal.aborted) throw new OutOfTime('Out of time for this run')

  // Contacts already on file (with a usable address) win: no paid lookups.
  let found: FoundContact[] = []
  let recipient: { id?: string; firstName: string; lastName: string; title: string | null; email: string; emailVerificationStatus: string | null; emailSource: string | null } | null =
    pickRecipient(p.contacts.filter((c) => c.email)) as typeof recipient
  if (!recipient) {
    found = await findContacts({
      segment,
      domain: ownDomain(website),
      decisionMaker: notes.decisionMaker,
      siteEmails: site?.emails ?? [],
      findymail: deps.findymail,
    })
    recipient = found[0] ?? null
  }

  const noContactReason: NoContactReason | undefined = recipient
    ? undefined
    : !website
      ? 'no_website'
      : !ownDomain(website)
        ? 'chain_site'
        : !deps.findymail
          ? 'no_findymail'
          : 'nothing_found'

  const packet = {
    noContactReason: noContactReason ?? null,
    segment,
    signals,
    place,
    site: site ? { url: site.url, emails: site.emails, pagesRead: site.pagesRead } : null,
    notes,
  }

  let outcome: PrepOutcome = {
    prospectId: p.id,
    name: p.companyName,
    status: 'no_contact',
    contact: recipient
      ? {
          name: [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || recipient.title || 'General inbox',
          email: recipient.email,
          status: recipient.emailVerificationStatus ?? 'unknown',
          source: recipient.emailSource ?? 'crm',
        }
      : null,
    draft: null,
    problems: [],
    notes,
    noContactReason,
  }

  let draftFailed = false
  if (recipient) {
    const firstName = recipient.firstName?.trim() ? displayName(recipient.firstName.trim()) : null
    // A draft that errors (time, refusal, bad output) must not lose the
    // contacts already paid for: they are saved and the draft retried later.
    try {
      const { draft, problems } = await deps.claude.draft(
        draftBrief(p.companyName, segment, notes, firstName ? { firstName, title: recipient.title } : null),
        firstName,
        p.companyName,
      )
      outcome = { ...outcome, status: problems.length ? 'no_draft' : 'drafted', draft, problems }
    } catch (err) {
      draftFailed = true
      outcome = { ...outcome, status: 'no_draft', problems: [`draft failed: ${err instanceof Error ? err.message : String(err)}`] }
    }
  }

  if (!deps.write) return outcome

  await prisma.$transaction(async (tx) => {
    // Fill gaps on the prospect only; never overwrite what a person entered.
    await tx.prospect.update({
      where: { id: p.id },
      data: {
        ...(!p.website && website ? { website } : {}),
        ...(!p.phone && place?.phone ? { phone: place.phone } : {}),
      },
    })
    let contactId = recipient?.id ?? null
    for (const c of found) {
      const row = await tx.prospectContact.create({
        data: {
          prospectId: p.id,
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title,
          email: c.email,
          emailSource: c.emailSource,
          emailVerificationStatus: c.emailVerificationStatus,
          emailVerified: c.emailVerificationStatus === 'valid',
          emailVerifiedAt: c.emailVerificationStatus === 'unknown' ? null : deps.now,
          isDecisionMaker: c.isDecisionMaker,
          linkedinUrl: c.linkedinUrl,
          role: 'primary',
          notes: 'Found by the lead machine',
        },
        select: { id: true },
      })
      if (c === recipient) contactId = row.id
    }
    let draftMessageId: string | null = null
    if (outcome.status === 'drafted' && outcome.draft && contactId) {
      // No campaign and no schedule: the executor never picks it up, so the
      // only way out is a human approving and sending it from the queue.
      const msg = await tx.outreachMessage.create({
        data: {
          prospectId: p.id,
          contactId,
          step: 1,
          delayDays: 0,
          channel: 'email',
          subject: outcome.draft.subject,
          body: outcome.draft.body,
          isAiGenerated: true,
          aiPrompt: `lead-machine: ${outcome.draft.angle}`.slice(0, 1000),
          approvalStatus: 'pending',
          status: 'pending',
        },
        select: { id: true },
      })
      draftMessageId = msg.id
    }
    // Missing or stopped Findymail isn't the account's fault: try again in two
    // days without using up an attempt. A draft that errored or broke the
    // rules is redrafted (contacts are on file now, so no paid lookups).
    const ourFault = outcome.status === 'no_contact' && noContactReason === 'no_findymail'
    const attempts = (p.research?.attempts ?? 0) + (ourFault ? 0 : 1)
    const revisitAfter = ourFault
      ? new Date(deps.now.getTime() + 2 * DAY)
      : attempts >= MAX_ATTEMPTS
        ? null
        : outcome.status === 'no_contact'
          ? new Date(deps.now.getTime() + 60 * DAY)
          : outcome.status === 'no_draft'
            ? new Date(deps.now.getTime() + (draftFailed ? 2 : 7) * DAY)
            : null
    const row = {
      companyId: p.companyId,
      status: outcome.status,
      packet: { ...packet, problems: outcome.problems } as Prisma.InputJsonValue,
      contactsFound: found.length,
      draftMessageId,
      error: outcome.problems.length ? outcome.problems.join('; ') : null,
      attempts,
      researchedAt: deps.now,
      revisitAfter,
    }
    await tx.prospectResearch.upsert({ where: { prospectId: p.id }, create: { prospectId: p.id, ...row }, update: row })
    if (deps.actorId) {
      await tx.prospectActivity.create({
        data: {
          prospectId: p.id,
          userId: deps.actorId,
          type: 'note',
          channel: 'system',
          title: 'Lead machine researched this account',
          description:
            outcome.status === 'drafted'
              ? `Found ${outcome.contact?.name} (${outcome.contact?.email}) and queued a first email for approval.`
              : outcome.status === 'no_draft'
                ? 'Found a contact, but the draft broke the writing rules twice, so nothing was queued.'
                : noContactReason === 'chain_site'
                  ? 'Chain hotel: the only website is the brand site, so the general manager needs a LinkedIn lookup.'
                  : 'No contact email found yet. The machine will look again in about two months.',
          metadata: { highlights: notes.highlights, decisionMaker: notes.decisionMaker } as Prisma.InputJsonValue,
        },
      })
    }
  })
  return outcome
}

export type PrepResult = {
  dryRun: boolean
  accounts: number
  drafted: number
  noContact: number
  noDraft: number
  failed: number
  left: number
  outcomes: PrepOutcome[]
}

/**
 * Prep up to the nightly cap of accounts. `prospectIds` preps those instead
 * (any prospect, not just the machine's). `dryRun` writes nothing but still
 * spends Google, Claude and (unless `paid` is false) Findymail calls.
 */
export async function runPrep(companyId: string, opts: {
  dryRun?: boolean
  limit?: number
  prospectIds?: string[]
  paid?: boolean
  now?: Date
  fetchImpl?: FetchLike
} = {}): Promise<PrepResult | null> {
  const settings = await getSettings(companyId)
  const dryRun = opts.dryRun ?? settings.dryRun
  const now = opts.now ?? new Date()
  const started = Date.now()

  if (!process.env.ANTHROPIC_API_KEY) {
    await skipStage(companyId, 'prep', dryRun, 'ANTHROPIC_API_KEY is not set')
    return null
  }

  return runStage(companyId, 'prep', dryRun, async (report) => {
    const branch = await prisma.branch.findFirst({
      where: { companyId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { timezone: true },
    })
    const dayStart = getStartOfLocalDay(now, branch?.timezone || 'America/Chicago')
    const doneToday = opts.prospectIds
      ? 0
      : await prisma.prospectResearch.count({ where: { companyId, researchedAt: { gte: dayStart } } })
    const limit = Math.max(0, Math.min(opts.limit ?? Infinity, opts.prospectIds ? 25 : settings.prepDailyCap - doneToday))

    const include = {
      contacts: true,
      signals: { where: { kind: { not: 'machine_seen' } }, select: { kind: true, observedAt: true, data: true } },
      research: { select: { attempts: true } },
    } as const
    const queue: ProspectForPrep[] = opts.prospectIds
      ? await prisma.prospect.findMany({
          where: { companyId, id: { in: opts.prospectIds }, deletedAt: null, doNotContact: false, outreachMessages: { none: { step: 1 } } },
          include,
        })
      : await prisma.prospect.findMany({
          where: {
            companyId,
            source: 'lead_machine',
            status: 'prospect',
            deletedAt: null,
            doNotContact: false,
            // Never a second first-touch for an account that already has one.
            outreachMessages: { none: { step: 1 } },
            OR: [
              { research: null },
              { research: { status: { in: ['no_contact', 'no_draft', 'failed'] }, revisitAfter: { lte: now }, attempts: { lt: MAX_ATTEMPTS } } },
            ],
          },
          include,
          orderBy: { createdAt: 'asc' },
          take: 200,
        })
    // Hotels and resorts (high priority) first, oldest first within a tier.
    queue.sort((a, b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1))

    const claude = new ClaudeWriter(process.env.ANTHROPIC_API_KEY!)
    claude.deadline = started + HARD_DEADLINE_MS
    const timeUp = new AbortController()
    const timer = setTimeout(() => timeUp.abort(), Math.max(0, started + HARD_DEADLINE_MS - Date.now()))
    const fmKey = process.env.FINDYMAIL_API_KEY
    const findymail =
      fmKey && opts.paid !== false
        ? new Findymail(fmKey, { remaining: Math.max(0, settings.findymailMonthlyCap - (await findymailUsedThisMonth(companyId, now))) }, opts.fetchImpl)
        : null
    const placesKey = process.env.GOOGLE_PLACES_API_KEY ?? null
    const placesBudget = { remaining: Math.max(0, settings.placesMonthlyCallCap - (await placesCallsThisMonth(companyId, now))) }
    const stats = { placesCalls: 0 }
    const actorId = await resolveOutreachActorId(companyId)

    const outcomes: PrepOutcome[] = []
    let findymailStopped: string | null = null
    const usage = () => ({ placesCalls: stats.placesCalls, findymail: findymail?.usage ?? null, findymailStopped, claude: claude.usage })
    for (const p of queue.slice(0, limit)) {
      if (Date.now() - started > START_BUDGET_MS) break
      try {
        outcomes.push(
          await prepOne(p, {
            write: !dryRun,
            claude,
            findymail: findymailStopped ? null : findymail,
            placesKey,
            placesBudget,
            stats,
            fetchImpl: opts.fetchImpl,
            actorId,
            now,
            signal: timeUp.signal,
          }),
        )
      } catch (err) {
        // Out of time: leave the account untouched; it goes first next night.
        if (err instanceof OutOfTime) break
        if (err instanceof FindymailStopped) findymailStopped = err.message
        const error = err instanceof Error ? err.message : String(err)
        outcomes.push({ prospectId: p.id, name: p.companyName, status: 'failed', contact: null, draft: null, problems: [], notes: null, error })
        if (!dryRun) {
          const attempts = (p.research?.attempts ?? 0) + 1
          const row = {
            companyId,
            status: 'failed',
            packet: {} as Prisma.InputJsonValue,
            error: error.slice(0, 2000),
            attempts,
            researchedAt: now,
            revisitAfter: attempts < MAX_ATTEMPTS ? new Date(now.getTime() + 2 * DAY) : null,
          }
          await prisma.prospectResearch
            .upsert({ where: { prospectId: p.id }, create: { prospectId: p.id, ...row }, update: row })
            .catch((e) => console.error('[lead-machine] could not record a failed account:', e))
        }
      }
      await report({ accounts: outcomes.length, ...usage() })
    }
    clearTimeout(timer)

    const count = (s: PrepOutcome['status']) => outcomes.filter((o) => o.status === s).length
    const result: PrepResult = {
      dryRun,
      accounts: outcomes.length,
      drafted: count('drafted'),
      noContact: count('no_contact'),
      noDraft: count('no_draft'),
      failed: count('failed'),
      left: Math.max(0, queue.length - outcomes.length),
      outcomes,
    }
    // A live run where most accounts failed is logged as a failed run, so the
    // health check reports it instead of it passing as a quiet success.
    if (!dryRun && result.failed > 0 && result.failed >= Math.ceil(result.accounts / 2)) {
      throw Object.assign(new Error(`${result.failed} of ${result.accounts} accounts failed: ${outcomes.find((o) => o.error)?.error}`), {
        stats: { ...summaryStats(result), ...usage() },
      })
    }
    return {
      value: result,
      stats: { ...summaryStats(result), ...usage() },
    }
  })
}

function summaryStats(r: PrepResult) {
  return {
    accounts: r.accounts,
    drafted: r.drafted,
    noContact: r.noContact,
    noDraft: r.noDraft,
    failed: r.failed,
    left: r.left,
    chainHotels: r.outcomes.filter((o) => o.noContactReason === 'chain_site').map((o) => o.name),
    names: r.outcomes.map((o) => `${o.name}: ${o.status}${o.contact ? ` (${o.contact.email})` : o.noContactReason ? ` (${o.noContactReason.replace('_', ' ')})` : ''}`).slice(0, 50),
  }
}
