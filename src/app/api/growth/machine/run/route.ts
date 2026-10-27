import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { runSourcing } from '@/lib/lead-machine/pipeline'
import { checkHealth } from '@/lib/lead-machine/health'
import { buildBrief, sendBrief } from '@/lib/lead-machine/brief'

export const runtime = 'nodejs'
export const maxDuration = 300

// POST /api/growth/machine/run - run a stage now.
// { stage: 'sourcing' | 'health' | 'brief' | 'brief_preview', dryRun?: boolean, forcePlaces?: boolean }
// Sourcing defaults to dry run here; pass dryRun:false to write for real.
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { stage?: string; dryRun?: unknown; forcePlaces?: unknown }
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
    case 'health':
      return NextResponse.json({ problems: await checkHealth(companyId) })
    case 'brief':
      return NextResponse.json(await sendBrief(companyId))
    case 'brief_preview':
      return NextResponse.json(await buildBrief(companyId))
    default:
      return NextResponse.json({ error: 'stage must be sourcing, health, brief or brief_preview' }, { status: 400 })
  }
}
