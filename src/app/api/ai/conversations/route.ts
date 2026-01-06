import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getUserConversations,
  createNewConversation,
  getConversationHistory,
  deleteConversation,
  switchConversation,
} from '@/features/ai/lib/conversation-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/ai/conversations - List all conversations
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const conversations = await getUserConversations(user.id)

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        messageCount: conv._count.messages,
        lastMessage: conv.messages[0]?.content,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        isActive: conv.isActive,
      })),
    })
  } catch (error: any) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// POST /api/ai/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const conversationId = await createNewConversation(user.id)

    return NextResponse.json({
      success: true,
      conversationId,
    })
  } catch (error: any) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
