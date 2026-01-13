import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

// POST /api/growth/outreach/send-email - Send outreach email
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
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

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY || '')
    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html: emailBody,
    })

    if (error) {
      console.error('Resend API Error:', error)
      throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`)
    }

    // Create activity record
    const activity = await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: user.id,
        type: 'email',
        channel: 'email',
        subject,
        messageBody: emailBody,
        sentAt: new Date(),
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
        lastContactedAt: new Date(),
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

