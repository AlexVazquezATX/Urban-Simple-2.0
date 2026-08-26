// Communications Hub logging — the single funnel every email flows through.
//
// Design: logging must NEVER break the send it observes. Every function here
// swallows its own errors (console.error only). If the comm_messages table is
// missing (schema not yet applied), sends keep working and the hub is simply
// empty.

import { prisma } from '@/lib/db'

export type CommCategory = 'outreach' | 'billing' | 'portal' | 'transactional' | 'reply' | 'other'

/** Normalized thread key: counterpart email + subject stripped of Re:/Fwd:. */
export function threadKeyFor(counterpartEmail: string | null | undefined, subject: string | null | undefined): string | null {
  if (!counterpartEmail) return null
  const normSubject = (subject ?? '')
    .replace(/^\s*((re|fwd?|aw)\s*:\s*)+/i, '')
    .trim()
    .toLowerCase()
    .slice(0, 120)
  return `${counterpartEmail.trim().toLowerCase()}::${normSubject}`
}

export interface LogCommInput {
  companyId: string
  direction: 'outbound' | 'inbound'
  category: CommCategory
  fromEmail?: string | null
  toEmail?: string | null
  subject?: string | null
  body?: string | null
  prospectId?: string | null
  clientId?: string | null
  invoiceId?: string | null
  userId?: string | null
  resendEmailId?: string | null
  messageIdHeader?: string | null
  status?: string
  sentAt?: Date | null
  receivedAt?: Date | null
  triageState?: string | null
  aiCategory?: string | null
  aiSummary?: string | null
  sourceType?: string
  sourceId?: string
}

/** Record a message in the hub. Fire-and-forget safe; returns the id or null. */
export async function logComm(input: LogCommInput): Promise<string | null> {
  try {
    const counterpart = input.direction === 'outbound' ? input.toEmail : input.fromEmail
    const row = await prisma.commMessage.create({
      data: {
        companyId: input.companyId,
        direction: input.direction,
        channel: 'email',
        category: input.category,
        fromEmail: input.fromEmail?.toLowerCase() ?? null,
        toEmail: input.toEmail?.toLowerCase() ?? null,
        subject: input.subject ?? null,
        body: input.body?.slice(0, 20_000) ?? null,
        prospectId: input.prospectId ?? null,
        clientId: input.clientId ?? null,
        invoiceId: input.invoiceId ?? null,
        userId: input.userId ?? null,
        resendEmailId: input.resendEmailId ?? null,
        messageIdHeader: input.messageIdHeader ?? null,
        threadKey: threadKeyFor(counterpart, input.subject),
        status: input.status ?? (input.direction === 'inbound' ? 'received' : 'sent'),
        sentAt: input.sentAt ?? (input.direction === 'outbound' ? new Date() : null),
        receivedAt: input.receivedAt ?? (input.direction === 'inbound' ? new Date() : null),
        triageState: input.triageState ?? null,
        aiCategory: input.aiCategory ?? null,
        aiSummary: input.aiSummary ?? null,
        sourceType: input.sourceType ?? 'live',
        sourceId: input.sourceId ?? null,
      },
      select: { id: true },
    })
    return row.id
  } catch (err) {
    console.error('[COMMS] logComm failed (send unaffected):', err)
    return null
  }
}

/** Advance lifecycle stamps from a Resend webhook event. Fire-and-forget safe. */
export async function stampCommByResendId(
  resendEmailId: string,
  event: 'delivered' | 'opened' | 'clicked' | 'bounced',
): Promise<void> {
  try {
    const now = new Date()
    const existing = await prisma.commMessage.findUnique({
      where: { resendEmailId },
      select: { id: true, status: true, deliveredAt: true, openedAt: true, clickedAt: true },
    })
    if (!existing) return
    const rank: Record<string, number> = { logged: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 }
    const eventStatus = event === 'bounced' ? 'bounced' : event
    const advance =
      event === 'bounced' || (rank[eventStatus] ?? 0) > (rank[existing.status] ?? 99)
    await prisma.commMessage.update({
      where: { id: existing.id },
      data: {
        ...(advance ? { status: eventStatus } : {}),
        ...(event === 'delivered' && !existing.deliveredAt ? { deliveredAt: now } : {}),
        ...(event === 'opened' && !existing.openedAt ? { openedAt: now } : {}),
        ...(event === 'clicked' && !existing.clickedAt ? { clickedAt: now } : {}),
        ...(event === 'bounced' ? { bouncedAt: now } : {}),
      },
    })
  } catch (err) {
    console.error('[COMMS] stampCommByResendId failed:', err)
  }
}
