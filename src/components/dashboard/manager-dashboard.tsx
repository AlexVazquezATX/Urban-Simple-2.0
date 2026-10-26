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
  ClipboardX,
  Route,
  ChevronRight,
  Clock,
  Loader2,
  MessageSquare,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { TonightsOperations } from '@/components/dashboard/tonights-operations'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import { localeFor, type ManagerStrings } from '@/lib/i18n/manager'
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

type AttentionType =
  | 'quality_issue'
  | 'open_issue'
  | 'unassigned_shift'
  | 'crew_hours'
  | 'unfinished_work'
  | 'client_report'
  | 'client_request'
  | 'low_rating'
  | 'long_shift'

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
  counts: {
    qualityIssues: number
    openIssues: number
    unfinishedWork?: number
    clientItems?: number
    lowRatings?: number
    longShifts?: number
    unassignedShifts: number
  }
}

interface WorkforceAssoc {
  hoursStatus: 'safe' | 'watch' | 'warning' | 'danger'
}

const attentionConfig: Record<
  AttentionType,
  { icon: typeof Flag; tone: 'coral' | 'gold' | 'teal'; cta: keyof ManagerStrings['dash']['cta'] }
> = {
  quality_issue: { icon: Flag, tone: 'coral', cta: 'review' },
  open_issue: { icon: Flag, tone: 'coral', cta: 'open' },
  unassigned_shift: { icon: CalendarDays, tone: 'gold', cta: 'assign' },
  crew_hours: { icon: ShieldAlert, tone: 'gold', cta: 'checkHours' },
  unfinished_work: { icon: ClipboardList, tone: 'coral', cta: 'open' },
  client_report: { icon: MessageSquare, tone: 'coral', cta: 'open' },
  client_request: { icon: MessageSquare, tone: 'teal', cta: 'open' },
  low_rating: { icon: Star, tone: 'gold', cta: 'view' },
  long_shift: { icon: Clock, tone: 'coral', cta: 'check' },
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
  const { lang, t } = useManagerLang()
  const d = t.dash

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
            title: d.crewHoursTitle(crewNearOver),
            subtitle: d.crewHoursSub,
            urgency: 'high' as const,
            actionUrl: '/operations/workforce',
          },
        ]
      : []),
    ...(overview?.attention ?? []),
  ]

  const tonight = overview?.tonight
  const photos = overview?.lastNightPhotos ?? []

  // The kicker arrives preformatted in English; rebuild it for Spanish.
  const kicker =
    lang === 'en'
      ? dateKicker
      : (() => {
          const now = new Date()
          const locale = localeFor(lang)
          return `${now.toLocaleDateString(locale, { weekday: 'long' })} · ${now.toLocaleDateString(locale, { month: 'long', day: 'numeric' })}`
        })()

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        kicker={kicker}
        title={`${d.greeting(greeting)}, ${userName}`}
        subtitle={d.subtitle}
        actions={
          <>
            <LanguageToggle />
            <Link
              href="/operations/issues?log=unfinished"
              className="inline-flex h-9 items-center gap-2 rounded-[9px] border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-secondary/60"
            >
              <ClipboardX className="size-4" />
              {t.newIssue.unfinishedTitle}
            </Link>
          </>
        }
      />

      {/* Warm status tiles — pastel in light, dim-tinted in dark */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile
          tone="sage"
          icon={Moon}
          kicker={d.tonight}
          value={loading ? '·' : d.shifts(tonight?.shifts ?? 0)}
          sub={loading ? t.common.loading : d.onCrew(tonight?.crew ?? 0)}
        />
        <Tile
          tone="sky"
          icon={Camera}
          kicker={d.lastNight}
          value={loading ? '·' : d.photos(photos.length)}
          sub={d.proof}
        />
        <Tile
          tone={attention.length > 0 ? 'peach' : 'sage'}
          icon={Flag}
          kicker={d.needsYou}
          value={loading ? '·' : attention.length === 0 ? d.allClear : d.items(attention.length)}
          sub={attention.length === 0 ? d.nothingWaiting : d.tapToReview}
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
                <CardTitle>{d.lastNightTitle}</CardTitle>
                <span className="flex-1" />
                <Link
                  href="/operations/nightly-reviews"
                  className="text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {d.seeLog}
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
                  title={d.noPhotosTitle}
                  description={d.noPhotosBody}
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
                <CardTitle>{d.needsYou}</CardTitle>
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
                  title={d.allClearTitle}
                  description={d.allClearBody}
                  className="py-6"
                />
              ) : (
                <div className="flex flex-col">
                  {attention.slice(0, 8).map((item) => {
                    const cfg = attentionConfig[item.type] ?? attentionConfig.open_issue
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
                        <span className={cn('shrink-0 text-[12px] font-semibold', tc.cta)}>{d.cta[cfg.cta]}</span>
                      </Link>
                    )
                  })}
                  {attention.length > 8 && (
                    <Link
                      href="/operations/issues"
                      className="pt-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {d.more(attention.length - 8)}
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="gap-0 py-5">
            <CardHeader className="px-5 pb-3">
              <CardTitle>{d.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="px-5">
              <div className="grid grid-cols-2 gap-2.5">
                <QuickAction icon={Route} label={d.dispatch} href="/operations/schedule" />
                <QuickAction icon={CalendarDays} label={d.schedule} href="/operations/schedule" />
                <QuickAction icon={Moon} label={d.reviewQueue} href="/operations/nightly-reviews" />
                <QuickAction icon={ClipboardList} label={d.checklists} href="/operations/checklists" />
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
