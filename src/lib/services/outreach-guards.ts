// Send-time guards shared by every outreach send path (the executor cron and
// the approval-queue 'send' action). These are LAST-LINE defenses: queue
// hygiene (backfill-merge-tags, contact fixes) should catch problems earlier,
// but nothing that slips through may reach Resend.

import { prisma } from '@/lib/db'

/**
 * Reply-To for all outreach sends. Point this at the Resend Inbound address
 * (e.g. reply@in.urbansimple.net) so prospect replies flow into
 * /api/webhooks/resend as `email.received` events and land on the prospect's
 * activity timeline. Unset → no Reply-To header (replies go to the From
 * address's normal inbox, invisible to the CRM).
 */
export function outreachReplyTo(): { replyTo: string } | Record<string, never> {
  const addr = process.env.OUTREACH_REPLY_TO
  return addr ? { replyTo: addr } : {}
}

/**
 * A real User id to attribute automated outreach activity to (FK on
 * ProspectActivity.userId — the old `'system'` fallback violated it). Prefers
 * the company's first active SUPER_ADMIN.
 */
export async function resolveOutreachActorId(companyId: string): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { companyId, role: 'SUPER_ADMIN', isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return admin?.id ?? null
}

/**
 * A first email to an address another account already got one at, in the last
 * year. The same restaurant can sit in the CRM twice under two names (De Nada
 * did), and the identical-body check doesn't catch two different drafts.
 * Returns the other account's name.
 */
export async function findAddressEmailedForOtherProspect(email: string, prospectId: string): Promise<string | null> {
  const other = await prisma.outreachMessage.findFirst({
    where: {
      prospectId: { not: prospectId },
      sentAt: { not: null, gte: new Date(Date.now() - 365 * 86_400_000) },
      recipientEmail: { equals: email.trim(), mode: 'insensitive' },
    },
    select: { prospect: { select: { companyName: true } } },
  })
  return other ? other.prospect?.companyName ?? 'another account' : null
}

/**
 * The signature for an outreach email: the first of these users who has one,
 * else the company's first super admin who does. Outreach always goes out as
 * Alex, and agent users (Claude, Merc) have no signature of their own.
 */
export async function findSignature(
  companyId: string,
  preferredUserIds: Array<string | null | undefined>,
): Promise<{ emailSignature: string | null; signatureLogoUrl: string | null } | null> {
  const ids = preferredUserIds.filter((id): id is string => !!id)
  if (ids.length) {
    const users = await prisma.user.findMany({
      where: { id: { in: ids }, emailSignature: { not: null } },
      select: { id: true, emailSignature: true, signatureLogoUrl: true },
    })
    for (const id of ids) {
      const u = users.find((x) => x.id === id)
      if (u?.emailSignature?.trim()) return { emailSignature: u.emailSignature, signatureLogoUrl: u.signatureLogoUrl }
    }
  }
  const admin = await prisma.user.findFirst({
    where: { companyId, role: 'SUPER_ADMIN', isActive: true, emailSignature: { not: null } },
    orderBy: { createdAt: 'asc' },
    select: { emailSignature: true, signatureLogoUrl: true },
  })
  return admin?.emailSignature?.trim() ? admin : null
}

/** Matches unresolved merge tags like {{notes}} / {{ firstName }}. */
export const MERGE_TAG_RE = /\{\{[^}]*\}\}/

/** All distinct unresolved merge tags in a message's subject + body. */
export function findUnresolvedMergeTags(subject: string | null, body: string | null): string[] {
  const found = new Set<string>()
  for (const text of [subject, body]) {
    if (!text) continue
    for (const m of text.matchAll(/\{\{[^}]*\}\}/g)) found.add(m[0])
  }
  return [...found]
}

/** Pragmatic email shape check — catches null-ish, spaces, missing @/domain. */
export function isValidEmail(email: string | null | undefined): email is string {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Has this exact body already been SENT to this recipient (on any prospect
 * record)? Duplicate prospect rows produce identical queued messages to the
 * same address — this stops the second copy at send time. Returns the id of
 * the already-sent duplicate, or null.
 */
export async function findDuplicateAlreadySent(
  body: string,
  toEmail: string,
  excludeMessageId: string,
): Promise<string | null> {
  const dup = await prisma.outreachMessage.findFirst({
    where: {
      id: { not: excludeMessageId },
      sentAt: { not: null },
      body,
      prospect: { contacts: { some: { email: toEmail } } },
    },
    select: { id: true },
  })
  return dup?.id ?? null
}
