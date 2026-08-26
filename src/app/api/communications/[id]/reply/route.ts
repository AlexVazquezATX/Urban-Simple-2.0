import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logComm } from '@/lib/comms/log'
import { outreachReplyTo, findUnresolvedMergeTags } from '@/lib/services/outreach-guards'

/**
 * POST /api/communications/[id]/reply — reply to an inbound message from the
 * backend. Sends via Resend with threading headers (In-Reply-To/References
 * when the original Message-ID is known) so it lands in the sender's existing
 * email thread; logs to the hub; marks the original handled; records a
 * prospect activity when linked.
 *
 * Body: { body: string, subject?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const payload = await request.json().catch(() => null)
    const replyBody = typeof payload?.body === 'string' ? payload.body.trim() : ''
    if (!replyBody) return NextResponse.json({ error: 'body is required' }, { status: 400 })

    const unresolved = findUnresolvedMergeTags(payload?.subject ?? null, replyBody)
    if (unresolved.length > 0) {
      return NextResponse.json({ error: `Unresolved merge tags: ${unresolved.join(', ')}` }, { status: 400 })
    }

    const original = await prisma.commMessage.findFirst({
      where: { id, companyId: user.companyId },
    })
    if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (original.direction !== 'inbound') {
      return NextResponse.json({ error: 'Can only reply to an inbound message' }, { status: 400 })
    }
    const toEmail = original.fromEmail
    if (!toEmail) return NextResponse.json({ error: 'Original message has no sender address' }, { status: 400 })

    // DNC check when prospect-linked.
    if (original.prospectId) {
      const p = await prisma.prospect.findUnique({ where: { id: original.prospectId }, select: { doNotContact: true } })
      if (p?.doNotContact) {
        return NextResponse.json({ error: 'Prospect is marked Do Not Contact' }, { status: 409 })
      }
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
    }
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    const baseSubject = original.subject ?? ''
    const subject = typeof payload?.subject === 'string' && payload.subject.trim()
      ? payload.subject.trim()
      : /^re:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`.trim()

    // Signature (same convention as the outreach send paths).
    const sender = await prisma.user.findUnique({
      where: { id: user.id },
      select: { emailSignature: true, signatureLogoUrl: true },
    })
    let emailHtml = replyBody.replace(/\n/g, '<br>')
    if (sender?.emailSignature || sender?.signatureLogoUrl) {
      emailHtml += '<br><br>--<br>'
      if (sender.emailSignature) emailHtml += sender.emailSignature.replace(/\n/g, '<br>')
      if (sender.signatureLogoUrl) emailHtml += `<br><br><img src="${sender.signatureLogoUrl}" alt="Logo" style="max-height: 60px; width: auto;" />`
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject,
      html: emailHtml,
      ...outreachReplyTo(),
      // Thread into the recipient's existing conversation when we know the
      // original Message-ID.
      ...(original.messageIdHeader
        ? { headers: { 'In-Reply-To': original.messageIdHeader, References: original.messageIdHeader } }
        : {}),
    })
    if (error) {
      return NextResponse.json({ error: `Send failed: ${error.message}` }, { status: 502 })
    }

    const now = new Date()
    const commId = await logComm({
      companyId: user.companyId,
      direction: 'outbound',
      category: 'reply',
      fromEmail,
      toEmail,
      subject,
      body: replyBody,
      prospectId: original.prospectId,
      clientId: original.clientId,
      userId: user.id,
      resendEmailId: data?.id ?? null,
      sentAt: now,
    })

    // The inbound message is now handled.
    await prisma.commMessage.update({
      where: { id: original.id },
      data: { triageState: 'done' },
    }).catch(() => {})

    // Prospect timeline parity.
    if (original.prospectId) {
      await prisma.prospectActivity.create({
        data: {
          prospectId: original.prospectId,
          userId: user.id,
          type: 'email',
          channel: 'email',
          title: `Replied to ${toEmail}`,
          subject,
          messageBody: replyBody,
          sentAt: now,
          completedAt: now,
          metadata: data?.id ? { emailId: data.id, commMessageId: commId } : undefined,
        },
      }).catch(() => {})
      await prisma.prospect.update({
        where: { id: original.prospectId },
        data: { lastContactedAt: now },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, emailId: data?.id, commMessageId: commId })
  } catch (error) {
    console.error('Error sending reply:', error)
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
  }
}
