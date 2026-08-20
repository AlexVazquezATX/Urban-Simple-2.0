import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { cancelPendingMessagesForProspect } from '@/lib/services/outreach-cancel'
import { resolveOutreachActorId } from '@/lib/services/outreach-guards'

/**
 * POST /api/webhooks/resend
 * Receives Resend webhook events for email tracking:
 *   email.delivered, email.opened, email.clicked, email.bounced, email.complained
 * …and inbound replies (Resend Inbound): email.received
 *
 * Setup in Resend dashboard:
 *   1. Go to Webhooks → Add Webhook
 *   2. URL: https://www.urbansimple.net/api/webhooks/resend
 *   3. Events: email.delivered, email.opened, email.clicked, email.bounced,
 *      email.complained, email.received
 *   4. Copy the signing secret → set RESEND_WEBHOOK_SECRET env var
 *
 * Reply ingestion additionally needs (see docs/outreach-replies.md):
 *   - An inbound domain in Resend (e.g. in.urbansimple.net) with its MX record
 *   - OUTREACH_REPLY_TO env var (e.g. reply@in.urbansimple.net) so outbound
 *     outreach carries a Reply-To that routes back through Resend Inbound
 */

/** Pull a bare lowercase email out of "Name <a@b.c>", {email}, or a string. */
function extractEmail(raw: unknown): string | null {
  const s =
    typeof raw === 'string' ? raw
    : raw && typeof raw === 'object' && typeof (raw as { email?: unknown }).email === 'string' ? (raw as { email: string }).email
    : Array.isArray(raw) && raw.length > 0 ? (typeof raw[0] === 'string' ? raw[0] : (raw[0] as { email?: string })?.email ?? '')
    : ''
  if (!s) return null
  const angled = s.match(/<([^>]+)>/)
  const candidate = (angled ? angled[1] : s).trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate) ? candidate : null
}

/**
 * Inbound reply → prospect activity timeline. Matches the sender against
 * ProspectContact emails; on match: logs a `replied` activity, marks the
 * latest sent message replied, and cancels the rest of the sequence.
 */
