import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { switchConversation } from '@/features/ai/lib/conversation-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/ai/conversations/[conversationId]/switch - Switch to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { conversationId } = await params
    await switchConversation(user.id, conversationId)

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Switch conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to switch conversation' },
      { status: 500 }
    )
  }
}
