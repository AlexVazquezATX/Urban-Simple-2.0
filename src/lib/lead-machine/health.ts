// Health check after each nightly run. Silence is the failure mode we're
// guarding against: a source that quietly breaks, or a machine that runs
// every night and finds nothing, must reach Alex instead of the logs.

import { prisma } from '@/lib/db'
import { appBaseUrl } from '@/lib/notify/email'
import { FOLLOWUP_SEQUENCE_NAME } from '@/lib/leads/followups'
import { sendMachineNotice } from './notify'
import { Findymail } from './prep/findymail'
import { getSettings } from './settings'

const DAY = 86_400_000

export type HealthProblem = string

export function findProblems(input: {
  enabled: boolean
  dryRun: boolean
  runs: Array<{ stage: string; status: string; startedAt: Date; error: string | null; stats: unknown; dryRun?: boolean }>
  now: Date
}): HealthProblem[] {
  const { runs, now } = input
  if (!input.enabled) return []
  const problems: HealthProblem[] = []
  const lastDay = runs.filter((r) => now.getTime() - r.startedAt.getTime() < 26 * 3600_000)

  for (const r of lastDay.filter((r) => r.status === 'failed')) {
    problems.push(`${r.stage} failed: ${r.error ?? 'unknown error'}`)
  }
  // Nothing legitimately runs this long; the function was cut off mid-run.
  for (const r of lastDay.filter((r) => r.status === 'running' && now.getTime() - r.startedAt.getTime() > 15 * 60_000)) {
    problems.push(`${r.stage} never finished (cut off at the time limit)`)
  }

  const sourcing = runs.filter((r) => r.stage === 'sourcing' && r.status === 'succeeded')
  if (!sourcing.some((r) => now.getTime() - r.startedAt.getTime() < 26 * 3600_000)) {
    problems.push('No successful nightly run in the last 26 hours')
  }

  // Three live nights in a row with nothing new is worth a look (caps too
  // low, a source returning nothing, or every candidate already in the CRM).
  // Only live runs count; a manual "Dry run now" always adds nothing.
  if (!input.dryRun) {
    const recent = sourcing
      .filter((r) => !r.dryRun && now.getTime() - r.startedAt.getTime() < 3.5 * DAY)
      .slice(0, 3)
    const created = (r: { stats: unknown }) => (r.stats as { created?: number } | null)?.created ?? 0
    if (recent.length === 3 && recent.every((r) => created(r) === 0)) {
      problems.push('Three nights in a row added no new accounts')
    }

    // Account prep runs only live. Silence or a standing skip (missing key,
    // Findymail out of credits) means no drafts, which is the quiet failure.
    const prep = runs.filter((r) => r.stage === 'prep' && !r.dryRun)
    const lastPrep = prep.find((r) => now.getTime() - r.startedAt.getTime() < 26 * 3600_000)
    // Health runs right after sourcing and before prep, so on the first live
    // night there is no prep run yet; only expect one once yesterday was live.
    const liveYesterday = sourcing.some((r) => !r.dryRun && now.getTime() - r.startedAt.getTime() > 20 * 3600_000)
    if (!lastPrep) {
      if (liveYesterday) problems.push('Account research did not run in the last 26 hours')
    } else {
      const s = (lastPrep.stats ?? {}) as { reason?: string; findymailStopped?: string | null }
      if (lastPrep.status === 'skipped') problems.push(`Account research is paused: ${s.reason ?? 'unknown reason'}`)
      if (s.findymailStopped) problems.push(`Contact finding stopped: ${s.findymailStopped}`)
    }
  }
  return problems
}

// The last version of these follow-ups stopped in June and nobody knew until
// November. Website leads are the warmest we get, so their emails get a watchdog.
export function followUpProblems(input: {
  sequenceActive: boolean
  overdue: number
  stuckDeliveries: number
}): HealthProblem[] {
  const problems: HealthProblem[] = []
  if (!input.sequenceActive) {
    problems.push(`Website leads are getting no follow-ups: the "${FOLLOWUP_SEQUENCE_NAME}" sequence is missing, paused or not on autopilot`)
  }
  if (input.overdue > 0) problems.push(`${input.overdue} website lead follow-ups are more than 2 days overdue`)
  if (input.stuckDeliveries > 0) problems.push(`${input.stuckDeliveries} website lead emails or enrollments failed or are stuck`)
  return problems
}

