import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'
import { contactFirstDiscovery } from '@/lib/services/growth-agent'

// POST /api/growth/agent/contact-first — Run contact-first discovery
// Discovers businesses and only imports those with verified email data
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { city, state, businessTypes, targetCount } = body

    if (!city || !state) {
      return NextResponse.json(
        { error: 'city and state are required' },
        { status: 400 }
      )
    }

    if (!businessTypes || !Array.isArray(businessTypes) || businessTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one business type is required' },
        { status: 400 }
      )
    }

    // Get the agent config for this company (to record the run)
    const config = await prisma.growthAgentConfig.findUnique({
      where: { companyId: user.companyId },
    })

    const startTime = Date.now()

    // Record run start
    let run: any = null
    if (config) {
      run = await prisma.growthAgentRun.create({
        data: {
          configId: config.id,
          stage: 'contact_first',
          status: 'running',
          isDryRun: false,
          itemsProcessed: 0,
          itemsSucceeded: 0,
          itemsFailed: 0,
          itemsSkipped: 0,
        },
      })
    }

    const result = await contactFirstDiscovery({
      companyId: user.companyId,
      city,
      state,
      businessTypes,
      targetCount: Math.min(targetCount || 10, 50),
    })

    const durationMs = Date.now() - startTime

    // Update run record
    if (run) {
      await prisma.growthAgentRun.update({
        where: { id: run.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs,
          itemsProcessed: result.discovered,
          itemsSucceeded: result.created,
          itemsFailed: result.skippedNoEmail,
          itemsSkipped: result.skippedNoWebsite + result.skippedDuplicate,
          details: {
            city,
            state,
            businessTypes,
            targetCount,
            ...result,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      ...result,
      durationMs,
    })
  } catch (error: any) {
    console.error('Error running contact-first discovery:', error)
    return NextResponse.json(
      { error: `Contact-first discovery failed: ${error.message}` },
      { status: 500 }
    )
  }
}
