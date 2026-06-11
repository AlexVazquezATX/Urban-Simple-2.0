import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/channels
 * Fetch all channels for the current user's company
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const channels = await prisma.channel.findMany({
      where: {
        companyId: user.companyId,
        isArchived: false,
      },
      include: {
        members: {
          where: {
            userId: user.id,
          },
          select: {
            isFavorite: true,
            role: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    // Transform to include favorite status and member info
    const channelsWithMemberInfo = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      type: channel.type,
      createdAt: channel.createdAt,
      isFavorite: channel.members[0]?.isFavorite || false,
      memberRole: channel.members[0]?.role || null,
      isMember: channel.members.length > 0,
      isAiEnabled: channel.isAiEnabled,
      aiPersona: channel.aiPersona,
      aiLanguages: channel.aiLanguages,
    }))

    return NextResponse.json({
      success: true,
      channels: channelsWithMemberInfo,
    })
  } catch (error: any) {
    console.error('Failed to fetch channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/channels
 * Create a new channel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, type = 'public' } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Channel name is required' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existingChannel = await prisma.channel.findFirst({
      where: {
        companyId: user.companyId,
        slug,
      },
    })

    if (existingChannel) {
      return NextResponse.json(
        { error: 'A channel with this name already exists' },
        { status: 409 }
      )
    }

    // Create channel
    const channel = await prisma.channel.create({
      data: {
        companyId: user.companyId,
        name: name.trim(),
        slug,
        description: description?.trim(),
        type,
        createdById: user.id,
      },
    })

    // Add creator as channel member
    await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: user.id,
        role: 'owner',
      },
    })

    return NextResponse.json({
      success: true,
      channel,
    })
  } catch (error: any) {
    console.error('Failed to create channel:', error)
    return NextResponse.json(
      { error: 'Failed to create channel', details: error.message },
      { status: 500 }
    )
  }
}