async function handleInboundReply(data: Record<string, unknown>) {
  const fromEmail = extractEmail(data?.from)
  if (!fromEmail) return NextResponse.json({ received: true, matched: false, reason: 'no_parseable_sender' })

  // Never ingest our own outbound address (loop guard).
  const ourFrom = (process.env.RESEND_OUTREACH_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || '').toLowerCase()
  if (ourFrom && fromEmail === ourFrom) {
    return NextResponse.json({ received: true, matched: false, reason: 'own_address' })
  }

  // Sender → prospect. Same address on several records (duplicate prospects,
  // shared owner inbox) → most recently contacted wins.
  const contacts = await prisma.prospectContact.findMany({
    where: { email: { equals: fromEmail, mode: 'insensitive' } },
    select: {
      prospect: {
        select: { id: true, companyId: true, companyName: true, lastContactedAt: true, deletedAt: true },
      },
    },
  })
  const prospect = contacts
    .map((c) => c.prospect)
    .filter((p) => p && !p.deletedAt)
    .sort((a, b) => (b.lastContactedAt?.getTime() ?? 0) - (a.lastContactedAt?.getTime() ?? 0))[0]
  if (!prospect) {
    console.log(`[RESEND INBOUND] Reply from ${fromEmail} matches no prospect contact — ignoring`)
    return NextResponse.json({ received: true, matched: false, reason: 'no_prospect_for_sender' })
  }

  const subject = typeof data?.subject === 'string' ? data.subject : null
  const rawText = typeof data?.text === 'string' && data.text.trim()
    ? data.text
    : typeof data?.html === 'string' ? data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''
  const bodyText = rawText.slice(0, 10_000)

  const actorId = await resolveOutreachActorId(prospect.companyId)
  const now = new Date()

  if (actorId) {
    // `outcome: 'replied'` = auto-detected reply. (Human-judged interest stays
    // `'interested'`; stats and the executor count both as a reply.)
    await prisma.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        userId: actorId,
        type: 'email',
        channel: 'email',
        title: `Reply received from ${fromEmail}`,
        outcome: 'replied',
        subject,
        messageBody: bodyText || null,
        sentAt: now,
        completedAt: now,
        metadata: { direction: 'inbound', from: fromEmail },
      },
    })
  } else {
    console.warn(`[RESEND INBOUND] Reply from ${fromEmail} matched prospect ${prospect.id} but no user to attribute the activity to`)
  }

  // Mark the latest sent outbound message as replied (per-message metric).
  const lastSent = await prisma.outreachMessage.findFirst({
    where: { prospectId: prospect.id, sentAt: { not: null } },
    orderBy: { sentAt: 'desc' },
    select: { id: true, status: true },
  })
  if (lastSent && ['sent', 'delivered', 'opened', 'clicked'].includes(lastSent.status)) {
    await prisma.outreachMessage.update({ where: { id: lastSent.id }, data: { status: 'replied' } })
  }

  // They replied — stop the rest of the sequence.
  const cancelled = await cancelPendingMessagesForProspect(prospect.id, 'prospect_replied', actorId ?? undefined)

  console.log(`[RESEND INBOUND] Reply from ${fromEmail} → prospect ${prospect.companyName} (${prospect.id}); ${cancelled} pending message(s) cancelled`)
  return NextResponse.json({ received: true, matched: true, type: 'email.received', prospectId: prospect.id, cancelled })
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const payload = JSON.parse(body)

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    // Fail closed in production: without the signing secret we can't verify the
    // sender, so an attacker could spoof delivery/open/bounce/complaint events
    // (a forged 'complained' even flips a prospect to Do-Not-Contact and cancels
    // their sequence). Local dev may still run unverified.
    if (!webhookSecret && process.env.NODE_ENV === 'production') {
      console.error('[RESEND WEBHOOK] RESEND_WEBHOOK_SECRET is not set — rejecting')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }
    if (webhookSecret) {
      const svixId = request.headers.get('svix-id')
      const svixTimestamp = request.headers.get('svix-timestamp')
      const svixSignature = request.headers.get('svix-signature')

      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 })
      }

      // Verify timestamp is within 5 minutes
      const timestamp = parseInt(svixTimestamp, 10)
      const now = Math.floor(Date.now() / 1000)
      if (Math.abs(now - timestamp) > 300) {
        return NextResponse.json({ error: 'Timestamp too old' }, { status: 401 })
      }

      // Verify signature
      const signedContent = `${svixId}.${svixTimestamp}.${body}`
      const secretBytes = Buffer.from(webhookSecret.replace('whsec_', ''), 'base64')
      const expectedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64')

      const signatures = svixSignature.split(' ')
      const isValid = signatures.some((sig) => {
        const sigValue = sig.replace('v1,', '')
        return sigValue === expectedSignature
      })

      if (!isValid) {
        console.error('[RESEND WEBHOOK] Invalid signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const { type, data } = payload

    // Inbound replies carry their own email id that matches no OUTBOUND
    // message, so handle them before the resendEmailId lookup below.
    if (type === 'email.received' || type === 'inbound.email.received') {
      return handleInboundReply(data ?? {})
    }

    // The email_id from Resend events is in data.email_id
    const emailId = data?.email_id
    if (!emailId) {
      // Not an email event we care about
      return NextResponse.json({ received: true })
    }

    // Find the outreach message by Resend email ID
    const message = await prisma.outreachMessage.findFirst({
      where: { resendEmailId: emailId },
    })

    if (!message) {
      // Could be an email from a different system (BackHaus, etc.) — ignore
      return NextResponse.json({ received: true, matched: false })
    }

    const now = new Date()

    switch (type) {
      case 'email.delivered':
        await prisma.outreachMessage.update({
          where: { id: message.id },
          data: {
            status: message.status === 'sent' ? 'delivered' : message.status,
            deliveredAt: message.deliveredAt || now,
          },
        })
        break

      case 'email.opened':
        await prisma.outreachMessage.update({
          where: { id: message.id },
          data: {
            status: ['sent', 'delivered'].includes(message.status) ? 'opened' : message.status,
            openedAt: message.openedAt || now,
            openCount: { increment: 1 },
          },
        })
        break

      case 'email.clicked':
        await prisma.outreachMessage.update({
          where: { id: message.id },
          data: {
            status: ['sent', 'delivered', 'opened'].includes(message.status) ? 'clicked' : message.status,
            clickedAt: message.clickedAt || now,
            clickCount: { increment: 1 },
          },
        })
        break

      case 'email.bounced':
        await prisma.outreachMessage.update({
          where: { id: message.id },
          data: {
            status: 'bounced',
            bouncedAt: now,
          },
        })
        // Auto-cancel remaining messages for this prospect
        if (message.prospectId) {
          await cancelPendingMessagesForProspect(message.prospectId, 'email_bounced')
        }
        break

      case 'email.complained':
        // Spam complaint — mark as failed and auto-cancel + flag Do Not Contact
        await prisma.outreachMessage.update({
          where: { id: message.id },
          data: {
            status: 'failed',
          },
        })
        if (message.prospectId) {
          await cancelPendingMessagesForProspect(message.prospectId, 'spam_complaint')
          // Auto-set Do Not Contact on spam complaint
          await prisma.prospect.update({
            where: { id: message.prospectId },
            data: { doNotContact: true, doNotContactAt: now },
          })
        }
        console.warn(`[RESEND WEBHOOK] Spam complaint for message ${message.id}, prospect ${message.prospectId} — marked Do Not Contact`)
        break

      default:
        // Unknown event type — acknowledge but don't process
        break
    }

    return NextResponse.json({ received: true, matched: true, type })
  } catch (error) {
    console.error('[RESEND WEBHOOK] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
