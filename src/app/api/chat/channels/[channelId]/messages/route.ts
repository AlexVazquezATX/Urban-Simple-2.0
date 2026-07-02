import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { AI_PERSONAS } from '@/lib/ai/prompts'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/channels/[channelId]/messages
 * Fetch messages for a specific channel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    // Authenticate and confine to the caller's company. Previously this route
    // had no auth at all — anyone could read any channel's messages by id,
    // across companies. DMs are readable only by their participants.
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const channel = await prisma.channel.findFirst({
      where: { id: channelId, companyId: user.companyId },
      select: { id: true, type: true, aiPersona: true, isAiEnabled: true },
    })
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    if (channel.type === 'direct_message') {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: user.id } },
        select: { id: true },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Fetch messages with user info
    const messages = await prisma.message.findMany({
      where: {
        channelId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        userId: true,
        content: true,
        contentType: true,
        createdAt: true,
        isEdited: true,
        isAiGenerated: true,
        aiModel: true,
        aiMetadata: true,
      },
      take: 100, // Limit to last 100 messages
    })

    // Fetch user details separately to get full names
    const userIds = [...new Set(messages.map((m) => m.userId))]
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
      },
    })

    // Map users to messages
    const messagesWithUsers = messages.map((message) => {
      // If it's an AI-generated message, use the AI persona's name
      if (message.isAiGenerated && channel?.aiPersona) {
        const personaConfig = AI_PERSONAS[channel.aiPersona as keyof typeof AI_PERSONAS]
        if (personaConfig) {
          return {
            ...message,
            user: {
              firstName: personaConfig.aiName,
              lastName: '',
              displayName: personaConfig.aiName,
            },
          }
        }
      }

      // Otherwise, use the actual user's info
      const user = users.find((u) => u.id === message.userId)
      return {
        ...message,
        user: user || {
          firstName: 'Unknown',
          lastName: 'User',
          displayName: null,
        },
      }
    })

    return NextResponse.json({
      success: true,
      messages: messagesWithUsers,
    })
  } catch (error: any) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/channels/[channelId]/messages
 * Send a new message to a channel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const body = await request.json()
    const { content } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Channel must belong to the caller's company; DMs are writable only by
    // their participants. (Previously any authenticated user could post into
    // any channel of any company by id.)
    const channel = await prisma.channel.findFirst({
      where: { id: channelId, companyId: user.companyId },
      select: { id: true, type: true },
    })

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    if (channel.type === 'direct_message') {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: user.id } },
        select: { id: true },
      })
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        channelId,
        userId: user.id,
        content: content.trim(),
        contentType: 'text',
      },
      select: {
        id: true,
        userId: true,
        content: true,
        contentType: true,
        createdAt: true,
        isEdited: true,
      },
    })

    // Add user info to response
    const messageWithUser = {
      ...message,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
      },
    }

    return NextResponse.json({
      success: true,
      message: messageWithUser,
    })
  } catch (error: any) {
    console.error('Failed to send message:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    )
  }
}
