import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'
import { outreachReplyTo } from '@/lib/services/outreach-guards'
import {
  checkSendable,
  describeSendCheck,
  resolveMessageRecipient,
} from '@/lib/services/outreach-recipient'
import { buildOutreachEmail } from '@/lib/services/outreach-email'
import { logComm } from '@/lib/comms/log'

// POST /api/growth/outreach/send-email - Send outreach email
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectId, to, subject, body: emailBody, templateId } = body

    if (!prospectId || !to || !subject || !emailBody) {
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
      include: {
        contacts: true,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    if (prospect.doNotContact) {
      return NextResponse.json({ error: 'This prospect is marked Do Not Contact' }, { status: 403 })
    }

    // Same verification gate as automated sends
    const recipient = resolveMessageRecipient({ recipientEmail: String(to) }, prospect.contacts)
    // A one-off a person typed is their call on catch-all/unverified domains;
    // bounced and opted-out addresses are still refused.
    const check = await checkSendable(recipient, prospect, { allowUnverified: true })
    if (!check.ok) {
      return NextResponse.json({ error: describeSendCheck(check.reason, String(to)) }, { status: 422 })
    }

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY || '')
    const from = process.env.RESEND_OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    // This route's body is already HTML (rich editor)
    const email = buildOutreachEmail({
      body: emailBody,
      bodyIsHtml: true,
      signature: user,
      prospectId,
      contactId: recipient?.id,
    })

    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html: email.html,
      text: email.text,
      headers: email.headers,
      ...outreachReplyTo(),
    })

    if (error) {
      console.error('Resend API Error:', error)
      throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`)
    }

    const now = new Date()

    // Create OutreachMessage record for tracking in the Sent tab
    await prisma.outreachMessage.create({
      data: {
        prospectId,
        step: 1,
        delayDays: 0,
        channel: 'email',
        subject,
        body: emailBody,
        recipientEmail: String(to).trim(),
        contactId: recipient?.id ?? null,
        status: 'sent',
        approvalStatus: 'approved',
        approvedAt: now,
        approvedById: user.id,
        sentAt: now,
        resendEmailId: data?.id || null,
      },
    })

    // Comms Hub (fire-and-forget)
    void logComm({
      companyId: user.companyId,
      direction: 'outbound',
      category: 'outreach',
      fromEmail: from,
      toEmail: to,
      subject,
      body: emailBody,
      prospectId,
      userId: user.id,
      resendEmailId: data?.id ?? null,
      sentAt: now,
    })

    // Create activity record
    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: user.id,
        type: 'email',
        channel: 'email',
        subject,
        messageBody: emailBody,
        sentAt: now,
        metadata: {
          emailId: data?.id,
          templateId: templateId || null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Update prospect's lastContactedAt
    await prisma.prospect.update({
      where: { id: prospectId },
      data: {
        lastContactedAt: now,
      },
    })

    return NextResponse.json({
      success: true,
      activity,
      emailId: data?.id,
    })
  } catch (error: any) {
    console.error('Error sending outreach email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

