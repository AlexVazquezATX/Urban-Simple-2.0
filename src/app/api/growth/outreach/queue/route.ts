import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// POST /api/growth/outreach/queue - Queue a message for human review
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectId, to, subject, body: messageBody, channel } = body

    if (!prospectId || !to || !messageBody || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify prospect belongs to user's company
    const prospect = await prisma.prospect.findFirst({
      where: {
        id: prospectId,
        companyId: user.companyId,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    // Find or create a campaign for this prospect
    let campaign = await prisma.outreachCampaign.findFirst({
      where: {
        companyId: user.companyId,
        prospectId,
        status: 'active',
      },
    })

    if (!campaign) {
      campaign = await prisma.outreachCampaign.create({
        data: {
          companyId: user.companyId,
          prospectId,
          createdById: user.id,
          name: `Outreach to ${prospect.companyName}`,
          status: 'active',
        },
      })
    }

    // Create message with pending approval status
    const message = await prisma.outreachMessage.create({
      data: {
        campaignId: campaign.id,
        prospectId,
        step: 1,
        delayDays: 0,
        channel,
        subject: subject || null,
        body: messageBody,
        status: 'pending',
        approvalStatus: 'pending',
        isAiGenerated: false,
      },
    })

    // Log activity
    await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: user.id,
        type: channel,
        channel,
        title: `${channel === 'email' ? 'Email' : channel.toUpperCase()} queued for review`,
        description: `Message to ${to} queued for human approval`,
        subject: channel === 'email' ? subject : null,
        messageBody,
      },
    })

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        status: 'pending',
        approvalStatus: 'pending',
      },
    })
  } catch (error) {
    console.error('Error queuing message:', error)
    return NextResponse.json(
      { error: 'Failed to queue message for review' },
      { status: 500 }
    )
  }
}
