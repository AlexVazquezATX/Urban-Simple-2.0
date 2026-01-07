import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateDailyBriefing } from '@/features/pulse/lib/pulse-generator'

/**
 * GET /api/admin/pulse/briefings/today
 * Get today's briefing for the current user
 */
export async function GET(request: NextRequest) {
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

    // Get today's date at midnight (UTC)
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const briefing = await prisma.pulseBriefing.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today,
        },
      },
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

    if (!briefing) {
      return NextResponse.json({
        success: true,
        briefing: null,
        message: 'No briefing for today yet',
      })
    }

    // Mark as read if first view
    if (!briefing.readAt) {
      await prisma.pulseBriefing.update({
        where: { id: briefing.id },
        data: { readAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      briefing,
    })
  } catch (error: any) {
    console.error('Error fetching today\'s briefing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch briefing', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/pulse/briefings/today
 * Generate or regenerate today's briefing
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

    // Parse request body for options
    const body = await request.json().catch(() => ({}))
    const forceRegenerate = body.forceRegenerate === true
    const topicIds = body.topicIds as string[] | undefined

    // Generate the briefing
    const result = await generateDailyBriefing({
      userId: user.id,
      forceRegenerate,
      topicIds,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to generate briefing', details: result.errors },
        { status: 500 }
      )
    }

    // Fetch the complete briefing with items
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
        errors: result.errors.length > 0 ? result.errors : undefined,
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
