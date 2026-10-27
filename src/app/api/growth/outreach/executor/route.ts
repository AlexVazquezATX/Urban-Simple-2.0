import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { Resend } from 'resend'
import { cancelPendingMessagesForProspect } from '@/lib/services/outreach-cancel'
import {
  getStartOfLocalDay,
  isWithinSendWindow,
} from '@/lib/services/autopilot-schedule'
import {
  findDuplicateAlreadySent,
  findUnresolvedMergeTags,
  outreachReplyTo,
  resolveOutreachActorId,
} from '@/lib/services/outreach-guards'
import { logComm } from '@/lib/comms/log'
import { checkSendable, resolveMessageRecipient } from '@/lib/services/outreach-recipient'
import { buildOutreachEmail } from '@/lib/services/outreach-email'

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
// Address verification runs inline the first time an address is sent to.
// Cap lookups per run so a backlog of never-verified contacts can't turn one
// hourly run into hundreds of paid API calls (the rest verify next run).
const VERIFICATIONS_PER_RUN = 25
export const maxDuration = 300

export async function GET(request: NextRequest) {
  return POST(request)
}

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
            contacts: { orderBy: { createdAt: 'asc' } },
            activities: {
              where: {
                type: { in: ['email', 'sms', 'linkedin', 'instagram_dm'] },
                outcome: { in: ['interested', 'replied'] },
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

    // Lane 1b: scheduled single sends (Quick Compose "send later").
    // These are approved, step-1, non-autopilot messages whose scheduledAt has
    // arrived. The send route pre-approves them; no other lane picks up step 1.
    const scheduledReady = await prisma.outreachMessage.findMany({
      where: {
        approvalStatus: 'approved',
        status: 'pending',
        step: 1,
        scheduledAt: { lte: now },
        OR: [
          { campaignId: null },
          { campaign: { autopilot: false } },
        ],
      },
      include: {
        prospect: {
          include: {
            contacts: { orderBy: { createdAt: 'asc' } },
            activities: {
              where: {
                type: { in: ['email', 'sms', 'linkedin', 'instagram_dm'] },
                outcome: { in: ['interested', 'replied'] },
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
            contacts: { orderBy: { createdAt: 'asc' } },
            activities: {
              where: {
                type: { in: ['email', 'sms', 'linkedin', 'instagram_dm'] },
                outcome: { in: ['interested', 'replied'] },
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
    // Sends left today per company. Spent only on actual sends, so messages the
    // recipient gate blocks don't starve the ones queued behind them.
    const autopilotBudget = new Map<string, number>()

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

      // Count autopilot messages sent since local-midnight. Rely on sentAt, not
      // status equality: Resend webhooks advance status to delivered/opened/etc.,
      // so counting status:'sent' would undercount and overshoot the daily cap.
      const localMidnight = getStartOfLocalDay(now, timezone)
      const sentToday = await prisma.outreachMessage.count({
        where: {
          sentAt: { gte: localMidnight },
          campaign: { autopilot: true, companyId },
        },
      })

      const remaining = Math.max(0, company.autopilotDailyCap - sentToday)
      if (remaining === 0) {
        for (const m of messages) gatedReasons[m.id] = 'daily_cap_reached'
        continue
      }

      // Every window-eligible message goes forward in scheduledAt order; the
      // send loop stops spending once the day's budget is used up.
      autopilotBudget.set(companyId, remaining)
      autopilotGated.push(...messages)
    }

    const readyMessages = [...manualReady, ...scheduledReady, ...autopilotGated]

    const results = []
    const verifyBudget = { remaining: VERIFICATIONS_PER_RUN }

    for (const message of readyMessages) {
      const budgetKey = message.campaign?.autopilot ? message.campaign.companyId : null
      if (budgetKey && (autopilotBudget.get(budgetKey) ?? 0) <= 0) {
        gatedReasons[message.id] = 'daily_cap_reached'
        continue
      }

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
        (a) => (a.outcome === 'interested' || a.outcome === 'replied') && a.createdAt > message.createdAt
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

      // Guard: never send a follow-up (step > 1) before an earlier step has
      // actually gone out. A prior step counts as sent only if it has a sentAt
      // timestamp. Leave the follow-up pending so it can fire once step 1 sends.
      if (message.step > 1) {
        const priorSent = await prisma.outreachMessage.findFirst({
          where: {
            prospectId: message.prospectId,
            campaignId: message.campaignId,
            step: { lt: message.step },
            sentAt: { not: null },
          },
          select: { id: true },
        })
        if (!priorSent) {
          results.push({
            messageId: message.id,
            action: 'skipped',
            reason: 'no_prior_step_sent',
          })
          continue
        }
      }

      // Guard: never send a body/subject with unresolved {{merge tags}}. Skip
      // (not cancel) so the message stays visible in the queue for repair via
      // backfill-merge-tags or an edit.
      const unresolvedTags = findUnresolvedMergeTags(message.subject, message.body)
      if (unresolvedTags.length > 0) {
        console.warn(`[EXECUTOR GUARD] message ${message.id} skipped: unresolved merge tags ${unresolvedTags.join(', ')}`)
        results.push({
          messageId: message.id,
          action: 'skipped',
          reason: 'unresolved_merge_tags',
          tags: unresolvedTags,
        })
        continue
      }

      // Guard: email needs a recipient that passes the verification gate
      // (well-formed, never bounced, verified unless they came to us). Skip,
      // not cancel, so a blocked message stays visible in the queue.
      // An unpinned follow-up goes to whoever got the earlier step, so a
      // sequence never switches people midway.
      let pin: { contactId: string | null; recipientEmail: string | null } = message
      if (message.channel === 'email' && !message.contactId && !message.recipientEmail && message.step > 1) {
        const prior = await prisma.outreachMessage.findFirst({
          where: {
            prospectId: message.prospectId,
            campaignId: message.campaignId,
            step: { lt: message.step },
            sentAt: { not: null },
            recipientEmail: { not: null },
          },
          orderBy: { step: 'asc' },
          select: { recipientEmail: true, contactId: true },
        })
        if (prior) pin = prior
      }
      const recipient = resolveMessageRecipient(pin, message.prospect.contacts)
      const recipientEmail = recipient?.email?.trim() ?? null
      if (message.channel === 'email') {
        const check = await checkSendable(recipient, message.prospect, { verifyBudget })
        if (!check.ok) {
          console.warn(`[EXECUTOR GUARD] message ${message.id} skipped: ${check.reason} ${JSON.stringify(recipientEmail)}`)
          results.push({ messageId: message.id, action: 'skipped', reason: check.reason })
          continue
        }
      }

      // Guard: identical body already sent to this address (duplicate
      // prospect records produce duplicate queued messages).
      if (message.channel === 'email' && recipientEmail) {
        const dupId = await findDuplicateAlreadySent(message.body, recipientEmail, message.id)
        if (dupId) {
          console.warn(`[EXECUTOR GUARD] message ${message.id} skipped: identical body already sent to ${recipientEmail} (message ${dupId})`)
          results.push({
            messageId: message.id,
            action: 'skipped',
            reason: 'duplicate_already_sent',
            duplicateOf: dupId,
          })
          continue
        }
      }

      try {
        // Send the message via Resend (email) or mark as sent (other channels)
        const sendResult = await sendMessage(message, recipientEmail, recipient?.id ?? null)

        if (sendResult.sent) {
          if (budgetKey) autopilotBudget.set(budgetKey, (autopilotBudget.get(budgetKey) ?? 1) - 1)

          // Update message status + store Resend email ID for webhook tracking,
          // and record who it actually went to.
          await prisma.outreachMessage.update({
            where: { id: message.id },
            data: {
              status: 'sent',
              sentAt: new Date(),
              resendEmailId: sendResult.emailId || null,
              ...(message.channel === 'email'
                ? { recipientEmail, contactId: recipient?.id ?? message.contactId }
                : {}),
            },
          })

          // Comms Hub (fire-and-forget)
          void logComm({
            companyId: message.prospect.companyId,
            direction: 'outbound',
            category: 'outreach',
            fromEmail: process.env.RESEND_OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || null,
            toEmail: recipientEmail,
            subject: message.subject,
            body: message.body,
            prospectId: message.prospectId,
            userId: message.campaign?.createdById ?? null,
            resendEmailId: sendResult.emailId ?? null,
          })

          // Log activity. userId is a real FK — attribute to the campaign
          // creator, else the company's SUPER_ADMIN (the old 'system' string
          // violated the constraint and threw).
          const actorId = message.campaign?.createdById
            || (await resolveOutreachActorId(message.prospect.companyId))
          if (actorId) await prisma.prospectActivity.create({
            data: {
              prospectId: message.prospectId!, // guaranteed non-null by guard above
              userId: actorId,
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
      scheduledReady: scheduledReady.length,
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
async function sendMessage(
  message: any,
  recipientEmail: string | null,
  contactId: string | null,
): Promise<{ sent: boolean; emailId?: string }> {
  if (message.channel === 'email') {
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

    // Sender's signature, if the campaign has a creator
    const sender = message.campaign?.createdById
      ? await prisma.user.findUnique({
          where: { id: message.campaign.createdById },
          select: { emailSignature: true, signatureLogoUrl: true },
        })
      : null

    const email = buildOutreachEmail({
      body: message.body,
      signature: sender,
      prospectId: message.prospectId,
      contactId,
    })

    const { data, error } = await resendClient.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: message.subject || 'Hello',
      html: email.html,
      text: email.text,
      headers: email.headers,
      ...outreachReplyTo(),
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
