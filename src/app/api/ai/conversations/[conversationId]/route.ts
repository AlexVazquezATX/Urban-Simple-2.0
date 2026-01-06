import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  deleteConversation,
} from '@/features/ai/lib/conversation-manager'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// DELETE /api/ai/conversations/[conversationId] - Delete conversation
export async function DELETE(
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
    await deleteConversation(user.id, conversationId)

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
