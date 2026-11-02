// Health check after each nightly run. Silence is the failure mode we're
// guarding against: a source that quietly breaks, or a machine that runs
// every night and finds nothing, must reach Alex instead of the logs.

import { prisma } from '@/lib/db'
import { appBaseUrl } from '@/lib/notify/email'
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

export async function checkHealth(companyId: string, now = new Date()): Promise<HealthProblem[]> {
  const settings = await getSettings(companyId)
  const runs = await prisma.leadMachineRun.findMany({
    where: { companyId, startedAt: { gte: new Date(now.getTime() - 4 * DAY) }, stage: { not: 'health' } },
    orderBy: { startedAt: 'desc' },
    select: { stage: true, status: true, startedAt: true, error: true, stats: true, dryRun: true },
  })
  const problems = findProblems({ enabled: settings.enabled, dryRun: settings.dryRun, runs, now })

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
        const { finder, verifier } = await new Findymail(key, { remaining: 0 }).credits()
        if (finder !== null && finder < 50) problems.push(`Findymail has ${finder} finder credits left`)
        if (verifier !== null && verifier < 50) problems.push(`Findymail has ${verifier} verifier credits left`)
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
