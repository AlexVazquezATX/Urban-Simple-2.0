// Who an outreach email goes to, and whether that address is safe to send to.
//
// Every enrollment and every send path goes through here, so the greeting
// resolved at enroll time and the address used at send time are the same
// person, and no cold email reaches an address that has not checked out.
// Bounces from guessed addresses were ~10% of sends, enough to push the whole
// sending domain toward spam folders.

import { prisma } from '@/lib/db'
import { verifyEmail as abstractVerify } from './email-verification'
import { verifyEmail as hunterVerify } from './hunter-service'
import { isValidEmail } from './outreach-guards'

export type RecipientCandidate = {
  id?: string
  email: string | null
  isDecisionMaker?: boolean | null
  emailVerificationStatus?: string | null
  emailVerifiedAt?: Date | null
  createdAt?: Date | null
}

/**
 * Prospects who came to us (website forms, Meta lead ads, referrals) typed
 * their own address, so it skips the cold-outreach verification gate.
 */
const INBOUND_SOURCES = new Set(['website', 'meta', 'meta_lead_ad', 'referral'])

export function isInboundSource(source: string | null | undefined): boolean {
  return !!source && INBOUND_SOURCES.has(source)
}

// Verification statuses on ProspectContact.emailVerificationStatus:
//   valid / risky (catch-all) / unknown (provider couldn't tell) / invalid
//   (provider says undeliverable) / bounced (a real send hard-bounced).
// 'bounced' is the strongest: it blocks the address on every record, inbound
// leads included. 'invalid' blocks cold outreach to that contact only.
const DEAD_STATUSES = new Set(['invalid', 'bounced'])

// Lower is better. Unverified beats risky (catch-all) because verification can
// still promote it to valid; dead addresses are never picked.
const STATUS_RANK: Record<string, number> = { valid: 0, unknown: 1, risky: 2 }

function usableContacts<T extends RecipientCandidate>(contacts: T[] | null | undefined): T[] {
  return (contacts ?? []).filter(
    (c) => isValidEmail(c.email) && !DEAD_STATUSES.has(c.emailVerificationStatus ?? ''),
  )
}

const byCreated = (a: RecipientCandidate, b: RecipientCandidate) =>
  (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)

/**
 * Best contact to email at a prospect: a usable address first, then verified
 * over unverified, decision-makers first, oldest contact as the tiebreak (so the
 * choice is stable between enroll time and send time). Null when no contact has
 * a usable address. Used when a message is created, and pinned on it.
 */
export function pickRecipient<T extends RecipientCandidate>(contacts: T[] | null | undefined): T | null {
  const usable = usableContacts(contacts)
  if (usable.length === 0) return null
  return [...usable].sort((a, b) => {
    const ra = STATUS_RANK[a.emailVerificationStatus ?? 'unknown'] ?? 1
    const rb = STATUS_RANK[b.emailVerificationStatus ?? 'unknown'] ?? 1
    if (ra !== rb) return ra - rb
    const da = a.isDecisionMaker ? 0 : 1
    const db = b.isDecisionMaker ? 0 : 1
    if (da !== db) return da - db
    return byCreated(a, b)
  })[0]
}

/**
 * The contact list with the best recipient moved to the front. The AI composer
 * greets contacts[0], so drafting from this list greets the person the message
 * will actually be sent to.
 */
export function recipientFirst<T extends RecipientCandidate>(contacts: T[]): T[] {
  const best = pickRecipient(contacts)
  return best ? [best, ...contacts.filter((c) => c !== best)] : contacts
}

/**
 * The contact a message should go to: the address the operator chose
 * (recipientEmail), else the contact pinned when it was created. Returns a bare
 * { email } candidate when the chosen address matches no contact.
 *
 * Unpinned rows (created before pinning existed, or when the prospect had no
 * usable address yet) were greeted from the oldest contact, so they go to the
 * oldest usable contact, not the best-ranked one; ranking them now could send
 * "Hi Bryce" to Devon. Callers pass a follow-up's step-1 address as
 * recipientEmail so a sequence stays with one person.
 */
