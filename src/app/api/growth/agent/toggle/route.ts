import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// POST /api/growth/agent/toggle — Toggle agent on/off
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only SUPER_ADMIN can toggle the agent' }, { status: 403 })
    }

    const body = await request.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    const config = await prisma.growthAgentConfig.findUnique({
      where: { companyId: user.companyId },
    })

    if (!config) {
      return NextResponse.json(
        { error: 'Agent config not found. Create a config first.' },
        { status: 404 }
      )
    }

    // If enabling, validate that targets are configured
    if (enabled) {
      const locations = (config.targetLocations as any[]) || []
      const types = config.targetBusinessTypes || []
      if (locations.length === 0 || types.length === 0) {
        return NextResponse.json(
          { error: 'Configure target locations and business types before enabling the agent' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.growthAgentConfig.update({
      where: { companyId: user.companyId },
      data: {
        isEnabled: enabled,
        pausedAt: enabled ? null : undefined,
        pauseReason: enabled ? null : undefined,
      },
    })

    return NextResponse.json({
      enabled: updated.isEnabled,
      isDryRun: updated.isDryRun,
    })
  } catch (error: any) {
    console.error('Error toggling agent:', error)
    return NextResponse.json(
      { error: 'Failed to toggle agent' },
      { status: 500 }
    )
  }
}
