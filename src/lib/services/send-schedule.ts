// Approving a first email is the decision to send it. It used to stop there:
// the message sat in Ready to Send until someone also clicked Send, and 14
// approved drafts waited four days that way. Now approval books each one into
// the company send window, a capped number per day, and the hourly executor
// sends it when its time comes. Send in the queue still goes immediately.

import { prisma } from '@/lib/db'
import { getLocalDateUTC, getStartOfLocalDay, nextSendSlot } from './autopilot-schedule'

export type SendWindow = {
  timezone: string
  hourStart: number
  hourEnd: number
  daysOfWeek: number[]
}

function dayKey(date: Date, timezone: string): string {
  return getLocalDateUTC(date, timezone).toISOString().slice(0, 10)
}

/**
 * Times for `count` new first emails: inside the send window, never more than
 * `dailyCap` on one local day once `booked` (already sent or scheduled) is
 * counted, earliest first.
 */
export function planSendSlots(input: {
  count: number
  now: Date
  window: SendWindow
  dailyCap: number
  booked: Map<string, number>
}): Date[] {
  const { window } = input
  const cap = Math.max(1, input.dailyCap)
  const booked = new Map(input.booked)
  const out: Date[] = []
  let from = input.now
  for (let tries = 0; out.length < input.count && tries < 2000; tries++) {
    const slot = nextSendSlot(from, window, { minLeadMinutes: 5 })
    const key = dayKey(slot, window.timezone)
    if ((booked.get(key) ?? 0) < cap) {
      out.push(slot)
      booked.set(key, (booked.get(key) ?? 0) + 1)
    } else {
      // Day is full: start from early the next local day (26h clears DST).
      from = new Date(getStartOfLocalDay(slot, window.timezone).getTime() + 26 * 3600_000)
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime())
}

export async function companySendWindow(companyId: string): Promise<{ window: SendWindow; dailyCap: number } | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      autopilotDailyCap: true,
      autopilotSendHourStart: true,
      autopilotSendHourEnd: true,
      autopilotSendDaysOfWeek: true,
      branches: { where: { isActive: true }, select: { timezone: true }, take: 1 },
    },
  })
  if (!company) return null
  return {
    window: {
      timezone: company.branches[0]?.timezone || 'America/Chicago',
      hourStart: company.autopilotSendHourStart,
      hourEnd: company.autopilotSendHourEnd,
      daysOfWeek: company.autopilotSendDaysOfWeek,
    },
    dailyCap: company.autopilotDailyCap,
  }
}

/**
 * Book approved, unscheduled first emails into the send window. Only the given
 * messages, so approving one draft never sweeps up older approved ones that
 * were deliberately left alone.
 */
export async function scheduleApprovedFirstEmails(companyId: string, messageIds: string[], now = new Date()) {
  if (!messageIds.length) return { scheduled: 0, first: null as Date | null }
  const messages = await prisma.outreachMessage.findMany({
    where: {
      id: { in: messageIds },
      prospect: { companyId },
      step: 1,
      channel: 'email',
      approvalStatus: 'approved',
      status: 'pending',
      sentAt: null,
      scheduledAt: null,
      OR: [{ campaignId: null }, { campaign: { autopilot: false } }],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!messages.length) return { scheduled: 0, first: null }
  const settings = await companySendWindow(companyId)
  if (!settings) return { scheduled: 0, first: null }
  const { window, dailyCap } = settings

  // Count first emails already sent today or booked ahead, per local day.
  const dayStart = getStartOfLocalDay(now, window.timezone)
  const taken = await prisma.outreachMessage.findMany({
    where: {
      prospect: { companyId },
      step: 1,
      channel: 'email',
      OR: [
        { sentAt: { gte: dayStart } },
        { sentAt: null, status: 'pending', approvalStatus: 'approved', scheduledAt: { gte: dayStart } },
      ],
    },
    select: { sentAt: true, scheduledAt: true },
  })
  const booked = new Map<string, number>()
  for (const t of taken) {
    const at = t.sentAt ?? t.scheduledAt
    if (!at) continue
    const key = dayKey(at, window.timezone)
    booked.set(key, (booked.get(key) ?? 0) + 1)
  }

  const slots = planSendSlots({ count: messages.length, now, window, dailyCap, booked })
  for (let i = 0; i < slots.length; i++) {
    await prisma.outreachMessage.update({ where: { id: messages[i].id }, data: { scheduledAt: slots[i] } })
  }
  return { scheduled: slots.length, first: slots[0] ?? null }
}