export function resolveMessageRecipient<T extends RecipientCandidate>(
  message: { contactId?: string | null; recipientEmail?: string | null },
  contacts: T[] | null | undefined,
): T | RecipientCandidate | null {
  const list = contacts ?? []
  if (message.recipientEmail) {
    const wanted = message.recipientEmail.trim().toLowerCase()
    return list.find((c) => c.email?.trim().toLowerCase() === wanted) ?? { email: message.recipientEmail.trim() }
  }
  if (message.contactId) {
    // A pinned contact that still exists is used even if its address went bad,
    // so the gate blocks it instead of greeting one person and emailing another.
    const pinned = list.find((c) => c.id === message.contactId)
    if (pinned) return pinned
  }
  return [...usableContacts(list)].sort(byCreated)[0] ?? null
}

type VerificationStatus = 'valid' | 'invalid' | 'risky' | 'unknown'

// "Unknown" means the provider could not reach the mail server. Retry after a
// week instead of paying for a fresh check on every hourly executor run.
const UNKNOWN_RECHECK_MS = 7 * 24 * 60 * 60 * 1000

async function runVerification(email: string): Promise<VerificationStatus | null> {
  if (process.env.ABSTRACT_API_KEY) {
    try {
      const r = await abstractVerify(email)
      switch (r.deliverability) {
        case 'DELIVERABLE': return 'valid'
        case 'UNDELIVERABLE': return 'invalid'
        case 'RISKY': return 'risky'
        default: return 'unknown'
      }
    } catch (err) {
      console.error('[OUTREACH VERIFY] Abstract failed, trying Hunter:', err)
    }
  }
  if (process.env.HUNTER_API_KEY) {
    try {
      const r = await hunterVerify(email)
      if (!r) return null
      switch (r.result) {
        case 'deliverable': return 'valid'
        case 'undeliverable': return 'invalid'
        case 'risky': return 'risky'
        default: return 'unknown'
      }
    } catch (err) {
      console.error('[OUTREACH VERIFY] Hunter failed:', err)
    }
  }
  return null
}

export type SendCheck =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'no_recipient_email'
        | 'invalid_recipient_email'
        | 'address_bounced'
        | 'address_opted_out'
        | 'address_known_bad'
        | 'address_risky'
        | 'address_unverified'
    }

/** Reasons a human may knowingly override (allowUnverified). Never bounces or opt-outs. */
const OVERRIDABLE = new Set(['address_risky', 'address_unverified'])

/**
 * The cold-outreach verification gate.
 *
 * - An address that hard-bounced, or whose owner opted out, on any of the
 *   company's prospect records is blocked for everyone, inbound leads included.
 *   That also catches a later CSV re-import of someone who unsubscribed.
 * - Inbound leads otherwise pass on a well-formed address.
 * - Everyone else needs a 'valid' verification. Unverified addresses are checked
 *   here (Abstract, then Hunter) and the result is saved on the contact, so each
 *   address costs one lookup. `verifyBudget` caps lookups per call site run.
 * - Catch-all ("risky") and unverifiable addresses are blocked unless a human
 *   passes `allowUnverified` for a one-off send they chose deliberately.
 */
export async function checkSendable(
  contact: RecipientCandidate | null,
  prospect: { source?: string | null; companyId?: string | null },
  opts: { allowUnverified?: boolean; verifyBudget?: { remaining: number } } = {},
): Promise<SendCheck> {
  const result = await gate(contact, prospect, opts.verifyBudget)
  if (!result.ok && opts.allowUnverified && OVERRIDABLE.has(result.reason)) return { ok: true }
  return result
}

