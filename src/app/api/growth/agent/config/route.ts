import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

const DEFAULT_CONFIG = {
  isEnabled: false,
  isDryRun: true,
  targetLocations: [],
  targetBusinessTypes: [],
  targetSources: ['google_places', 'yelp'],
  minRating: null,
  priceLevels: [],
  minScoreForOutreach: 60,
  batchSize: 5,
  maxDiscoveriesPerDay: 20,
  maxEmailsPerDay: 10,
  maxOutreachPerDay: 10,
  outreachTone: 'friendly',
  outreachChannel: 'email',
  activeHoursStart: 8,
  activeHoursEnd: 22,
  timezone: 'America/Chicago',
}

// GET /api/growth/agent/config — Get agent config
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.growthAgentConfig.findUnique({
      where: { companyId: user.companyId },
    })

    return NextResponse.json({
      config: config || { ...DEFAULT_CONFIG, companyId: user.companyId },
      exists: !!config,
    })
  } catch (error: any) {
    console.error('Error fetching agent config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent config' },
      { status: 500 }
    )
  }
}

// PUT /api/growth/agent/config — Create or update agent config
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validation
    if (body.batchSize !== undefined && (body.batchSize < 1 || body.batchSize > 10)) {
      return NextResponse.json({ error: 'batchSize must be between 1 and 10' }, { status: 400 })
    }

    if (body.minScoreForOutreach !== undefined && (body.minScoreForOutreach < 0 || body.minScoreForOutreach > 100)) {
      return NextResponse.json({ error: 'minScoreForOutreach must be between 0 and 100' }, { status: 400 })
    }

    // If enabling, require targets
    if (body.isEnabled === true) {
      const locations = body.targetLocations
      const types = body.targetBusinessTypes
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return NextResponse.json({ error: 'At least one target location is required to enable the agent' }, { status: 400 })
      }
      if (!types || !Array.isArray(types) || types.length === 0) {
        return NextResponse.json({ error: 'At least one target business type is required to enable the agent' }, { status: 400 })
      }
    }

    const config = await prisma.growthAgentConfig.upsert({
      where: { companyId: user.companyId },
      create: {
        companyId: user.companyId,
        ...body,
      },
      update: body,
    })

    return NextResponse.json({ config })
  } catch (error: any) {
    console.error('Error updating agent config:', error)
    return NextResponse.json(
      { error: 'Failed to update agent config' },
      { status: 500 }
    )
  }
}
