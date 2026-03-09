import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { Resend } from 'resend'

// Initialize Resend lazily
let resend: Resend | null = null
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

/**
 * Sequence Executor - Runs as a cron job to auto-send approved follow-up messages
 * This endpoint should be called periodically (e.g., every hour) to process pending sequence steps
 */
export async function POST(request: NextRequest) {
  try {
    // Verify auth: cron secret OR API key
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`
    const apiKeyUser = !isCron ? await getAuthenticatedUser(request) : null

    if (!isCron && !apiKeyUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Find all approved messages that are ready to send
    // Conditions:
    // 1. approvalStatus = 'approved'
    // 2. status = 'pending'
    // 3. scheduledAt <= now (or null for immediate send)
    // 4. step > 1 (follow-ups only, first contacts need manual approval)
    const readyMessages = await prisma.outreachMessage.findMany({
      where: {
        approvalStatus: 'approved',
        status: 'pending',
        step: { gt: 1 }, // Only follow-ups
        OR: [
          { scheduledAt: { lte: now } },
          { scheduledAt: null },
        ],
      },
      include: {
        prospect: {
          include: {
            contacts: {
              take: 1,
            },
            activities: {
              where: {
                type: { in: ['email', 'sms', 'linkedin', 'instagram_dm'] },
                outcome: 'interested',
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
            status: true,
            createdById: true,
          },
        },
      },
      take: 50, // Process in batches
    })

    const results = []

    for (const message of readyMessages) {
      // Skip messages without a prospect (sequence templates)
      if (!message.prospect || !message.prospectId) {
        results.push({ messageId: message.id, action: 'skipped', reason: 'no_prospect' })
        continue
      }

      // Check if prospect replied (stop sequence on reply)
      const hasReply = message.prospect.activities.some(
        (a) => a.outcome === 'interested' && a.createdAt > message.createdAt
      )

      if (hasReply) {
        // Mark sequence as paused
        await prisma.outreachMessage.updateMany({
          where: {
            campaignId: message.campaignId,
            prospectId: message.prospectId,
            step: { gt: message.step },
            status: 'pending',
          },
          data: {
            status: 'cancelled',
          },
        })

        results.push({
          messageId: message.id,
          action: 'skipped',
          reason: 'prospect_replied',
        })
        continue
      }

      // Check if campaign is still active
      if (message.campaign.status !== 'active') {
        results.push({
          messageId: message.id,
          action: 'skipped',
          reason: 'campaign_inactive',
        })
        continue
      }

      try {
        // Send the message (placeholder - integrate with actual sending service)
        const sent = await sendMessage(message)

        if (sent) {
          // Update message status
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
            },
          })

          // Log activity
          await prisma.prospectActivity.create({
            data: {
              prospectId: message.prospectId!, // guaranteed non-null by guard above
              userId: message.campaign.createdById, // Use campaign creator as user
              type: message.channel === 'email' ? 'email' : 
                    message.channel === 'sms' ? 'sms' :
                    message.channel === 'linkedin' ? 'linkedin' :
                    'instagram_dm',
              channel: message.channel,
              title: message.subject || `Follow-up ${message.step}`,
              messageBody: message.body,
              sentAt: new Date(),
              outcome: 'sent',
            },
          })

          // Update prospect last contacted
          await prisma.prospect.update({
            where: { id: message.prospectId! },
            data: {
              lastContactedAt: new Date(),
            },
          })

          results.push({
            messageId: message.id,
            action: 'sent',
            channel: message.channel,
          })
        } else {
          results.push({
            messageId: message.id,
            action: 'failed',
            reason: 'send_failed',
          })
        }
      } catch (error) {
        console.error(`Error sending message ${message.id}:`, error)
        results.push({
          messageId: message.id,
          action: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error('Error executing sequences:', error)
    return NextResponse.json(
      { error: 'Failed to execute sequences' },
      { status: 500 }
    )
  }
}

/**
 * Send message via appropriate channel
 */
async function sendMessage(message: any): Promise<boolean> {
  if (message.channel === 'email') {
    const recipientEmail = message.prospect?.contacts?.[0]?.email
    if (!recipientEmail) {
      console.warn(`[SEND] No email for prospect ${message.prospectId}, skipping`)
      return false
    }

    const resendClient = getResend()
    if (!resendClient) {
      console.error('[SEND] Resend not configured (RESEND_API_KEY missing)')
      return false
    }

    const fromEmail = process.env.RESEND_OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

    // Build HTML body with optional signature
    let emailHtml = message.body.replace(/\n/g, '<br>')

    // Fetch sender's signature if available
    if (message.campaign?.createdById) {
      const sender = await prisma.user.findUnique({
        where: { id: message.campaign.createdById },
        select: { emailSignature: true, signatureLogoUrl: true },
      })
      if (sender?.emailSignature || sender?.signatureLogoUrl) {
        emailHtml += '<br><br>--<br>'
        if (sender.emailSignature) {
          emailHtml += sender.emailSignature.replace(/\n/g, '<br>')
        }
        if (sender.signatureLogoUrl) {
          emailHtml += `<br><br><img src="${sender.signatureLogoUrl}" alt="Logo" style="max-height: 60px; width: auto;" />`
        }
      }
    }

    const { error } = await resendClient.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: message.subject || 'Hello',
      html: emailHtml,
    })

    if (error) {
      console.error(`[SEND] Resend error for message ${message.id}:`, error)
      return false
    }

    return true
  }

  // Non-email channels: log and mark as sent (operator sends manually)
  console.log(`[SEND] ${message.channel} to prospect ${message.prospectId} — manual send required`)
  return true
}
