'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Moon,
  Camera,
  Flag,
  ShieldAlert,
  CalendarDays,
  ClipboardList,
  Route,
  ChevronRight,
  Loader2,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { TonightsOperations } from '@/components/dashboard/tonights-operations'
import { cn } from '@/lib/utils'

interface LastNightPhoto {
  id: string
  url: string
  locationName: string
  clientName: string
  associateName: string
  rating: number
  reviewDate: string
}

type AttentionType = 'quality_issue' | 'open_issue' | 'unassigned_shift' | 'crew_hours'

interface AttentionItem {
  id: string
  type: AttentionType
  title: string
  subtitle: string
  urgency: 'high' | 'medium' | 'low'
  actionUrl: string
}

interface Overview {
  tonight: { shifts: number; crew: number }
  lastNightPhotos: LastNightPhoto[]
  attention: AttentionItem[]
  counts: { qualityIssues: number; openIssues: number; unassignedShifts: number }
}

interface WorkforceAssoc {
  hoursStatus: 'safe' | 'watch' | 'warning' | 'danger'
}

const attentionConfig: Record<
  AttentionType,
  { icon: typeof Flag; tone: 'coral' | 'gold' | 'teal'; cta: string }
> = {
  quality_issue: { icon: Flag, tone: 'coral', cta: 'Review' },
  open_issue: { icon: Flag, tone: 'coral', cta: 'Open' },
  unassigned_shift: { icon: CalendarDays, tone: 'gold', cta: 'Assign' },
  crew_hours: { icon: ShieldAlert, tone: 'gold', cta: 'Check hours' },
}

const toneClasses: Record<'coral' | 'gold' | 'teal', { tile: string; icon: string; cta: string }> = {
  coral: {
    tile: 'bg-coral-600/10 dark:bg-coral-300/12',
    icon: 'text-coral-600 dark:text-coral-300',
    cta: 'text-coral-600 dark:text-coral-300',
  },
  gold: {
    tile: 'bg-gold-600/10 dark:bg-gold-400/12',
    icon: 'text-gold-600 dark:text-gold-400',
    cta: 'text-gold-600 dark:text-gold-400',
  },
  teal: {
    tile: 'bg-teal-600/10 dark:bg-teal-300/12',
    icon: 'text-teal-600 dark:text-teal-300',
    cta: 'text-teal-600 dark:text-teal-300',
  },
}

