// Two short follow-ups after a lead machine first email: about 4 days later,
// then about a week after that. One cold email on its own rarely gets a reply.
//
// They are created when the first email actually sends, not when it's drafted,
// so the gap counts from the real send. They stop on a reply, a bounce, an
// unsubscribe, Do Not Contact, a person moving the account to a decided or
// engaged status, or a logged call or meeting.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { nextSendSlot, slotAfterDays } from './autopilot-schedule'
import { companySendWindow, type SendWindow } from './send-schedule'
import { resolveOutreachActorId } from './outreach-guards'

export const COLD_FOLLOWUP_CAMPAIGN = 'Cold follow-ups'

// No sign-off: the signature is added at send time.
export const COLD_FOLLOWUP_STEPS = [
  {
    step: 2,
    delayDays: 4,
    body: `Following up on my last note in case it got buried. If nightly cleaning is on your list, we can walk the space at a time that suits you, and you'll have a written quote within 48 hours.

Worth a quick reply either way?`,
  },
  {
    step: 3,
    delayDays: 7,
    body: `Last note from me. If the timing isn't right, no problem. If it ever is, just reply here and we'll set up a walkthrough. The first deep clean of every location is free with a 3-month agreement.`,
  },
] as const

/** Reuse the first email's greeting ("Hi Kristen," or "Hi,") so the thread reads as one person. */
export function greetingFrom(firstBody: string): string {
  const first = firstBody.trim().split(/\r?\n/)[0]?.trim() ?? ''
  return /^(Hi|Hello|Hey)\b[^,\n]{0,40},$/.test(first) ? first : 'Hi,'
}

export function replySubject(subject: string | null): string {
  const s = (subject ?? '').trim()
  if (!s) return 'Following up'
  return /^re:/i.test(s) ? s : `Re: ${s}`
}

export function buildColdFollowUps(input: {
  subject: string | null
  firstBody: string
  sentAt: Date
  window: SendWindow
  now: Date
}) {
  const greeting = greetingFrom(input.firstBody)
  const subject = replySubject(input.subject)
  const out: Array<{ step: number; delayDays: number; subject: string; body: string; scheduledAt: Date }> = []
  let previous = input.sentAt
  for (const s of COLD_FOLLOWUP_STEPS) {
    let at = slotAfterDays(previous, s.delayDays, input.window)
    // Backfilled sends from days ago: go at the next slot, not in the past.
    if (at.getTime() <= input.now.getTime()) at = nextSendSlot(input.now, input.window, { minLeadMinutes: 30 })
    out.push({ step: s.step, delayDays: s.delayDays, subject, body: `${greeting}\n\n${s.body}`, scheduledAt: at })
    previous = at
  }
  return out
}

/**
 * Called after a first email sends. Creates the follow-ups for a lead machine
 * account, once. Returns how many it created.
 */
export async function queueColdFollowUps(messageId: string, now = new Date(), db: Prisma.TransactionClient | typeof prisma = prisma): Promise<number> {
  const msg = await db.outreachMessage.findUnique({
    where: { id: messageId },
    include: { prospect: { select: { id: true, source: true, companyId: true, doNotContact: true, deletedAt: true } } },
  })
  if (!msg?.prospect || !msg.prospectId || !msg.sentAt) return 0
  if (msg.step !== 1 || msg.channel !== 'email' || msg.campaignId) return 0
  if (msg.prospect.source !== 'lead_machine' || msg.prospect.doNotContact || msg.prospect.deletedAt) return 0
  const already = await db.outreachMessage.count({ where: { prospectId: msg.prospectId, step: { gt: 1 } } })
  if (already > 0) return 0

  const settings = await companySendWindow(msg.prospect.companyId)
  if (!settings) return 0
  const ownerId = msg.approvedById ?? (await resolveOutreachActorId(msg.prospect.companyId))
  if (!ownerId) return 0

  const steps = buildColdFollowUps({ subject: msg.subject, firstBody: msg.body, sentAt: msg.sentAt, window: settings.window, now })
  const campaign = await db.outreachCampaign.create({
    data: {
      companyId: msg.prospect.companyId,
      prospectId: msg.prospectId,
      createdById: ownerId,
      name: COLD_FOLLOWUP_CAMPAIGN,
      description: 'Two follow-ups after the lead machine first email. Stop on a reply.',
      status: 'active',
      autopilot: false,
    },
    select: { id: true },
  })
  // The first email joins the campaign so the executor sees it as the earlier
  // step and sends the follow-ups to the same address.
  await db.outreachMessage.update({ where: { id: msg.id }, data: { campaignId: campaign.id } })
  for (const s of steps) {
    await db.outreachMessage.create({
      data: {
        campaignId: campaign.id,
        prospectId: msg.prospectId,
        contactId: msg.contactId,
        recipientEmail: msg.recipientEmail,
        step: s.step,
        delayDays: s.delayDays,
        channel: 'email',
        subject: s.subject,
        body: s.body,
        isAiGenerated: false,
        status: 'pending',
        approvalStatus: 'approved',
        approvedAt: now,
        approvedById: ownerId,
        scheduledAt: s.scheduledAt,
      },
    })
  }
  return steps.length
}
