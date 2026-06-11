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
  Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
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
  isComplementary: boolean
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
  { value: 'TRIAL', label: 'Free', limit: 10, rate: 0 },
  { value: 'STARTER', label: 'Starter', limit: 100, rate: 29 },
  { value: 'PROFESSIONAL', label: 'Pro', limit: 300, rate: 59 },
  { value: 'ENTERPRISE', label: 'Max', limit: 1000, rate: 99 },
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
  const [isComplementary, setIsComplementary] = useState(false)

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
        setIsComplementary(data.client.isComplementary || false)
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
          isComplementary,
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
              isComplementary: data.client.isComplementary,
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
      generationsLimit !== client.generationsLimit ||
      isComplementary !== (client.isComplementary || false))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!client) {
    return (
      <EmptyState
        icon={Building2}
        title="Client not found"
        description="This studio client may have been removed."
        action={
          <Button asChild variant="outline">
            <Link href="/admin/studio-clients">
              <ArrowLeft className="size-4" />
              Back to Clients
            </Link>
          </Button>
        }
        className="py-24"
      />
    )
  }

  const overLimit = client.generationsUsed > client.generationsLimit

  return (
    <div>
      <PageHeader
        kicker="STUDIO · BACKHAUS"
        backHref="/admin/studio-clients"
        title={
          <span className="inline-flex items-center gap-3">
            {client.restaurantName || client.companyName}
            {client.isComplementary && (
              <Badge variant="teal">
                <Gift />
                Comp
              </Badge>
            )}
          </span>
        }
        subtitle={client.restaurantName ? client.companyName : undefined}
        actions={
          <Button variant="gold" onClick={handleSave} disabled={!hasChanges || saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Changes
              </>
            )}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details & Settings */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Info */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {client.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="size-4 text-muted-foreground" />
                    <a
                      href={`mailto:${client.email}`}
                      className="text-foreground transition-colors hover:text-primary"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-muted-foreground" />
                    <a
                      href={`tel:${client.phone}`}
                      className="text-foreground transition-colors hover:text-primary"
                    >
                      {client.phone}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Joined {new Date(client.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {client.trialEndsAt && (
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="size-4 text-gold-600 dark:text-gold-400" />
                    <span className="text-gold-600 dark:text-gold-400">
                      Trial ends {new Date(client.trialEndsAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Settings */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Subscription Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="planTier">Plan Tier</Label>
                  <Select
                    value={planTier}
                    onValueChange={(value) => {
                      setPlanTier(value)
                      const plan = PLAN_OPTIONS.find((p) => p.value === value)
                      if (plan) setGenerationsLimit(plan.limit)
                    }}
                  >
                    <SelectTrigger id="planTier" className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((plan) => (
                        <SelectItem key={plan.value} value={plan.value}>
                          {plan.label} (${plan.rate}/mo)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status" className="mt-1.5 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="limit">
                    {planTier === 'TRIAL' ? 'Total' : 'Monthly'} Generation Limit
                  </Label>
                  <Input
                    id="limit"
                    type="number"
                    value={generationsLimit}
                    onChange={(e) => setGenerationsLimit(parseInt(e.target.value) || 0)}
                    className="mt-1.5 font-mono tabular-nums"
                  />
                </div>

                <div className="mt-2 border-t border-border pt-3 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="size-4 text-teal-600 dark:text-teal-300" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Complementary Access
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Grant free Pro tier access (bypasses Stripe billing)
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isComplementary}
                      onCheckedChange={(checked) => {
                        setIsComplementary(checked)
                        if (checked) {
                          setPlanTier('PROFESSIONAL')
                          setGenerationsLimit(200)
                          setStatus('active')
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Content */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Recent Content</CardTitle>
            </CardHeader>
            <CardContent>
              {client.recentContent.length > 0 ? (
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {client.recentContent.map((content) => (
                    <div
                      key={content.id}
                      className="aspect-square overflow-hidden rounded-[10px] bg-secondary"
                    >
                      {content.generatedImageUrl ? (
                        <img
                          src={content.generatedImageUrl}
                          alt="Generated"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="size-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ImageIcon}
                  title="No content yet"
                  description="Generated images will show up here once this client starts creating."
                  className="py-6"
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Usage Stats */}
        <div className="space-y-6">
          {/* Usage Card */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>
                {client.planTier === 'TRIAL' ? 'Usage (Lifetime)' : 'Usage This Month'}
              </CardTitle>
              <CardAction>
                <Badge variant={overLimit ? 'coral' : 'neutral'}>
                  <span className="font-mono tabular-nums">{client.usagePercent}%</span>
                </Badge>
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Generations</span>
                    <span
                      className={cn(
                        'font-mono font-medium tabular-nums',
                        overLimit ? 'text-coral-600 dark:text-coral-300' : 'text-foreground'
                      )}
                    >
                      {client.generationsUsed} / {client.generationsLimit}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        overLimit
                          ? 'bg-coral-600 dark:bg-coral-300'
                          : 'bg-gold-600 dark:bg-gold-400'
                      )}
                      style={{ width: `${Math.min(client.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-mono tabular-nums text-foreground">
                      {Math.max(0, client.generationsLimit - client.generationsUsed)} generations
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage History Mini Chart */}
          {client.usageHistory.length > 0 && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-20 items-end gap-1">
                  {client.usageHistory.slice(-14).map((day) => {
                    const max = Math.max(...client.usageHistory.map((d) => d.count))
                    const height = max > 0 ? (day.count / max) * 100 : 0
                    return (
                      <div
                        key={day.date}
                        className="min-h-[4px] flex-1 rounded-[5px] bg-gold-600 dark:bg-gold-400"
                        style={{ height: `${height}%` }}
                        title={`${day.date}: ${day.count} generations`}
                      />
                    )
                  })}
                </div>
                <p className="kicker mt-3 text-center text-muted-foreground">Last 14 days</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Mail className="size-4" />
                  Send Usage Report
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <TrendingUp className="size-4" />
                  Upgrade Plan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
