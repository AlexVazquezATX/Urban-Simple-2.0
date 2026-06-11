'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
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
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Analytics took the night off"
        description="We couldn't load outreach stats. Refresh to try again."
        className="py-20"
      />
    )
  }

  const { overview, rates, pipeline, sequences, steps } = stats
  const hasData = overview.sent > 0

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Sent" value={overview.sent} icon={Send} />
        <StatCard
          label="Delivered"
          value={overview.delivered}
          sub={`${rates.deliveryRate}% delivery`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Opened"
          value={overview.opened}
          sub={`${rates.openRate}% open rate`}
          icon={Eye}
        />
        <StatCard
          label="Clicked"
          value={overview.clicked}
          sub={`${rates.clickRate}% click rate`}
          icon={MousePointerClick}
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MiniStat label="Replied" value={overview.replied} rate={rates.replyRate} />
        <MiniStat label="Bounced" value={overview.bounced} rate={rates.bounceRate} warning={rates.bounceRate > 5} />
        <MiniStat label="Failed" value={overview.failed} warning={overview.failed > 0} />
        <MiniStat label="Pending Review" value={pipeline.pendingReview} />
        <MiniStat label="Ready to Send" value={pipeline.readyToSend} />
      </div>

      {/* Engagement details */}
      {hasData && overview.totalOpens > 0 && (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-bold text-foreground">Engagement</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{overview.totalOpens}</p>
                <p className="kicker mt-1 text-muted-foreground">Total opens</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">{overview.totalClicks}</p>
                <p className="kicker mt-1 text-muted-foreground">Total clicks</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {overview.opened > 0 ? (overview.totalOpens / overview.opened).toFixed(1) : '0'}
                </p>
                <p className="kicker mt-1 text-muted-foreground">Opens per recipient</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold tabular-nums text-foreground">
                  {overview.clicked > 0 ? (overview.totalClicks / overview.clicked).toFixed(1) : '0'}
                </p>
                <p className="kicker mt-1 text-muted-foreground">Clicks per clicker</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step-by-step performance */}
      {steps.length > 0 && (
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Inbox className="size-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-bold text-foreground">Performance by Step</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="kicker py-2 pr-4 text-left font-normal text-muted-foreground">Step</th>
                    <th className="kicker px-2 py-2 text-right font-normal text-muted-foreground">Sent</th>
                    <th className="kicker px-2 py-2 text-right font-normal text-muted-foreground">Delivered</th>
                    <th className="kicker px-2 py-2 text-right font-normal text-muted-foreground">Opened</th>
                    <th className="kicker px-2 py-2 text-right font-normal text-muted-foreground">Open Rate</th>
                    <th className="kicker px-2 py-2 text-right font-normal text-muted-foreground">Clicked</th>
                    <th className="kicker px-2 py-2 text-right font-normal text-muted-foreground">Replied</th>
                    <th className="kicker py-2 pl-2 text-right font-normal text-muted-foreground">Bounced</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s) => (
                    <tr key={s.step} className="border-b border-border">
                      <td className="py-2 pr-4 font-medium text-foreground">
                        Step {s.step}
                        {s.step === 1 && <span className="ml-1 text-muted-foreground">(First contact)</span>}
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">{s.sent}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">{s.delivered}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">{s.opened}</td>
                      <td className="px-2 py-2 text-right">
                        <RateBadge value={s.openRate} />
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">{s.clicked}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums text-foreground">{s.replied}</td>
                      <td className="py-2 pl-2 text-right font-mono tabular-nums text-foreground">{s.bounced}</td>
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
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-bold text-foreground">Performance by Sequence</h3>
            </div>
            <div className="space-y-2">
              {sequences.map((seq) => (
                <div
                  key={seq.id}
                  className="rounded-[12px] border border-border p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{seq.name}</span>
                    <div className="flex items-center gap-3">
                      <RateBadge value={seq.openRate} label="open" />
                      <RateBadge value={seq.clickRate} label="click" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-mono text-[10px] tabular-nums text-muted-foreground">
                    <span>{seq.sent} sent</span>
                    <span>{seq.delivered} delivered</span>
                    <span>{seq.opened} opened</span>
                    <span>{seq.clicked} clicked</span>
                    <span>{seq.replied} replied</span>
                    {seq.bounced > 0 && (
                      <span className="text-coral-600 dark:text-coral-300">{seq.bounced} bounced</span>
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
        <Card>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <Send className="size-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-bold text-foreground">Daily Send Volume (Last 30 Days)</h3>
            </div>
            <div className="flex h-24 items-end gap-[2px]">
              {stats.dailyVolume.map((d) => {
                const max = Math.max(...stats.dailyVolume.map((v) => v.count), 1)
                const height = Math.max((d.count / max) * 100, 4)
                return (
                  <div
                    key={d.date}
                    className="group relative flex-1 rounded-t-[2px] bg-gold-600 transition-all hover:bg-gold-500 dark:bg-gold-400 dark:hover:bg-gold-300"
                    style={{ height: `${height}%` }}
                    title={`${d.date}: ${d.count} sent`}
                  />
                )
              })}
            </div>
            <div className="mt-1 flex justify-between">
              <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{stats.dailyVolume[0]?.date}</span>
              <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{stats.dailyVolume[stats.dailyVolume.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {!hasData && (
        <Card>
          <CardContent>
            <EmptyState
              icon={BarChart3}
              title="No sends to chart yet"
              description="Analytics will populate once you start sending emails."
            />
          </CardContent>
        </Card>
      )}
    </div>
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
    <div
      className={`rounded-[12px] border p-2.5 ${
        warning
          ? 'border-coral-600/30 bg-coral-600/10 dark:border-coral-300/25 dark:bg-coral-300/12'
          : 'border-border bg-card'
      }`}
    >
      <div className="flex items-center gap-1.5">
        {warning && <AlertTriangle className="size-3 text-coral-600 dark:text-coral-300" />}
        <span className="kicker text-muted-foreground">{label}</span>
      </div>
      <p
        className={`font-display text-lg font-bold tabular-nums ${
          warning ? 'text-coral-600 dark:text-coral-300' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {rate !== undefined && (
        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">{rate}%</p>
      )}
    </div>
  )
}

function RateBadge({ value, label }: { value: number; label?: string }) {
  const variant = value >= 40 ? 'green' : value >= 20 ? 'gold' : value > 0 ? 'coral' : 'neutral'

  return (
    <Badge variant={variant} className="font-mono tabular-nums">
      {value}%{label ? ` ${label}` : ''}
    </Badge>
  )
}
