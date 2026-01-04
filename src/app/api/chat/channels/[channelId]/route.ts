import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/chat/channels/[channelId]
 * Update channel details (name, description)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const body = await request.json()
    const { name, description } = body

    // TODO: Get current user from session/auth
    const currentUser = await prisma.user.findFirst()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is a member of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: currentUser.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this channel' },
        { status: 403 }
      )
    }

    // Only owners and admins can update channel settings
    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const channel = await prisma.channel.update({
      where: { id: channelId },
      data: {
        name,
        slug,
        description,
      },
    })

    return NextResponse.json({
      success: true,
      channel,
    })
  } catch (error: any) {
    console.error('Failed to update channel:', error)
    return NextResponse.json(
      { error: 'Failed to update channel', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat/channels/[channelId]
 * Delete a channel (only owner can delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params

    // TODO: Get current user from session/auth
    const currentUser = await prisma.user.findFirst()

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is the owner of the channel
    const membership = await prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId: currentUser.id,
        },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this channel' },
        { status: 403 }
      )
    }

    if (membership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the channel owner can delete the channel' },
        { status: 403 }
      )
    }

    // Delete the channel (cascade will delete members and messages)
    await prisma.channel.delete({
      where: { id: channelId },
    })

    return NextResponse.json({
      success: true,
      message: 'Channel deleted',
    })
  } catch (error: any) {
    console.error('Failed to delete channel:', error)
    return NextResponse.json(
      { error: 'Failed to delete channel', details: error.message },
      { status: 500 }
    )
  }
}
