import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { cancelPendingMessagesForProspect } from '@/lib/services/outreach-cancel'

/**
 * POST /api/webhooks/resend
 * Receives Resend webhook events for email tracking:
 *   email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *
 * Setup in Resend dashboard:
 *   1. Go to Webhooks → Add Webhook
 *   2. URL: https://www.krew42.com/api/webhooks/resend
 *   3. Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *   4. Copy the signing secret → set RESEND_WEBHOOK_SECRET env var
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const payload = JSON.parse(body)

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
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
