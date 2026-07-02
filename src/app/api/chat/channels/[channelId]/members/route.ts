import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Shared guard: this route previously had no authentication at all — anyone
// (even logged-out) could list members (names + emails), add users to any
// channel, or remove them, across companies. Require a signed-in user in the
// channel's company; for membership *changes* (and any DM access) the caller
// must be a channel member or a company admin.
type ChannelAuth =
  | { ok: false; response: NextResponse }
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }

async function authorizeChannel(
  channelId: string,
  opts: { requireManage?: boolean } = {}
): Promise<ChannelAuth> {
  const user = await getCurrentUser()
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const channel = await prisma.channel.findFirst({
    where: { id: channelId, companyId: user.companyId },
    select: { id: true, type: true },
  })
  if (!channel) {
    return { ok: false, response: NextResponse.json({ error: 'Channel not found' }, { status: 404 }) }
  }

  if (opts.requireManage || channel.type === 'direct_message') {
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId: user.id } },
        select: { id: true },
      })
      if (!membership) {
        return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
      }
    }
  }

  return { ok: true, user }
}

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

    const auth = await authorizeChannel(channelId)
    if (!auth.ok) return auth.response

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

    const auth = await authorizeChannel(channelId, { requireManage: true })
    if (!auth.ok) return auth.response

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
    const newUserIds = targetUserIds.filter((id: string) => !existingUserIds.has(id))

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
      data: newUserIds.map((id: string) => ({
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

    const auth = await authorizeChannel(channelId, { requireManage: true })
    if (!auth.ok) return auth.response

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
