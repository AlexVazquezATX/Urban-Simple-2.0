/**
 * Stripe Client
 *
 * Singleton Stripe instance + price ID mapping for subscription tiers.
 */

import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    })
  }
  return _stripe
}

/** @deprecated Use getStripe() instead — kept for compatibility */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})

// Map plan tiers to Stripe Price IDs (configured in Stripe Dashboard, stored in .env)
export const STRIPE_PRICE_IDS: Record<string, string> = {
  STARTER: process.env.STRIPE_PRICE_STARTER || '',
  PROFESSIONAL: process.env.STRIPE_PRICE_PRO || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

/**
 * Reverse lookup: Stripe Price ID → plan tier
 */
export function getTierFromPriceId(priceId: string): 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | null {
  for (const [tier, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id && id === priceId) return tier as 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  }
  return null
}
