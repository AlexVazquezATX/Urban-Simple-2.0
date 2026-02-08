/**
 * Stripe Checkout API
 *
 * POST - Create a Stripe Checkout session for subscription purchase
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { stripe, STRIPE_PRICE_IDS } from '@/lib/stripe'
import { getOrCreateSubscription } from '@/lib/services/studio-admin-service'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planTier } = (await request.json()) as { planTier: string }

    // Validate plan tier (only paid tiers)
    if (!['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(planTier)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const priceId = STRIPE_PRICE_IDS[planTier]
    if (!priceId) {
      return NextResponse.json({ error: 'Price not configured for this plan' }, { status: 400 })
    }

    // Get or create subscription to check for existing Stripe customer
    const subscription = await getOrCreateSubscription(user.companyId)

    // Create or reuse Stripe customer
    let stripeCustomerId = subscription.stripeCustomerId
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          companyId: user.companyId,
          userId: user.id,
        },
      })
      stripeCustomerId = customer.id

      // Persist customer ID immediately
      await prisma.studioSubscription.update({
        where: { companyId: user.companyId },
        data: { stripeCustomerId: customer.id },
      })
    }

    // If user already has an active Stripe subscription, redirect to portal instead
    if (subscription.stripeSubscriptionId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creative-studio`,
      })
      return NextResponse.json({ url: portalSession.url })
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/creative-studio?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      metadata: {
        companyId: user.companyId,
        planTier,
      },
      subscription_data: {
        metadata: {
          companyId: user.companyId,
        },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
