/**
 * Stripe Webhook Handler
 *
 * Processes Stripe subscription lifecycle events.
 * This is the single source of truth — all DB subscription
 * updates flow through here.
 */

import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, getTierFromPriceId } from '@/lib/stripe'
import {
  syncSubscriptionFromStripe,
  handleSubscriptionCancelled,
  downgradeToFreeTier,
  pauseSubscription,
} from '@/lib/services/studio-admin-service'
import type Stripe from 'stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`[Stripe Webhook] ${event.type}`)

  try {
    switch (event.type) {
      // Checkout completed — new subscription
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode !== 'subscription') break

        const companyId = session.metadata?.companyId
        if (!companyId) {
          console.error('[Stripe Webhook] No companyId in session metadata')
          break
        }

        const stripeSubscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        const priceId = stripeSubscription.items.data[0]?.price.id
        const planTier = getTierFromPriceId(priceId)

        if (!planTier) {
          console.error('[Stripe Webhook] Unknown price ID:', priceId)
          break
        }

        const periodEnd = stripeSubscription.items.data[0]?.current_period_end

        await syncSubscriptionFromStripe({
          companyId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: priceId,
          planTier,
          status: 'active',
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : new Date(),
        })

        console.log(`[Stripe Webhook] Subscription created: ${companyId} → ${planTier}`)
        break
      }

      // Subscription updated — upgrade, downgrade, renewal, or cancel schedule
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const companyId = subscription.metadata?.companyId

        if (!companyId) {
          console.error('[Stripe Webhook] No companyId in subscription metadata')
          break
        }

        // Cancel at period end (user cancelled but subscription still active)
        if (subscription.cancel_at_period_end) {
          await handleSubscriptionCancelled(subscription.id)
          console.log(`[Stripe Webhook] Cancel scheduled: ${companyId}`)
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        const planTier = getTierFromPriceId(priceId)

        if (!planTier) {
          console.error('[Stripe Webhook] Unknown price ID:', priceId)
          break
        }

        const status = subscription.status === 'past_due' ? 'paused' : 'active'

        const subPeriodEnd = subscription.items.data[0]?.current_period_end

        await syncSubscriptionFromStripe({
          companyId,
          stripeCustomerId: subscription.customer as string,
          stripeSubscriptionId: subscription.id,
          stripePriceId: priceId,
          planTier,
          status,
          currentPeriodEnd: subPeriodEnd ? new Date(subPeriodEnd * 1000) : new Date(),
        })

        console.log(`[Stripe Webhook] Subscription updated: ${companyId} → ${planTier}`)
        break
      }

      // Subscription deleted — fully expired
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await downgradeToFreeTier(subscription.id)
        console.log(`[Stripe Webhook] Subscription expired, downgraded to free`)
        break
      }

      // Payment failed
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const invoiceSubscription = invoice.parent?.subscription_details?.subscription

        if (invoiceSubscription) {
          const subId = typeof invoiceSubscription === 'string'
            ? invoiceSubscription
            : invoiceSubscription.id
          await pauseSubscription(subId)
          console.log(`[Stripe Webhook] Payment failed, subscription paused`)
        }
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled: ${event.type}`)
    }
  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error)
    // Return 200 to prevent Stripe from retrying on application errors
  }

  return NextResponse.json({ received: true })
}
