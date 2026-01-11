import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectId, to, subject, body: messageBody, channel, scheduledAt } = body

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

    // If scheduled, create scheduled message
    if (scheduledAt) {
      // Create or find a campaign for scheduled messages
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
            name: `Scheduled ${channel} to ${prospect.companyName}`,
            status: 'active',
          },
        })
      }

      // Create scheduled message
      const scheduledMessage = await prisma.outreachMessage.create({
        data: {
          campaignId: campaign.id,
          prospectId,
          step: 1,
          delayDays: 0,
          channel,
          subject: subject || null,
          body: messageBody,
          status: 'pending',
          scheduledAt: new Date(scheduledAt),
        },
      })

      // Log activity
      await prisma.prospectActivity.create({
        data: {
          prospectId,
          userId: user.id,
          type: channel,
          channel,
          title: `${channel === 'email' ? 'Email' : channel.toUpperCase()} scheduled`,
          description: scheduledAt ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}` : null,
          scheduledAt: new Date(scheduledAt),
        },
      })

      return NextResponse.json({ success: true, scheduledMessage })
    }

    // Send immediately (for now, just log as activity - actual sending would integrate with email/SMS providers)
    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: user.id,
        type: channel,
        channel,
        title: `${channel === 'email' ? 'Email' : channel.toUpperCase()} sent`,
        description: messageBody,
        subject: channel === 'email' ? subject : null,
        messageBody,
        sentAt: new Date(),
        completedAt: new Date(),
      },
    })

    // TODO: Integrate with actual email/SMS providers (Resend, Twilio, etc.)
    // For now, we just log the activity

    return NextResponse.json({ success: true, activity })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
