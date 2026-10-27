import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runSourcing } from '@/lib/lead-machine/pipeline'
import { checkHealth } from '@/lib/lead-machine/health'
import { companyTimezone, isLocalHour, SOURCING_LOCAL_HOUR } from '@/lib/lead-machine/schedule'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET /api/cron/lead-machine - nightly sourcing + health check for every
// company that switched the machine on. Scheduled at 07:00 and 08:00 UTC; each
// company runs only on the one that is 2 a.m. local. Returns counts only.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const companies = await prisma.leadMachineSettings.findMany({ where: { enabled: true }, select: { companyId: true } })
  const results = []
  const now = new Date()
  for (const { companyId } of companies) {
    if (!isLocalHour(now, await companyTimezone(companyId), SOURCING_LOCAL_HOUR)) continue
    const sourcing = await runSourcing(companyId)
    const problems = await checkHealth(companyId)
    results.push({
      companyId,
      ok: !!sourcing && problems.length === 0,
      created: sourcing?.created ?? 0,
      matchedExisting: sourcing?.matchedExisting ?? 0,
      dryRun: sourcing?.dryRun ?? null,
      problems: problems.length,
    })
  }
  return NextResponse.json({ ok: results.every((r) => r.ok), companies: results.length, results })
}
