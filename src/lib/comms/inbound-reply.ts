// What an inbound reply says and who it belongs to. Resend's webhook carries
// metadata only, and people often reply from an address we don't have on file
// (the owner answering what went to info@), so neither can be read straight
// off the event.

import { prisma } from '@/lib/db'
import { stripReplyPrefix } from './log'

const DAY = 86_400_000
const THREAD_WINDOW_DAYS = 120

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

/**
 * The reply's text. Needs a full-access key: RESEND_API_KEY may be limited to
 * sending. Fail-soft: a reply with no text still gets recorded.
 */
export async function receivedEmailText(
  data: Record<string, unknown>,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  let text = typeof data.text === 'string' ? data.text : ''
  let html = typeof data.html === 'string' ? data.html : ''
  const key = process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY
  if (!text.trim() && !html.trim() && typeof data.email_id === 'string' && key) {
    try {
      const res = await fetchImpl(`https://api.resend.com/emails/receiving/${encodeURIComponent(data.email_id)}`, {
        headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      })
      if (res.ok) {
        const full = (await res.json()) as { text?: string | null; html?: string | null }
        text = full.text ?? ''
        html = full.html ?? ''
      } else {
        console.warn(`[RESEND INBOUND] Could not read reply ${data.email_id}: HTTP ${res.status}. Set RESEND_RECEIVING_API_KEY to a full-access key.`)
      }
    } catch (err) {
      console.warn('[RESEND INBOUND] Could not read reply text:', err)
    }
  }
  const body = text.trim() ? text : html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return body.slice(0, 10_000)
}

export type ReplyProspect = { id: string; companyId: string; companyName: string }

/**
 * Sender on a contact record first (most recently contacted wins). Otherwise
 * the one prospect we sent this subject to recently; several means we can't
 * tell, and a person sorts it out in the hub.
 */
export async function findProspectForReply(fromEmail: string, subject: string | null): Promise<ReplyProspect | null> {
  const contacts = await prisma.prospectContact.findMany({
    where: { email: { equals: fromEmail, mode: 'insensitive' } },
    select: {
      prospect: {
        select: { id: true, companyId: true, companyName: true, lastContactedAt: true, deletedAt: true },
      },
    },
  })
  const byContact = contacts
    .map((c) => c.prospect)
    .filter((p) => p && !p.deletedAt)
    .sort((a, b) => (b.lastContactedAt?.getTime() ?? 0) - (a.lastContactedAt?.getTime() ?? 0))[0]
  if (byContact) return byContact

  const original = stripReplyPrefix(subject)
  if (!original) return null
  const sent = await prisma.commMessage.findMany({
    where: {
      direction: 'outbound',
      category: 'outreach',
      prospectId: { not: null },
      subject: { equals: original, mode: 'insensitive' },
      createdAt: { gte: new Date(Date.now() - THREAD_WINDOW_DAYS * DAY) },
    },
    select: { prospectId: true },
    take: 50,
  })
  const ids = [...new Set(sent.map((m) => m.prospectId))]
  if (ids.length !== 1 || !ids[0]) return null
  const prospect = await prisma.prospect.findUnique({
    where: { id: ids[0] },
    select: { id: true, companyId: true, companyName: true, deletedAt: true },
  })
  return prospect && !prospect.deletedAt ? prospect : null
}

/** A reply matching no prospect has no company of its own: use whoever last sent outreach. */
export async function companyForUnmatchedReply(): Promise<string | null> {
  const last = await prisma.commMessage.findFirst({
    where: { direction: 'outbound', category: 'outreach' },
    orderBy: { createdAt: 'desc' },
    select: { companyId: true },
  })
  return last?.companyId ?? null
}
