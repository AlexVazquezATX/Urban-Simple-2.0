'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CreditCard,
  ArrowUpCircle,
  Loader2,
  Crown,
  Calendar,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface UserData {
  firstName: string
  lastName: string
  email: string
  role: string
}

interface UsageData {
  planTier: string
  generationsUsed: number
  generationsLimit: number
  status: string
  hasStripeSubscription: boolean
  cancelledAt: string | null
  currentPeriodEnd: string | null
}

const TIER_LABELS: Record<string, string> = {
  TRIAL: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Pro',
  ENTERPRISE: 'Max',
}

const TIER_COLORS: Record<string, string> = {
  TRIAL: 'bg-warm-100 text-warm-600 border-warm-200',
  STARTER: 'bg-ocean-100 text-ocean-700 border-ocean-200',
  PROFESSIONAL: 'bg-plum-100 text-plum-700 border-plum-200',
  ENTERPRISE: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function StudioAccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/users/me').then(r => r.ok ? r.json() : null),
      fetch('/api/creative-studio/usage').then(r => r.ok ? r.json() : null),
    ]).then(([userData, usageData]) => {
      setUser(userData)
      setUsage(usageData)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(targetTier: string) {
    setUpgradeLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planTier: targetTier, returnUrl: '/studio' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Unable to start checkout. Please try again.')
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setUpgradeLoading(false)
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: '/studio/account' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Unable to open billing portal. Please try again.')
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-warm-400" />
      </div>
    )
  }

  const tierLabel = TIER_LABELS[usage?.planTier || 'TRIAL'] || 'Free'
  const tierColor = TIER_COLORS[usage?.planTier || 'TRIAL'] || TIER_COLORS.TRIAL
  const isPaused = usage?.status === 'paused'
  const isCancelled = !!usage?.cancelledAt
  const percent = usage && usage.generationsLimit > 0
    ? Math.round((usage.generationsUsed / usage.generationsLimit) * 100)
    : 0

  // All upgrade tiers above current plan
  const PLAN_OPTIONS = [
    { tier: 'STARTER', price: '$29', generations: '50', description: 'For getting started with AI content' },
    { tier: 'PROFESSIONAL', price: '$59', generations: '200', description: 'For active content creators', popular: true },
    { tier: 'ENTERPRISE', price: '$99', generations: '1,000', description: 'For high-volume teams' },
  ]

  const currentTierIndex = ['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].indexOf(usage?.planTier || 'TRIAL')
  const availableUpgrades = PLAN_OPTIONS.filter((_, i) => i >= currentTierIndex)

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/studio"
              className="p-2 hover:bg-warm-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-warm-600" />
            </Link>
            <div>
              <h1 className="text-lg font-display font-medium text-warm-900">
                Account & Billing
              </h1>
              <p className="text-sm text-warm-500">
                Manage your plan and account settings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Payment Failed Banner */}
        {isPaused && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Payment Failed</p>
              <p className="text-sm text-red-700 mt-0.5">
                Your last payment couldn&apos;t be processed. Update your payment method to continue generating content.
              </p>
              {usage?.hasStripeSubscription && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
                >
                  {portalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
                  Update Payment Method
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white rounded-sm border border-warm-200 p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-warm-500" />
                <h2 className="text-sm font-medium text-warm-700">Current Plan</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-warm-900">{tierLabel}</span>
                <Badge variant="outline" className={cn('text-xs', tierColor)}>
                  {isPaused ? 'Paused' : isCancelled ? 'Cancelling' : 'Active'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Usage */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-warm-500">
                {usage?.generationsUsed || 0} / {usage?.generationsLimit || 0} generations{usage?.planTier === 'TRIAL' ? ' total' : ' this month'}
              </span>
              <span className="text-warm-500 font-medium">{percent}%</span>
            </div>
            <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  percent >= 100 ? 'bg-red-500' :
                  percent >= 80 ? 'bg-amber-500' :
                  'bg-lime-500'
                )}
                style={{ width: `${Math.min(percent, 100)}%` }}
              />
            </div>
          </div>

          {/* Period end */}
          {usage?.currentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-warm-500">
              <Calendar className="w-4 h-4" />
              {isCancelled ? 'Plan ends' : 'Renews'}{' '}
              {new Date(usage.currentPeriodEnd).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          )}
        </div>

        {/* Available Plans */}
        {availableUpgrades.length > 0 && !isPaused && (
          <div className="bg-white rounded-sm border border-warm-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-warm-500" />
              <h2 className="text-sm font-medium text-warm-700">
                {usage?.planTier === 'TRIAL' ? 'Upgrade Your Plan' : 'Plan Options'}
              </h2>
            </div>

            <div className="space-y-3">
              {availableUpgrades.map((plan) => {
                const isCurrent = plan.tier === usage?.planTier
                return (
                  <div
                    key={plan.tier}
                    className={cn(
                      'rounded-sm border p-4 flex items-center justify-between gap-4',
                      plan.popular && !isCurrent ? 'border-ocean-300 bg-ocean-50/30' : 'border-warm-200',
                      isCurrent && 'border-lime-300 bg-lime-50/30'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-warm-900">
                          {TIER_LABELS[plan.tier]}
                        </span>
                        {plan.popular && !isCurrent && (
                          <Badge className="bg-ocean-100 text-ocean-700 text-[10px] px-1.5 py-0">
                            Popular
                          </Badge>
                        )}
                        {isCurrent && (
                          <Badge className="bg-lime-100 text-lime-700 text-[10px] px-1.5 py-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-warm-500">{plan.description}</p>
                      <p className="text-xs text-warm-500 mt-0.5">
                        {plan.generations} generations/mo
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-warm-900">{plan.price}</p>
                      <p className="text-[10px] text-warm-400">/month</p>
                    </div>
                    {!isCurrent && (
                      <Button
                        size="sm"
                        className={cn(
                          'shrink-0',
                          plan.popular
                            ? 'bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700'
                            : ''
                        )}
                        variant={plan.popular ? 'default' : 'outline'}
                        onClick={() => handleUpgrade(plan.tier)}
                        disabled={upgradeLoading}
                      >
                        {upgradeLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Upgrade'
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Manage Billing (for paying customers) */}
        {usage?.hasStripeSubscription && !isPaused && (
          <div className="bg-white rounded-sm border border-warm-200 p-5">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              Manage Billing & Subscription
            </Button>
          </div>
        )}

        {/* Account Info */}
        {user && (
          <div className="bg-white rounded-sm border border-warm-200 p-5">
            <h2 className="text-sm font-medium text-warm-700 mb-4">Account Details</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-500">Name</span>
                <span className="text-warm-900 font-medium">{user.firstName} {user.lastName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-500">Email</span>
                <span className="text-warm-900">{user.email}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
