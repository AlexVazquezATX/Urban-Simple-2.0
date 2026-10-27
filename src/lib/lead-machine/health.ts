// Health check after each nightly run. Silence is the failure mode we're
// guarding against: a source that quietly breaks, or a machine that runs
// every night and finds nothing, must reach Alex instead of the logs.

import { prisma } from '@/lib/db'
import { appBaseUrl } from '@/lib/notify/email'
import { sendMachineNotice } from './notify'
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
