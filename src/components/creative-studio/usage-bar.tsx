'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowUpCircle, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageData {
  planTier: string
  generationsUsed: number
  generationsLimit: number
  status: string
  hasStripeSubscription: boolean
  cancelledAt: string | null
  currentPeriodEnd: string | null
}

export function UsageBar() {
  const router = useRouter()
  const pathname = usePathname()
  const isStudio = pathname.startsWith('/studio')
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    fetch('/api/creative-studio/usage')
      .then((res) => res.json())
      .then(setUsage)
      .catch(console.error)
  }, [])

  if (!usage) return null

  const percent = usage.generationsLimit > 0
    ? Math.round((usage.generationsUsed / usage.generationsLimit) * 100)
    : 0
  const isNearLimit = percent >= 80
  const isAtLimit = percent >= 100
  const isPaused = usage.status === 'paused'

  async function handleUpgrade() {
    // Determine next tier up
    const nextTier =
      usage?.planTier === 'TRIAL' ? 'STARTER' :
      usage?.planTier === 'STARTER' ? 'PROFESSIONAL' :
      'ENTERPRISE'

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: nextTier, ...(isStudio && { returnUrl: '/studio' }) }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Upgrade error:', error)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isStudio ? { returnUrl: '/studio' } : {}),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className={cn(
      'border-b px-4 md:px-6 py-2.5',
      isPaused ? 'bg-red-50 border-red-200' :
      isAtLimit ? 'bg-amber-50 border-amber-200' :
      isNearLimit ? 'bg-amber-50/50 border-amber-100' :
      'bg-white border-warm-200'
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isPaused ? (
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">Payment failed. Update your payment method to continue generating.</span>
            </div>
          ) : (
            <>
              <span className="text-xs text-warm-500 shrink-0">
                {usage.generationsUsed} / {usage.generationsLimit}
              </span>
              <div className="flex-1 max-w-[200px] h-1.5 bg-warm-200 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    isAtLimit ? 'bg-red-500' :
                    isNearLimit ? 'bg-amber-500' :
                    'bg-lime-500'
                  )}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              {isAtLimit && (
                <span className="text-xs text-red-600 font-medium shrink-0">
                  Limit reached
                </span>
              )}
              {usage.cancelledAt && usage.currentPeriodEnd && (
                <span className="text-xs text-warm-500 shrink-0">
                  Plan ends {new Date(usage.currentPeriodEnd).toLocaleDateString()}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isPaused && usage.hasStripeSubscription && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
            >
              Update Payment
            </Button>
          )}

          {!isPaused && usage.planTier !== 'ENTERPRISE' && (isNearLimit || isAtLimit) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpgrade}
              className="h-7 text-xs border-lime-400 text-lime-700 hover:bg-lime-50"
            >
              <ArrowUpCircle className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
          )}

          {usage.hasStripeSubscription && !isPaused && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="h-7 text-xs text-warm-500 hover:text-warm-700"
            >
              Billing
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
