import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/channels/[channelId]/favorite
 * Toggle favorite status for a channel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params
    const body = await request.json()
    const { isFavorite } = body

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      )
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update or create channel member record
    const channelMember = await prisma.channelMember.upsert({
      where: {
        channelId_userId: {
          channelId,
          userId: user.id,
        },
      },
      update: {
        isFavorite,
      },
      create: {
        channelId,
        userId: user.id,
        role: 'member',
        isFavorite,
      },
    })

    return NextResponse.json({
      success: true,
      isFavorite: channelMember.isFavorite,
    })
  } catch (error: any) {
    console.error('Failed to toggle favorite:', error)
    return NextResponse.json(
      { error: 'Failed to toggle favorite', details: error.message },
      { status: 500 }
    )
  }
}
