// Run log. Every stage writes one row; a stage that throws is recorded as
// failed and returns null, so one broken source never stops the others.

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

export type StageResult<T> = { value: T; stats: Record<string, unknown> }

export async function runStage<T>(
  companyId: string,
  stage: string,
  dryRun: boolean,
  fn: () => Promise<StageResult<T>>,
): Promise<T | null> {
  const run = await prisma.leadMachineRun.create({
    data: { companyId, stage, status: 'running', dryRun },
    select: { id: true },
  })
  try {
    const { value, stats } = await fn()
    await prisma.leadMachineRun.update({
      where: { id: run.id },
      data: { status: 'succeeded', finishedAt: new Date(), stats: stats as Prisma.InputJsonValue },
    })
    return value
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[lead-machine] ${stage} failed for company ${companyId}:`, err)
    // A source may attach partial stats to its error (e.g. Google calls
    // already billed) so budgets stay honest on failed runs.
    const partial = (err as { stats?: Record<string, unknown> } | null)?.stats
    await prisma.leadMachineRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        error: message.slice(0, 2000),
        ...(partial ? { stats: partial as Prisma.InputJsonValue } : {}),
      },
    })
    return null
  }
}

/** Record a stage that deliberately didn't run (budget used up, not due yet). */
export async function skipStage(companyId: string, stage: string, dryRun: boolean, reason: string) {
  await prisma.leadMachineRun.create({
    data: {
      companyId,
      stage,
      status: 'skipped',
      dryRun,
      finishedAt: new Date(),
      stats: { reason },
    },
  })
}

/** Google Places calls made this calendar month (UTC), dry runs included: they cost the same. */
export async function placesCallsThisMonth(companyId: string, now = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const runs = await prisma.leadMachineRun.findMany({
    where: { companyId, stage: 'places_hotels', startedAt: { gte: monthStart } },
    select: { stats: true },
  })
  return runs.reduce((sum, r) => {
    const calls = (r.stats as { placesCalls?: unknown } | null)?.placesCalls
    return sum + (typeof calls === 'number' ? calls : 0)
  }, 0)
}