export function sendQueueProblems(lateSends: number): HealthProblem[] {
  return lateSends > 0 ? [`${lateSends} approved emails are more than a day past their send time; the hourly sender may be stuck`] : []
}

export async function checkHealth(companyId: string, now = new Date()): Promise<HealthProblem[]> {
  const settings = await getSettings(companyId)
  const runs = await prisma.leadMachineRun.findMany({
    where: { companyId, startedAt: { gte: new Date(now.getTime() - 4 * DAY) }, stage: { not: 'health' } },
    orderBy: { startedAt: 'desc' },
    select: { stage: true, status: true, startedAt: true, error: true, stats: true, dryRun: true },
  })
  const problems = findProblems({ enabled: settings.enabled, dryRun: settings.dryRun, runs, now })

  if (settings.enabled) {
    const [sequence, overdue, stuckDeliveries] = await Promise.all([
      prisma.outreachCampaign.findFirst({
        where: { companyId, name: FOLLOWUP_SEQUENCE_NAME, prospectId: null, autopilot: true, status: 'active' },
        select: { id: true },
      }),
      prisma.outreachMessage.count({
        where: {
          status: 'pending',
          scheduledAt: { lt: new Date(now.getTime() - 2 * DAY) },
          campaign: { companyId, name: FOLLOWUP_SEQUENCE_NAME, autopilot: true, status: 'active', prospectId: { not: null } },
        },
      }),
      prisma.leadDelivery.count({
        where: {
          intake: { companyId },
          OR: [
            { status: 'failed', updatedAt: { gte: new Date(now.getTime() - 4 * DAY) } },
            { status: 'pending', createdAt: { lt: new Date(now.getTime() - 6 * 3600_000) } },
          ],
        },
      }),
    ])
    problems.push(...followUpProblems({ sequenceActive: !!sequence, overdue, stuckDeliveries }))

    // Approving now books a send instead of sending, so a stuck executor would
    // quietly hold every approved email.
    const lateSends = await prisma.outreachMessage.count({
      where: {
        status: 'pending',
        approvalStatus: 'approved',
        scheduledAt: { lt: new Date(now.getTime() - DAY) },
        prospect: { companyId, deletedAt: null },
        OR: [{ campaignId: null }, { campaign: { autopilot: false } }],
      },
    })
    problems.push(...sendQueueProblems(lateSends))
  }

  if (settings.enabled && !settings.dryRun) {
    // Drafts nobody approves are the other way the machine goes quiet.
    const stale = await prisma.outreachMessage.count({
      where: {
        prospect: { companyId, source: 'lead_machine' },
        approvalStatus: 'pending',
        status: 'pending',
        step: 1,
        createdAt: { lt: new Date(now.getTime() - 3 * DAY) },
      },
    })
    if (stale >= 5) problems.push(`${stale} lead machine drafts have waited more than 3 days for approval`)

    const key = process.env.FINDYMAIL_API_KEY
    if (!key) {
      problems.push('FINDYMAIL_API_KEY is not set, so contacts come only from websites and stay unverified')
    } else {
      try {
        const { finder, verifier, hasCapacity } = await new Findymail(key, { remaining: 0 }).credits()
        // Current plans have rolling usage windows, not credits: the balance
        // left over from a trial means nothing once the account reports capacity.
        if (hasCapacity === false) problems.push('Findymail has hit its usage limit for now')
        if (hasCapacity === null && finder !== null && finder < 50) problems.push(`Findymail has ${finder} finder credits left`)
        if (hasCapacity === null && verifier !== null && verifier < 50) problems.push(`Findymail has ${verifier} verifier credits left`)
      } catch (err) {
        problems.push(`Could not check Findymail credits: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  await prisma.leadMachineRun.create({
    data: {
      companyId,
      stage: 'health',
      status: problems.length ? 'failed' : 'succeeded',
      dryRun: settings.dryRun,
      finishedAt: new Date(),
      stats: { problems },
      error: problems.length ? problems.join('; ').slice(0, 2000) : null,
    },
  })

  if (problems.length) {
    await sendMachineNotice(companyId, 'Lead machine needs a look', {
      kicker: 'Lead machine',
      title: problems.length === 1 ? 'One problem overnight' : `${problems.length} problems overnight`,
      bullets: problems,
      ctaLabel: 'Open the lead machine',
      ctaUrl: `${appBaseUrl()}/growth/machine`,
    })
  }
  return problems
}