export function ManagerDashboard({
  userName,
  greeting,
  dateKicker,
}: {
  userName: string
  greeting: string
  dateKicker: string
}) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [crewNearOver, setCrewNearOver] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/operations/manager-overview').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/operations/workforce').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([ov, workforce]) => {
        if (!active) return
        setOverview(ov)
        if (Array.isArray(workforce)) {
          setCrewNearOver(
            (workforce as WorkforceAssoc[]).filter(
              (a) => a.hoursStatus === 'warning' || a.hoursStatus === 'danger'
            ).length
          )
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Surface overtime risk at the top of the rail — this is the compliance
  // safety net managers own.
  const attention: AttentionItem[] = [
    ...(crewNearOver > 0
      ? [
          {
            id: 'crew-hours',
            type: 'crew_hours' as const,
            title: `${crewNearOver} ${crewNearOver === 1 ? 'associate is' : 'associates are'} near or over 40h`,
            subtitle: 'Check the workforce board before assigning more',
            urgency: 'high' as const,
            actionUrl: '/operations/workforce',
          },
        ]
      : []),
    ...(overview?.attention ?? []),
  ]

  const tonight = overview?.tonight
  const photos = overview?.lastNightPhotos ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        kicker={dateKicker}
        title={`${greeting}, ${userName}`}
        subtitle="Here's the floor tonight — what's running, what got done, and what needs you."
      />

      {/* Warm status tiles — pastel in light, dim-tinted in dark */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          tone="sage"
          icon={Moon}
          kicker="Tonight"
          value={loading ? '·' : `${tonight?.shifts ?? 0} ${tonight?.shifts === 1 ? 'shift' : 'shifts'}`}
          sub={loading ? 'Loading…' : `${tonight?.crew ?? 0} on the crew`}
        />
        <Tile
          tone="sky"
          icon={Camera}
          kicker="Last night"
          value={loading ? '·' : `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}
          sub="Proof from the floor"
        />
        <Tile
          tone={attention.length > 0 ? 'peach' : 'sage'}
          icon={Flag}
          kicker="Needs you"
          value={loading ? '·' : attention.length === 0 ? 'All clear' : `${attention.length} ${attention.length === 1 ? 'item' : 'items'}`}
          sub={attention.length === 0 ? 'Nothing waiting' : 'Tap to review below'}
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <TonightsOperations />

          {/* Last night, in proof */}
          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-3">
              <div className="flex items-center gap-2.5">
                <Camera className="size-4 shrink-0 text-gold-600 dark:text-gold-400" />
                <CardTitle>Last night, in proof</CardTitle>
                <span className="flex-1" />
                <Link
                  href="/operations/nightly-reviews"
                  className="text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  See the log →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-5">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : photos.length === 0 ? (
                <EmptyState
                  icon={Camera}
                  title="Nothing logged yet — quiet so far"
                  description="Review photos from tonight's crews land here as they finish."
                  className="py-6"
                />
              ) : (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="group relative aspect-[4/3] overflow-hidden rounded-[10px] border border-border bg-secondary"
                    >
                      <Image
                        src={p.url}
                        alt={`${p.locationName} — ${p.associateName}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/75 to-transparent px-2 pb-1.5 pt-5">
                        <p className="truncate text-[11px] font-semibold text-cream-50">{p.locationName}</p>
                        <p className="flex items-center gap-1 text-[10px] text-cream-50/80">
                          <Star className="size-2.5 fill-gold-400 text-gold-400" />
                          {p.rating.toFixed(1)} · {p.associateName}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-4">
          {/* Needs you */}
          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-2">
              <div className="flex items-center gap-2.5">
                <Flag className="size-4 shrink-0 text-coral-600 dark:text-coral-300" />
                <CardTitle>Needs you</CardTitle>
                <span className="flex-1" />
                {!loading && attention.length > 0 && (
                  <Badge variant="coral">{attention.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-5">
              {loading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : attention.length === 0 ? (
                <EmptyState
                  icon={Flag}
                  title="All clear — nice and tidy"
                  description="Nothing needs your attention right now."
                  className="py-6"
                />
              ) : (
                <div className="flex flex-col">
                  {attention.slice(0, 7).map((item) => {
                    const cfg = attentionConfig[item.type]
                    const tc = toneClasses[cfg.tone]
                    const Icon = cfg.icon
                    return (
                      <Link
                        key={item.id}
                        href={item.actionUrl}
                        className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0"
                      >
                        <div className={cn('grid size-8 shrink-0 place-items-center rounded-[9px]', tc.tile)}>
                          <Icon className={cn('size-4', tc.icon)} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-foreground">{item.title}</p>
                          <p className="truncate text-[11.5px] text-muted-foreground">{item.subtitle}</p>
                        </div>
                        <span className={cn('shrink-0 text-[12px] font-semibold', tc.cta)}>{cfg.cta}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-3">
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <div className="grid grid-cols-2 gap-2.5">
                <QuickAction icon={Route} label="Dispatch" href="/operations/schedule" />
                <QuickAction icon={CalendarDays} label="Schedule" href="/operations/schedule" />
                <QuickAction icon={Moon} label="Review queue" href="/operations/nightly-reviews" />
                <QuickAction icon={ClipboardList} label="Checklists" href="/operations/checklists" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Tile({
  tone,
  icon: Icon,
  kicker,
  value,
  sub,
}: {
  tone: 'sage' | 'sky' | 'peach'
  icon: typeof Moon
  kicker: string
  value: string
  sub: string
}) {
  // Portal pastel in light mode; tasteful dim-tint in dark (managers work nights).
  const tones = {
    sage: 'bg-sage-bg border-sage-line text-sage-deep dark:bg-green-300/10 dark:border-green-300/20 dark:text-green-300',
    sky: 'bg-sky-bg border-sky-line text-sky-deep dark:bg-teal-300/10 dark:border-teal-300/20 dark:text-teal-300',
    peach: 'bg-peach-bg border-peach-line text-peach-deep dark:bg-coral-300/10 dark:border-coral-300/20 dark:text-coral-300',
  }
  return (
    <div className={cn('rounded-[14px] border p-4', tones[tone])}>
      <div className="flex items-center justify-between">
        <span className="kicker opacity-75">{kicker}</span>
        <Icon className="size-4 opacity-70" />
      </div>
      <p className="mt-2 font-display text-2xl font-bold leading-none tracking-[-0.5px]">{value}</p>
      <p className="mt-1.5 text-xs opacity-85">{sub}</p>
    </div>
  )
}

function QuickAction({ icon: Icon, label, href }: { icon: typeof Moon; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-2 rounded-[11px] border border-border bg-secondary/40 p-3 transition-colors hover:border-primary/40 hover:bg-secondary/70"
    >
      <Icon className="size-4 text-gold-600 dark:text-gold-400" />
      <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
        {label}
        <ChevronRight className="size-3 text-muted-foreground" />
      </span>
    </Link>
  )
}
