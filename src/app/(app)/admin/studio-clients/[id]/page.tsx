'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  TrendingUp,
  Save,
  Loader2,
  ImageIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ClientDetail {
  id: string
  companyId: string
  companyName: string
  restaurantName?: string
  email?: string
  phone?: string
  planTier: string
  status: string
  generationsUsed: number
  generationsLimit: number
  usagePercent: number
  monthlyRate?: number
  trialEndsAt?: string
  onboardedAt?: string
  lastActivity?: string
  createdAt: string
  usageHistory: { date: string; count: number }[]
  recentContent: {
    id: string
    mode: string
    generatedImageUrl?: string
    createdAt: string
  }[]
}

const PLAN_OPTIONS = [
  { value: 'TRIAL', label: 'Trial', limit: 10, rate: 0 },
  { value: 'STARTER', label: 'Starter', limit: 50, rate: 29 },
  { value: 'PROFESSIONAL', label: 'Professional', limit: 200, rate: 79 },
  { value: 'ENTERPRISE', label: 'Max', limit: 99999, rate: 149 },
]

const STATUS_OPTIONS = ['active', 'paused', 'cancelled', 'expired']

export default function StudioClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [planTier, setPlanTier] = useState('')
  const [status, setStatus] = useState('')
  const [generationsLimit, setGenerationsLimit] = useState(0)

  useEffect(() => {
    loadClient()
  }, [id])

  async function loadClient() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/studio-clients/${id}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data.client)
        setPlanTier(data.client.planTier)
        setStatus(data.client.status)
        setGenerationsLimit(data.client.generationsLimit)
      }
    } catch (error) {
      console.error('Failed to load client:', error)
      toast.error('Failed to load client')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!client) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/studio-clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          status,
          monthlyGenerationsLimit: generationsLimit,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      const data = await response.json()
      setClient((prev) =>
        prev
          ? {
              ...prev,
              planTier: data.client.planTier,
              status: data.client.status,
              generationsLimit: data.client.generationsLimit,
            }
          : null
      )
      toast.success('Client updated successfully!')
    } catch (error) {
      toast.error('Failed to update client')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges =
    client &&
    (planTier !== client.planTier ||
      status !== client.status ||
      generationsLimit !== client.generationsLimit)

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-warm-600 mb-4">Client not found</p>
          <Link href="/admin/studio-clients">
            <Button variant="outline" className="rounded-sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/studio-clients"
                className="p-2 hover:bg-warm-100 rounded-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-warm-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-warm-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-warm-500" />
                </div>
                <div>
                  <h1 className="text-lg font-display font-medium text-warm-900">
                    {client.restaurantName || client.companyName}
                  </h1>
                  {client.restaurantName && (
                    <p className="text-sm text-warm-500">{client.companyName}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="lime"
              size="sm"
              className="rounded-sm"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Details & Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <h2 className="text-sm font-medium text-warm-900 mb-4">Contact Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-warm-400" />
                    <a href={`mailto:${client.email}`} className="text-warm-700 hover:text-warm-900">
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-warm-400" />
                    <a href={`tel:${client.phone}`} className="text-warm-700 hover:text-warm-900">
                      {client.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-warm-400" />
                  <span className="text-warm-600">
                    Joined {new Date(client.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {client.trialEndsAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-700">
                      Trial ends {new Date(client.trialEndsAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Settings */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <h2 className="text-sm font-medium text-warm-900 mb-4">Subscription Settings</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="planTier" className="text-warm-600 text-xs">
                    Plan Tier
                  </Label>
                  <select
                    id="planTier"
                    value={planTier}
                    onChange={(e) => {
                      setPlanTier(e.target.value)
                      const plan = PLAN_OPTIONS.find((p) => p.value === e.target.value)
                      if (plan) setGenerationsLimit(plan.limit)
                    }}
                    className="w-full mt-1.5 px-3 py-2 rounded-sm border border-warm-300 bg-white text-sm"
                  >
                    {PLAN_OPTIONS.map((plan) => (
                      <option key={plan.value} value={plan.value}>
                        {plan.label} (${plan.rate}/mo)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-warm-600 text-xs">
                    Status
                  </Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full mt-1.5 px-3 py-2 rounded-sm border border-warm-300 bg-white text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="limit" className="text-warm-600 text-xs">
                    Monthly Generation Limit
                  </Label>
                  <input
                    id="limit"
                    type="number"
                    value={generationsLimit}
                    onChange={(e) => setGenerationsLimit(parseInt(e.target.value) || 0)}
                    className="w-full mt-1.5 px-3 py-2 rounded-sm border border-warm-300 bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Recent Content */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <h2 className="text-sm font-medium text-warm-900 mb-4">Recent Content</h2>
              {client.recentContent.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {client.recentContent.map((content) => (
                    <div
                      key={content.id}
                      className="aspect-square rounded-sm bg-warm-100 overflow-hidden"
                    >
                      {content.generatedImageUrl ? (
                        <img
                          src={content.generatedImageUrl}
                          alt="Generated"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-warm-300" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-warm-500">No content generated yet</p>
              )}
            </div>
          </div>

          {/* Right Column - Usage Stats */}
          <div className="space-y-6">
            {/* Usage Card */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-warm-900">Usage This Month</h2>
                <Badge
                  className={cn(
                    'text-xs rounded-sm',
                    client.usagePercent >= 90
                      ? 'bg-red-100 text-red-700'
                      : client.usagePercent >= 70
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                  )}
                >
                  {client.usagePercent}%
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-warm-600">Generations</span>
                    <span className="font-medium text-warm-900">
                      {client.generationsUsed} / {client.generationsLimit}
                    </span>
                  </div>
                  <div className="h-3 bg-warm-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        client.usagePercent >= 90
                          ? 'bg-red-500'
                          : client.usagePercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-lime-500'
                      )}
                      style={{ width: `${Math.min(client.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-warm-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-warm-500">Remaining</span>
                    <span className="text-warm-900">
                      {Math.max(0, client.generationsLimit - client.generationsUsed)} generations
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Usage History Mini Chart */}
            {client.usageHistory.length > 0 && (
              <div className="bg-white rounded-sm border border-warm-200 p-5">
                <h2 className="text-sm font-medium text-warm-900 mb-4">Recent Activity</h2>
                <div className="flex items-end gap-1 h-20">
                  {client.usageHistory.slice(-14).map((day, i) => {
                    const max = Math.max(...client.usageHistory.map((d) => d.count))
                    const height = max > 0 ? (day.count / max) * 100 : 0
                    return (
                      <div
                        key={day.date}
                        className="flex-1 bg-lime-500 rounded-sm min-h-[4px]"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${day.count} generations`}
                      />
                    )
                  })}
                </div>
                <p className="text-xs text-warm-500 mt-2 text-center">Last 14 days</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <h2 className="text-sm font-medium text-warm-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full rounded-sm justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Usage Report
                </Button>
                <Button variant="outline" size="sm" className="w-full rounded-sm justify-start">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
