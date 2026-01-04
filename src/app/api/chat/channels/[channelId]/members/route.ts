import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/channels/[channelId]/members
 * Get all members of a channel
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    const members = await prisma.channelMember.findMany({
      where: { channelId },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    // Fetch user details
    const userIds = members.map((m) => m.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
      },
    })

    // Combine member info with user details
    const membersWithUsers = members.map((member) => {
      const user = users.find((u) => u.id === member.userId)
      return {
        id: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: user || {
          id: member.userId,
          firstName: 'Unknown',
          lastName: 'User',
          email: '',
        },
      }
    })

    return NextResponse.json({
      success: true,
      members: membersWithUsers,
    })
  } catch (error: any) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat/channels/[channelId]/members
 * Add member(s) to a channel (supports batch invite)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const body = await request.json()
    const { userId, userIds, role = 'member' } = body

    // Support both single user and batch invite
    const targetUserIds = userIds || (userId ? [userId] : [])

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one user ID is required' },
        { status: 400 }
      )
    }

    // Get existing members to check for duplicates
    const existingMembers = await prisma.channelMember.findMany({
      where: {
        channelId,
        userId: { in: targetUserIds },
      },
    })

    const existingUserIds = new Set(existingMembers.map((m) => m.userId))
    const newUserIds = targetUserIds.filter((id) => !existingUserIds.has(id))

    if (newUserIds.length === 0) {
      return NextResponse.json(
        {
          error:
            targetUserIds.length === 1
              ? 'User is already a member of this channel'
              : 'All users are already members of this channel',
        },
        { status: 409 }
      )
    }

    // Add members (batch create)
    const members = await prisma.channelMember.createMany({
      data: newUserIds.map((id) => ({
        channelId,
        userId: id,
        role,
      })),
    })

    return NextResponse.json({
      success: true,
      added: members.count,
      skipped: existingUserIds.size,
    })
  } catch (error: any) {
    console.error('Failed to add member(s):', error)
    return NextResponse.json(
      { error: 'Failed to add member(s)', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/channels/[channelId]/members
 * Remove a member from a channel
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    await prisma.channelMember.delete({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    })
  } catch (error: any) {
    console.error('Failed to remove member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member', details: error.message },
      { status: 500 }
    )
  }
}
