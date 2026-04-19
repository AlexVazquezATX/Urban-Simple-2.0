import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { Resend } from 'resend'
import { cancelPendingMessagesForProspect } from '@/lib/services/outreach-cancel'
import {
  getStartOfLocalDay,
  isWithinSendWindow,
} from '@/lib/services/autopilot-schedule'

// Initialize Resend lazily
let resend: Resend | null = null
function getResend() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

/**
 * Sequence Executor - Runs as a cron job to send pending outreach messages.
 *
 * Two lanes:
 *   1. Manual follow-ups — approvalStatus='approved', step > 1. No cap, no window.
 *   2. Autopilot (campaign.autopilot=true) — all steps, auto-approved, gated by
 *      the company's send window + daily cap. The first send of step 1 is how
 *      prospects auto-imported via CSV get their initial cold email.
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

    // Lane 1: manual follow-ups (legacy behavior, unchanged).
    // Includes both ad-hoc sends (no campaign) and non-autopilot campaign steps 2+.
    const manualReady = await prisma.outreachMessage.findMany({
      where: {
        approvalStatus: 'approved',
        status: 'pending',
        step: { gt: 1 },
        AND: [
          {
            OR: [
              { campaignId: null },
              { campaign: { autopilot: false } },
            ],
          },
          {
            OR: [
              { scheduledAt: { lte: now } },
              { scheduledAt: null },
            ],
          },
        ],
      },
      include: {
        prospect: {
          include: {
            contacts: { take: 1 },
            activities: {
              where: {
                type: { in: ['email', 'sms', 'linkedin', 'instagram_dm'] },
                outcome: 'interested',
              },
              orderBy: { createdAt: 'desc' },
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
            companyId: true,
            autopilot: true,
          },
        },
      },
      take: 50,
    })

    // Lane 2: autopilot messages. Fetch candidates, then enforce per-company
    // window + daily cap in app code (simpler than a monster SQL query).
    const autopilotCandidates = await prisma.outreachMessage.findMany({
      where: {
        status: 'pending',
        campaign: { autopilot: true, status: 'active' },
        scheduledAt: { lte: now },
      },
      include: {
        prospect: {
          include: {
            contacts: { take: 1 },
            activities: {
              where: {
                type: { in: ['email', 'sms', 'linkedin', 'instagram_dm'] },
                outcome: 'interested',
              },
              orderBy: { createdAt: 'desc' },
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
            companyId: true,
            autopilot: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 200,
    })

    // Group autopilot candidates by companyId and apply send window + daily cap.
    const byCompany = new Map<string, typeof autopilotCandidates>()
    for (const msg of autopilotCandidates) {
      const cid = msg.campaign?.companyId
      if (!cid) continue
      if (!byCompany.has(cid)) byCompany.set(cid, [])
      byCompany.get(cid)!.push(msg)
    }

    const autopilotGated: typeof autopilotCandidates = []
    const gatedReasons: Record<string, string> = {}

    for (const [companyId, messages] of byCompany.entries()) {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          autopilotDailyCap: true,
          autopilotSendHourStart: true,
          autopilotSendHourEnd: true,
          autopilotSendDaysOfWeek: true,
          branches: { select: { timezone: true }, take: 1 },
        },
      })
      if (!company) continue

      const timezone = company.branches[0]?.timezone || 'America/Chicago'
      const window = {
        timezone,
        hourStart: company.autopilotSendHourStart,
        hourEnd: company.autopilotSendHourEnd,
        daysOfWeek: company.autopilotSendDaysOfWeek,
      }

      if (!isWithinSendWindow(now, window)) {
        for (const m of messages) gatedReasons[m.id] = 'outside_send_window'
        continue
      }

      // Count autopilot messages sent since local-midnight.
      const localMidnight = getStartOfLocalDay(now, timezone)
      const sentToday = await prisma.outreachMessage.count({
        where: {
          status: 'sent',
          sentAt: { gte: localMidnight },
          campaign: { autopilot: true, companyId },
        },
      })

      const remaining = Math.max(0, company.autopilotDailyCap - sentToday)
      if (remaining === 0) {
        for (const m of messages) gatedReasons[m.id] = 'daily_cap_reached'
        continue
      }

      // Take up to `remaining` messages from the front of the (scheduledAt-ordered) list.
      const toSend = messages.slice(0, remaining)
      const deferred = messages.slice(remaining)
      for (const m of deferred) gatedReasons[m.id] = 'daily_cap_reached'
      autopilotGated.push(...toSend)
    }

    const readyMessages = [...manualReady, ...autopilotGated]

    const results = []

    for (const message of readyMessages) {
      // Skip messages without a prospect (sequence templates)
      if (!message.prospect || !message.prospectId) {
        results.push({ messageId: message.id, action: 'skipped', reason: 'no_prospect' })
        continue
      }

      // Block sending to Do Not Contact prospects
      if (message.prospect.doNotContact) {
        await cancelPendingMessagesForProspect(message.prospectId, 'do_not_contact')
        results.push({ messageId: message.id, action: 'skipped', reason: 'do_not_contact' })
        continue
      }

      // Check if prospect replied (stop sequence on reply)
      const hasReply = message.prospect.activities.some(
        (a) => a.outcome === 'interested' && a.createdAt > message.createdAt
      )

      if (hasReply) {
        await cancelPendingMessagesForProspect(message.prospectId, 'prospect_replied')
        results.push({
          messageId: message.id,
          action: 'skipped',
          reason: 'prospect_replied',
        })
        continue
      }

      // Check if campaign is still active
      if (message.campaign && message.campaign.status !== 'active') {
        results.push({
          messageId: message.id,
          action: 'skipped',
          reason: 'campaign_inactive',
        })
        continue
      }

      try {
        // Send the message via Resend (email) or mark as sent (other channels)
        const sendResult = await sendMessage(message)

        if (sendResult.sent) {
          // Update message status + store Resend email ID for webhook tracking
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
              resendEmailId: sendResult.emailId || null,
            },
          })

          // Log activity
          await prisma.prospectActivity.create({
            data: {
              prospectId: message.prospectId!, // guaranteed non-null by guard above
              userId: message.campaign?.createdById || 'system', // Use campaign creator as user
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
            reason: 'send_failed' as const,
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

    const gatedSummary = Object.entries(gatedReasons).reduce<Record<string, number>>(
      (acc, [, reason]) => {
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      },
      {}
    )

    return NextResponse.json({
      success: true,
      processed: results.length,
      manualReady: manualReady.length,
      autopilotReady: autopilotGated.length,
      autopilotGated: gatedSummary,
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
 * Returns { sent: boolean, emailId?: string }
 */
async function sendMessage(message: any): Promise<{ sent: boolean; emailId?: string }> {
  if (message.channel === 'email') {
    const recipientEmail = message.prospect?.contacts?.[0]?.email
    if (!recipientEmail) {
      console.warn(`[SEND] No email for prospect ${message.prospectId}, skipping`)
      return { sent: false }
    }

    const resendClient = getResend()
    if (!resendClient) {
      console.error('[SEND] Resend not configured (RESEND_API_KEY missing)')
      return { sent: false }
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

    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: message.subject || 'Hello',
      html: emailHtml,
    })

    if (error) {
      console.error(`[SEND] Resend error for message ${message.id}:`, error)
      return { sent: false }
    }

    return { sent: true, emailId: data?.id }
  }

  // Non-email channels: log and mark as sent (operator sends manually)
  console.log(`[SEND] ${message.channel} to prospect ${message.prospectId} — manual send required`)
  return { sent: true }
}
