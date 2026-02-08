/**
 * Creative Studio Usage API
 *
 * GET - Returns current plan tier, usage stats, and billing status
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getOrCreateSubscription } from '@/lib/services/studio-admin-service'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await getOrCreateSubscription(user.companyId)

    return NextResponse.json({
      planTier: subscription.planTier,
      generationsUsed: subscription.generationsUsedThisMonth,
      generationsLimit: subscription.monthlyGenerationsLimit,
      status: subscription.status,
      hasStripeSubscription: !!subscription.stripeSubscriptionId,
      cancelledAt: subscription.cancelledAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
    })
  } catch (error) {
    console.error('[Usage API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
