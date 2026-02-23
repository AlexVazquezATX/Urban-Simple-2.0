import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'
import { runAgentCycle, runFullPipeline, type AgentStage } from '@/lib/services/growth-agent'

export const maxDuration = 300

const VALID_STAGES: AgentStage[] = [
  'discover',
  'enrich',
  'find_emails',
  'score',
  'generate_outreach',
]

// POST /api/growth/agent/trigger — Run one agent cycle or the full pipeline
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only SUPER_ADMIN can trigger the agent' }, { status: 403 })
    }

    const body = await request.json()
    const { stage, dryRun, fullPipeline } = body

    if (stage && !VALID_STAGES.includes(stage)) {
      return NextResponse.json(
        { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
        { status: 400 }
      )
    }

    // Ensure a config record exists (create defaults if first use)
    await prisma.growthAgentConfig.upsert({
      where: { companyId: user.companyId },
      create: { companyId: user.companyId },
      update: {},
    })

    // Full pipeline: run ALL stages until no work remains
    if (fullPipeline) {
      const result = await runFullPipeline(user.companyId, {
        forceDryRun: typeof dryRun === 'boolean' ? dryRun : undefined,
      })
      return NextResponse.json(result)
    }

    // Single stage or auto-detect next stage
    const result = await runAgentCycle(user.companyId, {
      forceStage: stage || undefined,
      forceDryRun: typeof dryRun === 'boolean' ? dryRun : undefined,
      manualTrigger: true,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error triggering agent:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to trigger agent' },
      { status: 500 }
    )
  }
}
