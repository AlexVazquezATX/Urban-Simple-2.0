// The 7:30 a.m. brief: what the machine found overnight, who raised a hand,
// and what's waiting on Alex. Numbers come straight from the CRM and the run
// log; nothing here is estimated.

import { prisma } from '@/lib/db'
import { appBaseUrl, type AlertEmailContent } from '@/lib/notify/email'
import { isInboundSource } from '@/lib/services/outreach-recipient'
import { sendMachineNotice } from './notify'
import { findymailUsedThisMonth } from './prep/run'
import { placesCallsThisMonth } from './runs'
import { getSettings } from './settings'

export async function buildBrief(companyId: string, now = new Date()): Promise<{ subject: string; content: AlertEmailContent }> {
  const since = new Date(now.getTime() - 24 * 3600_000)
  const settings = await getSettings(companyId)

  const [newAccounts, recentProspects, replies, pendingReview, readyToSend, lastSourcing, placesCalls, lastPrep, findymailUsed] = await Promise.all([
    prisma.prospect.findMany({
      where: { companyId, source: 'lead_machine', createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { companyName: true, businessType: true, notes: true },
    }),
    prisma.prospect.findMany({
      where: { companyId, createdAt: { gte: since }, deletedAt: null },
      select: { companyName: true, source: true },
    }),
    prisma.prospectActivity.findMany({
      where: { prospect: { companyId }, outcome: { in: ['replied', 'interested'] }, createdAt: { gte: since } },
      select: { prospect: { select: { companyName: true } } },
    }),
    prisma.outreachMessage.count({
      where: { prospect: { companyId }, approvalStatus: 'pending', status: 'pending', step: 1 },
    }),
    prisma.outreachMessage.count({
      where: { prospect: { companyId }, approvalStatus: 'approved', status: 'pending', OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }] },
    }),
    prisma.leadMachineRun.findFirst({
      where: { companyId, stage: 'sourcing', startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      select: { status: true, stats: true, dryRun: true },
    }),
    placesCallsThisMonth(companyId, now),
    prisma.leadMachineRun.findFirst({
      where: { companyId, stage: 'prep', startedAt: { gte: since } },
      orderBy: { startedAt: 'desc' },
      select: { status: true, stats: true, error: true },
    }),
    findymailUsedThisMonth(companyId, now),
  ])
  const prep = (lastPrep?.stats ?? {}) as { accounts?: number; drafted?: number; noContact?: number; noDraft?: number; failed?: number; reason?: string; chainHotels?: string[] }

  const inbound = recentProspects.filter((p) => isInboundSource(p.source))
  const stats = (lastSourcing?.stats ?? {}) as { candidates?: number; matchedExisting?: number; signalsAdded?: number; wouldCreate?: number; createdNames?: string[] }

  const bySegment = new Map<string, number>()
  for (const p of newAccounts) bySegment.set(p.businessType ?? 'other', (bySegment.get(p.businessType ?? 'other') ?? 0) + 1)

  const firstReason = (notes: string | null) => notes?.split('\n').find((l) => l.startsWith('- '))?.slice(2) ?? ''
  const bullets: string[] = []
  if (inbound.length) bullets.push(...inbound.map((p) => `Raised a hand: ${p.companyName} (${p.source})`))
  if (replies.length) bullets.push(...replies.map((r) => `Replied: ${r.prospect.companyName}`))
  bullets.push(...newAccounts.slice(0, 8).map((p) => `New: ${p.companyName}. ${firstReason(p.notes)}`))
  if (prep.chainHotels?.length) {
    bullets.push(...prep.chainHotels.slice(0, 5).map((n) => `Needs a GM name from LinkedIn: ${n} (chain hotel, no property website)`))
  }
  if (lastSourcing?.dryRun && stats.createdNames?.length) {
    bullets.push(...stats.createdNames.slice(0, 8).map((n) => `Would add (dry run): ${n}`))
  }

  const machineLine = !lastSourcing
    ? 'Did not run in the last 24 hours'
    : lastSourcing.status !== 'succeeded'
      ? `Last run ${lastSourcing.status}`
      : lastSourcing.dryRun
        ? `Dry run: would add ${stats.wouldCreate ?? 0}, nothing written`
        : 'Ran normally'

  const title = inbound.length + replies.length > 0
    ? `${inbound.length + replies.length} ${inbound.length + replies.length === 1 ? 'person' : 'people'} reached out`
    : newAccounts.length
      ? `${newAccounts.length} new account${newAccounts.length === 1 ? '' : 's'} found overnight`
      : 'Quiet night'

  return {
    subject: `Lead machine · ${title}`,
    content: {
      kicker: 'Morning brief',
      title,
      rows: [
        ['New accounts', newAccounts.length ? `${newAccounts.length} (${[...bySegment].map(([k, v]) => `${v} ${k}`).join(', ')})` : '0'],
        [lastSourcing?.dryRun ? 'Already in CRM' : 'Already in CRM, updated', String(stats.matchedExisting ?? 0)],
        ['Researched overnight', !lastPrep
          ? 'Did not run'
          : lastPrep.status === 'skipped'
            ? `Skipped: ${prep.reason ?? 'unknown reason'}`
            : lastPrep.status === 'failed'
              ? `Failed: ${lastPrep.error ?? 'unknown error'}`
              : `${prep.accounts ?? 0} accounts: ${prep.drafted ?? 0} drafted, ${prep.noContact ?? 0} no contact found${prep.noDraft ? `, ${prep.noDraft} draft rejected` : ''}${prep.failed ? `, ${prep.failed} failed` : ''}`],
        ['Inbound leads (24h)', String(inbound.length)],
        ['Replies (24h)', String(replies.length)],
        ['Drafts waiting for you', String(pendingReview)],
        ['Approved, ready to send', String(readyToSend)],
        ['Machine', settings.enabled ? machineLine : 'Switched off'],
        ['Google Places this month', `${placesCalls} of ${settings.placesMonthlyCallCap} calls`],
        ['Findymail this month', `${findymailUsed} of ${settings.findymailMonthlyCap} credits`],
      ],
      bullets: bullets.length ? bullets : undefined,
      ctaLabel: pendingReview ? 'Review drafts' : 'Open the lead machine',
      ctaUrl: pendingReview ? `${appBaseUrl()}/growth/outreach` : `${appBaseUrl()}/growth/machine`,
    },
  }
}

export async function sendBrief(companyId: string, now = new Date()) {
  const { subject, content } = await buildBrief(companyId, now)
  const channel = await sendMachineNotice(companyId, subject, content)
  await prisma.leadMachineRun.create({
    data: {
      companyId,
      stage: 'brief',
      status: channel ? 'succeeded' : 'failed',
      finishedAt: new Date(),
      stats: { channel, subject },
      error: channel ? null : 'No channel accepted the brief (Telegram not configured and email failed)',
    },
  })
  return { channel, subject }
}
