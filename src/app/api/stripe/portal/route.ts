/**
 * Stripe Customer Portal API
 *
 * POST - Create a Customer Portal session for subscription management
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { getOrCreateSubscription } from '@/lib/services/studio-admin-service'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Accept optional returnUrl from request body
    let returnUrl = '/creative-studio'
    try {
      const body = await request.json()
      if (body.returnUrl) returnUrl = body.returnUrl
    } catch {
      // No body or invalid JSON — use default
    }

    const subscription = await getOrCreateSubscription(user.companyId)

    if (!subscription.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Subscribe to a plan first.' },
        { status: 400 }
      )
    }

    // Use request origin so BackHaus users return to backhaus.ai
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('host')
    const baseUrl = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL

    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}${returnUrl}`,
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
