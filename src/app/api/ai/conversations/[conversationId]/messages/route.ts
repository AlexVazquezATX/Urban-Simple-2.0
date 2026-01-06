import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getConversationHistory } from '@/features/ai/lib/conversation-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/ai/conversations/[conversationId]/messages - Get conversation messages
export async function GET(
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
    const messages = await getConversationHistory(conversationId)

    return NextResponse.json({
      success: true,
      messages,
    })
  } catch (error: any) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
