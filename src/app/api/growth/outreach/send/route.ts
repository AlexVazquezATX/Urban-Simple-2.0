import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { Resend } from 'resend'

// Initialize Resend lazily to avoid build-time errors
let resend: Resend | null = null
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
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

    // Send immediately based on channel
    let emailId: string | undefined

    if (channel === 'email') {
      // Send email via Resend
      const resendClient = getResend()

      if (!resendClient) {
        return NextResponse.json(
          { error: 'Email service not configured. Please add RESEND_API_KEY to environment variables.' },
          { status: 500 }
        )
      }

      if (!subject) {
        return NextResponse.json(
          { error: 'Subject is required for email' },
          { status: 400 }
        )
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

      // Build email body with optional signature and logo
      let emailHtml = messageBody.replace(/\n/g, '<br>')
      if (user.emailSignature || user.signatureLogoUrl) {
        emailHtml += '<br><br>--<br>'
        if (user.emailSignature) {
          emailHtml += user.emailSignature.replace(/\n/g, '<br>')
        }
        if (user.signatureLogoUrl) {
          emailHtml += `<br><br><img src="${user.signatureLogoUrl}" alt="Logo" style="max-height: 60px; width: auto;" />`
        }
      }

      const { data, error } = await resendClient.emails.send({
        from: fromEmail,
        to,
        subject,
        html: emailHtml,
      })

      if (error) {
        console.error('Resend API Error:', error)

        // Log failed attempt
        await prisma.prospectActivity.create({
          data: {
            prospectId,
            userId: user.id,
            type: 'email',
            channel: 'email',
            title: 'Email failed to send',
            description: `Error: ${error.message || 'Unknown error'}`,
            subject,
            messageBody,
          },
        })

        return NextResponse.json(
          { error: `Failed to send email: ${error.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      emailId = data?.id
    }

    // Log successful activity
    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: user.id,
        type: channel,
        channel,
        title: `${channel === 'email' ? 'Email' : channel.toUpperCase()} sent`,
        description: channel === 'email' ? undefined : messageBody, // Don't duplicate body for emails
        subject: channel === 'email' ? subject : null,
        messageBody,
        sentAt: new Date(),
        completedAt: new Date(),
        metadata: emailId ? { emailId } : undefined,
      },
    })

    // Update prospect's lastContactedAt
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { lastContactedAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      activity,
      emailId,
      message: channel === 'email' ? 'Email sent successfully' : `${channel} message logged`
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
