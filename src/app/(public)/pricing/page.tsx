'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicNav } from '@/components/landing/public-nav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { PLAN_PRICING } from '@/lib/config/studio-plans'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleSelectPlan(tier: string) {
    if (tier === 'TRIAL') {
      router.push('/login')
      return
    }

    setLoading(tier)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: tier }),
      })

      if (response.status === 401) {
        router.push('/login?redirect=/pricing')
        return
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNav />

      <section className="pt-28 pb-20 lg:pt-36 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4 bg-ocean-100 text-ocean-700 border-ocean-200">
              Pricing
            </Badge>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-charcoal-900 tracking-tight mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-charcoal-600 max-w-2xl mx-auto">
              AI-powered food photography and branded content for your restaurant.
              Start free, upgrade when you need more.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
            {PLAN_PRICING.map((plan) => (
              <div
                key={plan.tier}
                className={cn(
                  'rounded-2xl border p-7 flex flex-col transition-shadow',
                  plan.highlighted
                    ? 'border-ocean-500 bg-white shadow-lg ring-1 ring-ocean-500 relative'
                    : 'border-cream-200 bg-white shadow-sm hover:shadow-md'
                )}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-ocean-500 text-white border-0 shadow-sm">
                    Most Popular
                  </Badge>
                )}

                <h3 className="text-xl font-semibold text-charcoal-900">
                  {plan.displayName}
                </h3>
                <p className="text-sm text-charcoal-500 mt-1 mb-5">
                  {plan.description}
                </p>

                <div className="mb-6">
                  <span className="text-4xl font-display font-semibold text-charcoal-900">
                    ${plan.price}
                  </span>
                  <span className="text-charcoal-500 text-sm">/month</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-charcoal-700">
                      <Check className={cn(
                        'w-4 h-4 mt-0.5 shrink-0',
                        plan.highlighted ? 'text-ocean-600' : 'text-charcoal-400'
                      )} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={loading === plan.tier}
                  className={cn(
                    'w-full',
                    plan.highlighted
                      ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-md'
                      : ''
                  )}
                  variant={plan.highlighted ? 'default' : 'outline'}
                >
                  {loading === plan.tier ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <p className="text-center text-sm text-charcoal-500 mt-10">
            All plans include a 30-day money-back guarantee. Cancel anytime.
          </p>
        </div>
      </section>
    </div>
  )
}