async function gate(
  contact: RecipientCandidate | null,
  prospect: { source?: string | null; companyId?: string | null },
  verifyBudget?: { remaining: number },
): Promise<SendCheck> {
  if (!contact?.email) return { ok: false, reason: 'no_recipient_email' }
  if (!isValidEmail(contact.email)) return { ok: false, reason: 'invalid_recipient_email' }
  const email = contact.email.trim()
  const sameAddress = {
    email: { equals: email, mode: 'insensitive' as const },
    ...(prospect.companyId ? { prospect: { companyId: prospect.companyId } } : {}),
  }

  if (contact.emailVerificationStatus === 'bounced') return { ok: false, reason: 'address_bounced' }
  const bounced = await prisma.prospectContact.findFirst({
    where: { ...sameAddress, emailVerificationStatus: 'bounced' },
    select: { id: true },
  })
  if (bounced) return { ok: false, reason: 'address_bounced' }
  const optedOut = await prisma.prospectContact.findFirst({
    where: {
      email: sameAddress.email,
      prospect: { doNotContact: true, ...(prospect.companyId ? { companyId: prospect.companyId } : {}) },
    },
    select: { id: true },
  })
  if (optedOut) return { ok: false, reason: 'address_opted_out' }

  if (isInboundSource(prospect.source)) return { ok: true }

  let status = (contact.emailVerificationStatus ?? null) as VerificationStatus | null
  const recentlyUnknown =
    status === 'unknown' &&
    !!contact.emailVerifiedAt &&
    Date.now() - contact.emailVerifiedAt.getTime() < UNKNOWN_RECHECK_MS

  const needsCheck = status !== 'valid' && status !== 'risky' && status !== 'invalid' && !recentlyUnknown
  if (needsCheck && (!verifyBudget || verifyBudget.remaining > 0)) {
    if (verifyBudget) verifyBudget.remaining--
    const fresh = await runVerification(email)
    if (fresh) {
      status = fresh
      await prisma.prospectContact.updateMany({
        where: contact.id ? { id: contact.id } : { email: { equals: email, mode: 'insensitive' } },
        data: {
          emailVerified: fresh === 'valid',
          emailVerifiedAt: new Date(),
          emailVerificationStatus: fresh,
        },
      })
    }
  }

  if (status === 'valid') return { ok: true }
  if (status === 'invalid') return { ok: false, reason: 'address_known_bad' }
  if (status === 'risky') return { ok: false, reason: 'address_risky' }
  return { ok: false, reason: 'address_unverified' }
}

/** Human-readable reason for the approval queue UI. */
export function describeSendCheck(reason: Exclude<SendCheck, { ok: true }>['reason'], email: string | null): string {
  switch (reason) {
    case 'no_recipient_email': return 'No email address. Edit the "To" field before sending'
    case 'invalid_recipient_email': return `Invalid recipient email "${email}"`
    case 'address_bounced': return `${email} has bounced before. Find a different contact`
    case 'address_opted_out': return `${email} has unsubscribed or is marked Do Not Contact`
    case 'address_known_bad': return `${email} failed verification (undeliverable). Find a different contact`
    case 'address_risky': return `${email} is on a catch-all domain and can't be verified. Use LinkedIn or a drop-by instead`
    case 'address_unverified': return `${email} could not be verified yet. Try again later or pick a different contact`
  }
}

/**
 * A hard bounce means the address does not exist. Mark it bounced on every
 * prospect record that carries it, so no future sequence picks it again.
 */
export async function suppressBouncedAddress(email: string, companyId?: string | null): Promise<number> {
  if (!isValidEmail(email)) return 0
  const { count } = await prisma.prospectContact.updateMany({
    where: {
      email: { equals: email.trim(), mode: 'insensitive' },
      ...(companyId ? { prospect: { companyId } } : {}),
    },
    data: {
      emailVerified: false,
      emailVerifiedAt: new Date(),
      emailVerificationStatus: 'bounced',
    },
  })
  return count
}
