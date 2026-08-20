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
