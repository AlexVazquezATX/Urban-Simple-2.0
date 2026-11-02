import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { runSourcing } from '@/lib/lead-machine/pipeline'
import { checkHealth } from '@/lib/lead-machine/health'
import { buildBrief, sendBrief } from '@/lib/lead-machine/brief'
import { runPrep } from '@/lib/lead-machine/prep/run'

export const runtime = 'nodejs'
export const maxDuration = 300

// POST /api/growth/machine/run - run a stage now.
// { stage: 'sourcing' | 'prep' | 'health' | 'brief' | 'brief_preview', dryRun?: boolean, forcePlaces?: boolean,
//   prospectIds?: string[], limit?: number, paid?: boolean }
// Sourcing and prep default to dry run here; pass dryRun:false to write for real.
// A prep dry run still spends Google and Claude calls; Findymail only with paid:true.
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    stage?: string
    dryRun?: unknown
    forcePlaces?: unknown
    prospectIds?: unknown
    limit?: unknown
    paid?: unknown
  }
  const companyId = user.companyId
  switch (body.stage ?? 'sourcing') {
    case 'sourcing': {
      const result = await runSourcing(companyId, {
        dryRun: body.dryRun === false ? false : true,
        forcePlaces: body.forcePlaces === true,
      })
      if (!result) return NextResponse.json({ error: 'Sourcing failed; see the run log' }, { status: 500 })
      return NextResponse.json({ result })
    }
    case 'prep': {
      const ids = Array.isArray(body.prospectIds) ? body.prospectIds.filter((x): x is string => typeof x === 'string').slice(0, 25) : undefined
      const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(25, Math.floor(body.limit)) : 3
      const result = await runPrep(companyId, {
        dryRun: body.dryRun === false ? false : true,
        prospectIds: ids?.length ? ids : undefined,
        limit: ids?.length ? ids.length : limit,
        // Previews save nothing, so by default they don't spend Findymail
        // credits on contacts that would be paid for again when saved.
        paid: body.paid === true || body.dryRun === false,
      })
      if (!result) return NextResponse.json({ error: 'Prep did not run; see the run log' }, { status: 500 })
      return NextResponse.json({ result })
    }
    case 'health':
      return NextResponse.json({ problems: await checkHealth(companyId) })
    case 'brief':
      return NextResponse.json(await sendBrief(companyId))
    case 'brief_preview':
      return NextResponse.json(await buildBrief(companyId))
    default:
      return NextResponse.json({ error: 'stage must be sourcing, prep, health, brief or brief_preview' }, { status: 400 })
  }
}
