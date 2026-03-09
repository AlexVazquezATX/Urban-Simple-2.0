import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import {
  generateOutreachMessage,
  type ProspectData,
} from '@/lib/ai/outreach-composer'
import { Resend } from 'resend'

// Initialize Resend lazily
let resend: Resend | null = null
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// GET /api/growth/outreach/approval-queue?view=pending|approved|sent
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'pending'

    const where: any = {
      prospect: { companyId: user.companyId },
    }

    const now = new Date()

    if (view === 'approved') {
      // Only show messages that are actually ready to send RIGHT NOW
      // Step 1 approved messages + follow-ups whose scheduled date has arrived
      where.approvalStatus = 'approved'
      where.status = 'pending'
      where.OR = [
        { step: 1 },
        { step: { gt: 1 }, scheduledAt: { lte: now } },
      ]
    } else if (view === 'scheduled') {
      // Follow-up steps that are approved but not yet due
      where.approvalStatus = 'approved'
      where.status = 'pending'
      where.step = { gt: 1 }
      where.scheduledAt = { gt: now }
    } else if (view === 'sent') {
      where.status = 'sent'
    } else {
      // Default: pending review
      where.approvalStatus = 'pending'
      where.step = 1
      where.status = 'pending'
    }

    const messages = await prisma.outreachMessage.findMany({
      where,
      include: {
        prospect: {
          include: {
            contacts: { take: 1 },
          },
        },
        campaign: {
          select: { id: true, name: true },
        },
      },
      orderBy: view === 'sent'
        ? { sentAt: 'desc' as const }
        : { createdAt: 'asc' as const },
      take: view === 'sent' ? 100 : undefined,
    })

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        prospectId: m.prospectId,
        prospectName: m.prospect?.companyName ?? null,
        contactName: m.prospect?.contacts[0]
          ? `${m.prospect.contacts[0].firstName} ${m.prospect.contacts[0].lastName}`.trim()
          : null,
        contactEmail: m.prospect?.contacts[0]?.email ?? null,
        contactPhone: m.prospect?.contacts[0]?.phone ?? null,
        channel: m.channel,
        subject: m.subject,
        body: m.body,
        step: m.step,
        scheduledAt: m.scheduledAt,
        isAiGenerated: m.isAiGenerated,
        createdAt: m.createdAt,
        approvedAt: m.approvedAt,
        sentAt: m.sentAt,
        campaignName: m.campaign?.name,
      })),
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
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
    const { messageIds, action } = body

    // ── Approve All ──
    if (action === 'approve_all') {
      const updated = await prisma.outreachMessage.updateMany({
        where: {
          prospect: { companyId: user.companyId },
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

      return NextResponse.json({ success: true, approved: updated.count })
    }

    // ── Edit ──
    if (action === 'edit') {
      const { messageId, body: newBody, subject: newSubject } = body

      if (!messageId || typeof messageId !== 'string') {
        return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
      }
      if (!newBody || typeof newBody !== 'string' || newBody.trim().length === 0) {
        return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 })
      }

      const existing = await prisma.outreachMessage.findFirst({
        where: {
          id: messageId,
          approvalStatus: 'pending',
          prospect: { companyId: user.companyId },
        },
      })

      if (!existing) {
        return NextResponse.json({ error: 'Message not found or not editable' }, { status: 404 })
      }

      const updateData: any = {
        body: newBody.trim(),
        isAiGenerated: false,
      }
      if (newSubject !== undefined) {
        updateData.subject = newSubject.trim() || null
      }

      const updated = await prisma.outreachMessage.update({
        where: { id: messageId },
        data: updateData,
      })

      return NextResponse.json({
        success: true,
        message: { id: updated.id, body: updated.body, subject: updated.subject },
      })
    }

    // ── Regenerate ──
    if (action === 'regenerate') {
      const { messageId, customInstructions } = body

      if (!messageId || typeof messageId !== 'string') {
        return NextResponse.json({ error: 'Message ID required' }, { status: 400 })
      }

      const existing = await prisma.outreachMessage.findFirst({
        where: {
          id: messageId,
          approvalStatus: 'pending',
          prospect: { companyId: user.companyId },
        },
        include: {
          prospect: { include: { contacts: true } },
        },
      })

      if (!existing || !existing.prospect) {
        return NextResponse.json({ error: 'Message not found or not regeneratable' }, { status: 404 })
      }

      const prospect = existing.prospect
      const prospectData: ProspectData = {
        companyName: prospect.companyName,
        businessType: prospect.businessType || undefined,
        industry: prospect.industry || undefined,
        address: prospect.address as any,
        website: prospect.website || undefined,
        priceLevel: prospect.priceLevel || undefined,
        contacts: prospect.contacts.map((c) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          title: c.title || undefined,
          email: c.email || undefined,
        })),
        notes: prospect.notes || undefined,
        aiScore: prospect.aiScore || undefined,
        aiScoreReason: prospect.aiScoreReason || undefined,
      }

      const generated = await generateOutreachMessage({
        channel: existing.channel as any,
        prospect: prospectData,
        tone: 'friendly',
        purpose: 'cold_outreach',
        customInstructions: customInstructions || undefined,
      })

      const updated = await prisma.outreachMessage.update({
        where: { id: messageId },
        data: {
          body: generated.body,
          subject: generated.subject || existing.subject,
          isAiGenerated: true,
        },
      })

      return NextResponse.json({
        success: true,
        message: { id: updated.id, body: updated.body, subject: updated.subject },
      })
    }

    // ── Send approved messages ──
    if (action === 'send') {
      if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
        return NextResponse.json({ error: 'Message IDs required' }, { status: 400 })
      }

      // Optional: UI can override recipient emails per message
      const toOverrides: Record<string, string> = body.toOverrides || {}

      const sendNow = new Date()
      const messages = await prisma.outreachMessage.findMany({
        where: {
          id: { in: messageIds },
          approvalStatus: 'approved',
          status: 'pending',
          prospect: { companyId: user.companyId },
          // Only send messages whose scheduled time has arrived (or have no schedule)
          OR: [
            { scheduledAt: null },
            { scheduledAt: { lte: sendNow } },
          ],
        },
        include: {
          prospect: {
            include: { contacts: { take: 1 } },
          },
          campaign: {
            select: { id: true, createdById: true },
          },
        },
      })

      // Fetch fresh user data to ensure we have the latest signature
      const freshUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailSignature: true, signatureLogoUrl: true },
      })

      const results: Array<{ messageId: string; status: string; reason?: string; emailId?: string }> = []

      for (const msg of messages) {
        try {
          if (msg.channel === 'email') {
            // Use override email if provided, otherwise fall back to contact's email
            const toEmail = toOverrides[msg.id] || msg.prospect?.contacts[0]?.email

            if (!toEmail) {
              results.push({ messageId: msg.id, status: 'failed', reason: 'No email address — edit the "To" field before sending' })
              continue
            }

            const resendClient = getResend()
            if (!resendClient) {
              results.push({ messageId: msg.id, status: 'failed', reason: 'Email service not configured (RESEND_API_KEY missing)' })
              continue
            }

            const fromEmail = process.env.RESEND_OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

            // Build HTML with signature
            let emailHtml = msg.body.replace(/\n/g, '<br>')
            if (freshUser?.emailSignature || freshUser?.signatureLogoUrl) {
              emailHtml += '<br><br>--<br>'
              if (freshUser.emailSignature) {
                emailHtml += freshUser.emailSignature.replace(/\n/g, '<br>')
              }
              if (freshUser.signatureLogoUrl) {
                emailHtml += `<br><br><img src="${freshUser.signatureLogoUrl}" alt="Logo" style="max-height: 60px; width: auto;" />`
              }
            }

            const { data: emailData, error: emailError } = await resendClient.emails.send({
              from: fromEmail,
              to: toEmail,
              subject: msg.subject || 'Hello',
              html: emailHtml,
            })

            if (emailError) {
              results.push({ messageId: msg.id, status: 'failed', reason: emailError.message })
              continue
            }

            // Mark as sent
            await prisma.outreachMessage.update({
              where: { id: msg.id },
              data: { status: 'sent', sentAt: new Date() },
            })

            // Log activity
            await prisma.prospectActivity.create({
              data: {
                prospectId: msg.prospectId!,
                userId: user.id,
                type: 'email',
                channel: 'email',
                title: `Email sent: ${msg.subject || 'No subject'}`,
                subject: msg.subject,
                messageBody: msg.body,
                sentAt: new Date(),
                completedAt: new Date(),
                metadata: emailData?.id ? { emailId: emailData.id } : undefined,
              },
            })

            // Update lastContactedAt
            await prisma.prospect.update({
              where: { id: msg.prospectId! },
              data: { lastContactedAt: new Date() },
            })

            results.push({ messageId: msg.id, status: 'sent', emailId: emailData?.id })
          } else {
            // Non-email channels: mark as sent (manual send — copy message from UI)
            await prisma.outreachMessage.update({
              where: { id: msg.id },
              data: { status: 'sent', sentAt: new Date() },
            })

            if (msg.prospectId) {
              await prisma.prospectActivity.create({
                data: {
                  prospectId: msg.prospectId,
                  userId: user.id,
                  type: msg.channel,
                  channel: msg.channel,
                  title: `${msg.channel} message marked as sent`,
                  messageBody: msg.body,
                  sentAt: new Date(),
                  completedAt: new Date(),
                },
              })

              await prisma.prospect.update({
                where: { id: msg.prospectId },
                data: { lastContactedAt: new Date() },
              })
            }

            results.push({ messageId: msg.id, status: 'sent' })
          }
        } catch (error: any) {
          console.error(`Error sending message ${msg.id}:`, error)
          results.push({ messageId: msg.id, status: 'failed', reason: error.message })
        }
      }

      const sentCount = results.filter((r) => r.status === 'sent').length

      return NextResponse.json({
        success: true,
        sent: sentCount,
        total: results.length,
        results,
      })
    }

    // ── Approve / Reject ──
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
        prospect: { companyId: user.companyId },
      },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      updated: updated.count,
    })
  } catch (error) {
    console.error('Error updating messages:', error)
    return NextResponse.json(
      { error: 'Failed to update messages' },
      { status: 500 }
    )
  }
}
