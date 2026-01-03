import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/dm
 * Create or find existing DM channel between current user and another user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId: otherUserId } = body

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // TODO: Get current user from session/auth
    const currentUser = await prisma.user.findFirst()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (currentUser.id === otherUserId) {
      return NextResponse.json(
        { error: 'Cannot create DM with yourself' },
        { status: 400 }
      )
    }

    // Get the other user
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        companyId: true,
      },
    })

    if (!otherUser) {
      return NextResponse.json(
        { error: 'Other user not found' },
        { status: 404 }
      )
    }

    // Ensure both users are in the same company
    if (otherUser.companyId !== currentUser.companyId) {
      return NextResponse.json(
        { error: 'Users must be in the same company' },
        { status: 400 }
      )
    }

    // Check if DM channel already exists between these two users
    // A DM channel has exactly 2 members and type = 'direct_message'
    const existingDMs = await prisma.channel.findMany({
      where: {
        companyId: currentUser.companyId,
        type: 'direct_message',
        members: {
          some: {
            userId: currentUser.id,
          },
        },
      },
      include: {
        members: {
          select: {
            userId: true,
          },
        },
      },
    })

    // Find DM with both users
    const existingDM = existingDMs.find((channel) => {
      const memberIds = channel.members.map((m) => m.userId)
      return (
        memberIds.length === 2 &&
        memberIds.includes(currentUser.id) &&
        memberIds.includes(otherUserId)
      )
    })

    if (existingDM) {
      return NextResponse.json({
        success: true,
        channelId: existingDM.id,
        isNew: false,
      })
    }

    // Create new DM channel
    const dmName = [currentUser, otherUser]
      .map((u) => u.displayName || `${u.firstName} ${u.lastName}`)
      .sort()
      .join(', ')

    const channel = await prisma.channel.create({
      data: {
        companyId: currentUser.companyId,
        name: dmName,
        slug: `dm-${currentUser.id}-${otherUserId}`,
        type: 'direct_message',
        createdById: currentUser.id,
        members: {
          create: [
            {
              userId: currentUser.id,
              role: 'member',
            },
            {
              userId: otherUserId,
              role: 'member',
            },
          ],
        },
      },
    })

    return NextResponse.json({
      success: true,
      channelId: channel.id,
      isNew: true,
    })
  } catch (error: any) {
    console.error('Failed to create DM:', error)
    return NextResponse.json(
      { error: 'Failed to create DM', details: error.message },
      { status: 500 }
    )
  }
}
