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
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Upgrade error:', error)
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
        body: JSON.stringify({ returnUrl: '/studio' }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Portal error:', error)
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

  // Determine next upgrade tier
  const nextTier =
    usage?.planTier === 'TRIAL' ? 'STARTER' :
    usage?.planTier === 'STARTER' ? 'PROFESSIONAL' :
    usage?.planTier === 'PROFESSIONAL' ? 'ENTERPRISE' :
    null

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
                {usage?.generationsUsed || 0} / {usage?.generationsLimit || 0} generations this month
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

        {/* Upgrade / Manage */}
        <div className="bg-white rounded-sm border border-warm-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-warm-500" />
            <h2 className="text-sm font-medium text-warm-700">Plan Management</h2>
          </div>

          <div className="space-y-3">
            {/* Upgrade button (only if not Max) */}
            {nextTier && !isPaused && (
              <Button
                className="w-full bg-gradient-to-br from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700"
                onClick={() => handleUpgrade(nextTier)}
                disabled={upgradeLoading}
              >
                {upgradeLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                )}
                Upgrade to {TIER_LABELS[nextTier]}
              </Button>
            )}

            {/* Manage Billing (for paying customers) */}
            {usage?.hasStripeSubscription && !isPaused && (
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
            )}

            {!usage?.hasStripeSubscription && usage?.planTier === 'TRIAL' && (
              <p className="text-sm text-warm-500 text-center">
                You&apos;re on the free plan. Upgrade to unlock more generations and features.
              </p>
            )}
          </div>
        </div>

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
