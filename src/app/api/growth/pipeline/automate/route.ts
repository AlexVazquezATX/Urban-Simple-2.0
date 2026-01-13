import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { automatePipelineStage, detectHotProspects } from '@/lib/ai/pipeline-automator'

/**
 * Automate pipeline stage transitions
 * This endpoint should be called periodically to update prospect stages
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an internal cron call
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID required' },
        { status: 400 }
      )
    }

    // Get all prospects that might need stage updates
    const prospects = await prisma.prospect.findMany({
      where: {
        companyId,
        status: { in: ['new', 'contacted', 'engaged', 'qualified'] },
      },
      select: {
        id: true,
      },
    })

    const results = []

    // Automate stage transitions for each prospect
    for (const prospect of prospects) {
      try {
        await automatePipelineStage(prospect.id)
        results.push({
          prospectId: prospect.id,
          success: true,
        })
      } catch (error) {
        console.error(`Error automating pipeline for prospect ${prospect.id}:`, error)
        results.push({
          prospectId: prospect.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Detect hot prospects
    const hotProspects = await detectHotProspects(companyId)

    return NextResponse.json({
      success: true,
      prospectsProcessed: results.length,
      hotProspectsDetected: hotProspects.length,
      results,
      hotProspects,
    })
  } catch (error) {
    console.error('Error automating pipeline:', error)
    return NextResponse.json(
      { error: 'Failed to automate pipeline' },
      { status: 500 }
    )
  }
}
