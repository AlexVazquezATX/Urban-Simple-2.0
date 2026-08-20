// Send-time guards shared by every outreach send path (the executor cron and
// the approval-queue 'send' action). These are LAST-LINE defenses: queue
// hygiene (backfill-merge-tags, contact fixes) should catch problems earlier,
// but nothing that slips through may reach Resend.

import { prisma } from '@/lib/db'

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
