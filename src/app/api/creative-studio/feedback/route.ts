import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rating, category, message } = body

    if (!rating || !message?.trim()) {
      return NextResponse.json(
        { error: 'Rating and message are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        companyId: user.companyId,
        rating,
        category: category || 'general',
        message: message.trim(),
      },
    })

    return NextResponse.json({ id: feedback.id })
  } catch (error) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to submit feedback' },
      { status: 500 }
    )
  }
}
