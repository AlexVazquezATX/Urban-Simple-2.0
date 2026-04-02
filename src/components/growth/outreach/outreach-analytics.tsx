'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  Loader2,
  TrendingUp,
  BarChart3,
  Inbox,
} from 'lucide-react'

interface StatsData {
  overview: {
    total: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    bounced: number
    failed: number
    totalOpens: number
    totalClicks: number
  }
  rates: {
    deliveryRate: number
    openRate: number
    clickRate: number
    replyRate: number
    bounceRate: number
  }
  pipeline: {
    pendingReview: number
    readyToSend: number
  }
  sequences: Array<{
    id: string
    name: string
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    bounced: number
    openRate: number
    clickRate: number
  }>
  steps: Array<{
    step: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    replied: number
    bounced: number
    openRate: number
  }>
  dailyVolume: Array<{
    date: string
    count: number
  }>
}

export function OutreachAnalytics() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/growth/outreach/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      console.error('Failed to load outreach stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-warm-400 dark:text-cream-500" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="h-10 w-10 mx-auto text-warm-300 dark:text-charcoal-500 mb-3" />
        <p className="text-sm text-warm-500 dark:text-cream-400">Unable to load analytics</p>
      </div>
    )
  }

  const { overview, rates, pipeline, sequences, steps } = stats
  const hasData = overview.sent > 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="Sent"
          value={overview.sent}
          icon={<Send className="h-4 w-4 text-ocean-500" />}
          color="ocean"
        />
        <KPICard
          label="Delivered"
          value={overview.delivered}
          rate={rates.deliveryRate}
          rateLabel="delivery"
          icon={<CheckCircle2 className="h-4 w-4 text-lime-600" />}
          color="lime"
        />
        <KPICard
          label="Opened"
          value={overview.opened}
          rate={rates.openRate}
          rateLabel="open rate"
          icon={<Eye className="h-4 w-4 text-plum-500" />}
          color="plum"
        />
        <KPICard
          label="Clicked"
          value={overview.clicked}
          rate={rates.clickRate}
          rateLabel="click rate"
          icon={<MousePointerClick className="h-4 w-4 text-amber-500" />}
          color="amber"
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniStat label="Replied" value={overview.replied} rate={rates.replyRate} />
        <MiniStat label="Bounced" value={overview.bounced} rate={rates.bounceRate} warning={rates.bounceRate > 5} />
        <MiniStat label="Failed" value={overview.failed} warning={overview.failed > 0} />
        <MiniStat label="Pending Review" value={pipeline.pendingReview} />
        <MiniStat label="Ready to Send" value={pipeline.readyToSend} />
      </div>

      {/* Engagement details */}
      {hasData && overview.totalOpens > 0 && (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-plum-500" />
              <h3 className="text-sm font-medium text-warm-900 dark:text-cream-100">Engagement</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{overview.totalOpens}</p>
                <p className="text-[10px] text-warm-500 dark:text-cream-400 uppercase tracking-wide">Total opens</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{overview.totalClicks}</p>
                <p className="text-[10px] text-warm-500 dark:text-cream-400 uppercase tracking-wide">Total clicks</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">
                  {overview.opened > 0 ? (overview.totalOpens / overview.opened).toFixed(1) : '0'}
                </p>
                <p className="text-[10px] text-warm-500 dark:text-cream-400 uppercase tracking-wide">Opens per recipient</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">
                  {overview.clicked > 0 ? (overview.totalClicks / overview.clicked).toFixed(1) : '0'}
                </p>
                <p className="text-[10px] text-warm-500 dark:text-cream-400 uppercase tracking-wide">Clicks per clicker</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step-by-step performance */}
      {steps.length > 0 && (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="h-4 w-4 text-ocean-500" />
              <h3 className="text-sm font-medium text-warm-900 dark:text-cream-100">Performance by Step</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-warm-200 dark:border-charcoal-700">
                    <th className="text-left py-2 pr-4 text-warm-500 dark:text-cream-400 font-medium">Step</th>
                    <th className="text-right py-2 px-2 text-warm-500 dark:text-cream-400 font-medium">Sent</th>
                    <th className="text-right py-2 px-2 text-warm-500 dark:text-cream-400 font-medium">Delivered</th>
                    <th className="text-right py-2 px-2 text-warm-500 dark:text-cream-400 font-medium">Opened</th>
                    <th className="text-right py-2 px-2 text-warm-500 dark:text-cream-400 font-medium">Open Rate</th>
                    <th className="text-right py-2 px-2 text-warm-500 dark:text-cream-400 font-medium">Clicked</th>
                    <th className="text-right py-2 px-2 text-warm-500 dark:text-cream-400 font-medium">Replied</th>
                    <th className="text-right py-2 pl-2 text-warm-500 dark:text-cream-400 font-medium">Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s) => (
                    <tr key={s.step} className="border-b border-warm-100 dark:border-charcoal-700">
                      <td className="py-2 pr-4 text-warm-900 dark:text-cream-100 font-medium">
                        Step {s.step}
                        {s.step === 1 && <span className="text-warm-400 dark:text-cream-500 ml-1">(First contact)</span>}
                      </td>
                      <td className="text-right py-2 px-2 text-warm-700 dark:text-cream-300">{s.sent}</td>
                      <td className="text-right py-2 px-2 text-warm-700 dark:text-cream-300">{s.delivered}</td>
                      <td className="text-right py-2 px-2 text-warm-700 dark:text-cream-300">{s.opened}</td>
                      <td className="text-right py-2 px-2">
                        <RateBadge value={s.openRate} />
                      </td>
                      <td className="text-right py-2 px-2 text-warm-700 dark:text-cream-300">{s.clicked}</td>
                      <td className="text-right py-2 px-2 text-warm-700 dark:text-cream-300">{s.replied}</td>
                      <td className="text-right py-2 pl-2 text-warm-700 dark:text-cream-300">{s.bounced}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-sequence breakdown */}
      {sequences.length > 0 && (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-plum-500" />
              <h3 className="text-sm font-medium text-warm-900 dark:text-cream-100">Performance by Sequence</h3>
            </div>
            <div className="space-y-2">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-warm-900 dark:text-cream-100">{seq.name}</span>
                    <div className="flex items-center gap-3">
                      <RateBadge value={seq.openRate} label="open" />
                      <RateBadge value={seq.clickRate} label="click" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-warm-500 dark:text-cream-400">
                    <span>{seq.sent} sent</span>
                    <span>{seq.delivered} delivered</span>
                    <span>{seq.opened} opened</span>
                    <span>{seq.clicked} clicked</span>
                    <span>{seq.replied} replied</span>
                    {seq.bounced > 0 && (
                      <span className="text-red-500">{seq.bounced} bounced</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily volume */}
      {stats.dailyVolume.length > 0 && (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Send className="h-4 w-4 text-ocean-500" />
              <h3 className="text-sm font-medium text-warm-900 dark:text-cream-100">Daily Send Volume (Last 30 Days)</h3>
            </div>
            <div className="flex items-end gap-[2px] h-24">
              {stats.dailyVolume.map((d) => {
                const max = Math.max(...stats.dailyVolume.map((v) => v.count), 1)
                const height = Math.max((d.count / max) * 100, 4)
                return (
                  <div
                    key={d.date}
                    className="flex-1 bg-ocean-400 rounded-t-[1px] transition-all hover:bg-ocean-600 group relative"
                    style={{ height: `${height}%` }}
                    title={`${d.date}: ${d.count} sent`}
                  />
                )
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-warm-400 dark:text-cream-500">{stats.dailyVolume[0]?.date}</span>
              <span className="text-[9px] text-warm-400 dark:text-cream-500">{stats.dailyVolume[stats.dailyVolume.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!hasData && (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <div className="text-center py-10">
              <BarChart3 className="h-10 w-10 mx-auto text-warm-300 dark:text-charcoal-500 mb-3" />
              <p className="text-sm text-warm-500 dark:text-cream-400">No sent messages yet</p>
              <p className="text-xs text-warm-400 dark:text-cream-500 mt-1">
                Analytics will populate once you start sending emails
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function KPICard({
  label,
  value,
  rate,
  rateLabel,
  icon,
}: {
  label: string
  value: number
  rate?: number
  rateLabel?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-[10px] text-warm-500 dark:text-cream-400 uppercase tracking-wide">{label}</span>
        </div>
        <p className="text-2xl font-semibold text-warm-900 dark:text-cream-100">{value}</p>
        {rate !== undefined && (
          <p className="text-xs text-warm-500 dark:text-cream-400 mt-0.5">
            {rate}% {rateLabel}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function MiniStat({
  label,
  value,
  rate,
  warning,
}: {
  label: string
  value: number
  rate?: number
  warning?: boolean
}) {
  return (
    <div className={`rounded-sm border p-2.5 ${warning ? 'border-red-200 bg-red-50' : 'border-warm-200 dark:border-charcoal-700'}`}>
      <div className="flex items-center gap-1.5">
        {warning && <AlertTriangle className="h-3 w-3 text-red-500" />}
        <span className="text-[10px] text-warm-500 dark:text-cream-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${warning ? 'text-red-700' : 'text-warm-900 dark:text-cream-100'}`}>{value}</p>
      {rate !== undefined && (
        <p className="text-[10px] text-warm-500 dark:text-cream-400">{rate}%</p>
      )}
    </div>
  )
}

function RateBadge({ value, label }: { value: number; label?: string }) {
  const color =
    value >= 40
      ? 'bg-lime-100 text-lime-700 border-lime-200'
      : value >= 20
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : value > 0
          ? 'bg-red-100 text-red-700 border-red-200'
          : 'bg-warm-100 dark:bg-charcoal-800 text-warm-500 dark:text-cream-400 border-warm-200 dark:border-charcoal-700'

  return (
    <Badge className={`rounded-sm text-[10px] px-1.5 py-0 ${color}`}>
      {value}%{label ? ` ${label}` : ''}
    </Badge>
  )
}
