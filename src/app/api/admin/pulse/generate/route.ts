import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateDailyBriefing } from '@/features/pulse/lib/pulse-generator'

/**
 * POST /api/admin/pulse/generate
 * Manually trigger briefing generation with options
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    // Check if user has any active topics
    const activeTopics = await prisma.pulseTopic.count({
      where: {
        userId: user.id,
        isActive: true,
      },
    })

    if (activeTopics === 0) {
      return NextResponse.json(
        { error: 'No active topics. Please add at least one topic to generate a briefing.' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))

    // Parse options
    const options = {
      userId: user.id,
      date: body.date ? new Date(body.date) : undefined,
      forceRegenerate: body.forceRegenerate === true,
      topicIds: body.topicIds as string[] | undefined,
    }

    // Generate the briefing
    const result = await generateDailyBriefing(options)

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Briefing generation failed',
          details: result.errors,
          partial: result.itemsGenerated > 0,
        },
        { status: result.itemsGenerated > 0 ? 207 : 500 }
      )
    }

    // Fetch the complete briefing
    const briefing = await prisma.pulseBriefing.findUnique({
      where: { id: result.briefingId },
      include: {
        items: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                category: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    return NextResponse.json({
      success: true,
      briefing,
      generation: {
        itemsGenerated: result.itemsGenerated,
        imagesGenerated: result.imagesGenerated,
        duration: result.duration,
        errors: result.errors,
      },
    })
  } catch (error: any) {
    console.error('Error generating briefing:', error)
    return NextResponse.json(
      { error: 'Failed to generate briefing', details: error.message },
      { status: 500 }
    )
  }
}
