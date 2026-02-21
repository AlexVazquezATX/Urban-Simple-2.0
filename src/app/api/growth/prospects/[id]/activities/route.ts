import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// POST /api/growth/prospects/[id]/activities - Create activity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify prospect belongs to user's company
    const prospect = await prisma.prospect.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    const {
      type,
      channel,
      title,
      description,
      outcome,
      scheduledAt,
      completedAt,
      subject,
      messageBody,
      duration,
      metadata,
    } = body

    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        userId: user.id,
        type,
        channel,
        title,
        description,
        outcome,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        subject,
        messageBody,
        duration,
        metadata: metadata || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        prospect: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    })

    // Update prospect's lastContactedAt if this is a contact activity
    if (['call', 'email', 'meeting', 'sms', 'linkedin', 'instagram_dm'].includes(type)) {
      await prisma.prospect.update({
        where: { id },
        data: {
          lastContactedAt: new Date(),
        },
      })
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}

