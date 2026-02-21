import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get pending first-contact messages awaiting approval
    const pendingMessages = await prisma.outreachMessage.findMany({
      where: {
        prospect: {
          companyId: user.companyId,
        },
        approvalStatus: 'pending',
        step: 1, // Only first contacts need approval
        status: 'pending',
      },
      include: {
        prospect: {
          include: {
            contacts: {
              take: 1,
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    return NextResponse.json({
      messages: pendingMessages.map((m) => ({
        id: m.id,
        prospectId: m.prospectId,
        prospectName: m.prospect?.companyName ?? null,
        contactName: m.prospect?.contacts[0]
          ? `${m.prospect.contacts[0].firstName} ${m.prospect.contacts[0].lastName}`
          : null,
        contactEmail: m.prospect?.contacts[0]?.email ?? null,
        contactPhone: m.prospect?.contacts[0]?.phone ?? null,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        isAiGenerated: m.isAiGenerated,
        createdAt: m.createdAt,
        campaignName: m.campaign?.name,
      })),
    })
  } catch (error) {
    console.error('Error fetching approval queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval queue' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { messageIds, action } = body // action: 'approve' | 'reject' | 'approve_all'

    if (action === 'approve_all') {
      // Approve all pending first contacts
      const updated = await prisma.outreachMessage.updateMany({
        where: {
          prospect: {
            companyId: user.companyId,
          },
          approvalStatus: 'pending',
          step: 1,
          status: 'pending',
        },
        data: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedById: user.id,
        },
      })

      return NextResponse.json({
        success: true,
        approved: updated.count,
      })
    }

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json(
        { error: 'Message IDs required' },
        { status: 400 }
      )
    }

    const updateData: any = {
      approvedAt: action === 'approve' ? new Date() : null,
      approvedById: action === 'approve' ? user.id : null,
    }
    updateData.approvalStatus = action === 'approve' ? 'approved' : 'rejected'

    const updated = await prisma.outreachMessage.updateMany({
      where: {
        id: { in: messageIds },
        prospect: {
          companyId: user.companyId,
        },
      },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      updated: updated.count,
    })
  } catch (error) {
    console.error('Error updating approval status:', error)
    return NextResponse.json(
      { error: 'Failed to update approval status' },
      { status: 500 }
    )
  }
}
