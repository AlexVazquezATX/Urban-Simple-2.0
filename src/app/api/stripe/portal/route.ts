/**
 * Stripe Customer Portal API
 *
 * POST - Create a Customer Portal session for subscription management
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { getOrCreateSubscription } from '@/lib/services/studio-admin-service'

export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getOrCreateSubscription(user.companyId)

    if (!subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/creative-studio`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Portal] Error:', error)
    return NextResponse.json(
      { error: 'Failed to open billing portal' },
      { status: 500 }
    )
  }
}
