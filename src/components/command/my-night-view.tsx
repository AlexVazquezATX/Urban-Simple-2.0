'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { ReportProblemButton } from '@/components/field/report-problem-dialog'
import { FIELD_STRINGS, readStoredLang, storeLang, type FieldLang } from '@/lib/ops/field-i18n'
import { Clock, CheckCircle, Loader2, ClipboardList, ChevronRight, Moon, Sparkles, Languages, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface NightLocation {
  shiftId: string
  locationId: string
  locationName: string
  clientName: string
  address: any
  checklistId: string | null
  checklistName: string | null
  shiftTime: string
  status: string // pending, in_progress, completed, partial
  clockIn: string | null
  clockOut: string | null
  submittedAt: string | null
  notDoneCount: number
  serviceLogId: string | null
}

const statusVariant: Record<string, 'neutral' | 'teal' | 'green' | 'gold'> = {
  pending: 'neutral',
  in_progress: 'teal',
  completed: 'green',
  partial: 'gold',
}

export function MyNightView({
  userName,
  greeting = 'Good evening',
  dateKicker,
}: {
  userName: string
  greeting?: string
  dateKicker?: string
}) {
  const [locations, setLocations] = useState<NightLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftCount, setShiftCount] = useState(0)
  const [lang, setLang] = useState<FieldLang>('en')
  const langResolved = useRef(false)
  const t = FIELD_STRINGS[lang]

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/my-night')
      if (res.ok) {
        const data = await res.json()
        setLocations(data.locations)
        setShiftCount(data.shifts)
        // Profile language first, then whatever they toggled on this device.
        if (!langResolved.current) {
          langResolved.current = true
          setLang(readStoredLang(data.language))
        }
      }
    } catch (error) {
      console.error('Failed to fetch my night data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  function toggleLang() {
    const next = lang === 'en' ? 'es' : 'en'
    setLang(next)
    storeLang(next)
  }

  const doneCount = locations.filter(l => l.submittedAt).length
  const totalCount = locations.length
  const statusLabel: Record<string, string> = {
    pending: t.statusPending,
    in_progress: t.statusInProgress,
    completed: t.statusCompleted,
    partial: t.statusPartial,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-6 animate-spin" />
        {t.loading}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <PageHeader
          kicker={lang === 'es' ? t.tonightKicker : dateKicker ?? t.tonightKicker}
          title={lang === 'es' ? `Hola, ${userName}` : `${greeting}, ${userName}`}
          subtitle={
            shiftCount === 0
              ? t.offTonight
              : doneCount === totalCount
                ? t.allDone
                : t.stopsLeft(totalCount - doneCount)
          }
          actions={
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={toggleLang}>
              <Languages className="size-4" />
              {t.language}
            </Button>
          }
          className="mb-0"
        />

        {totalCount > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[14px] border border-sage-line bg-sage-bg p-4 text-sage-deep dark:border-green-300/20 dark:bg-green-300/10 dark:text-green-300">
              <div className="flex items-center justify-between">
                <span className="kicker opacity-75">{t.tonight}</span>
                <Moon className="size-4 opacity-70" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold leading-none tracking-[-0.5px]">
                {t.stops(totalCount)}
              </p>
              <p className="mt-1.5 text-xs opacity-85">{t.onYourRoute}</p>
            </div>
            <div className="rounded-[14px] border border-sky-line bg-sky-bg p-4 text-sky-deep dark:border-teal-300/20 dark:bg-teal-300/10 dark:text-teal-300">
              <div className="flex items-center justify-between">
                <span className="kicker opacity-75">{t.progress}</span>
                <Sparkles className="size-4 opacity-70" />
              </div>
              <p className="mt-2 font-display text-2xl font-bold leading-none tracking-[-0.5px]">
                {doneCount} {t.of} {totalCount}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-current transition-all duration-500"
                  style={{ width: `${(doneCount / totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState icon={Clock} title={t.noShifts} description={t.noShiftsHint} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {locations.map((loc, index) => {
            const isActive = loc.status === 'in_progress'
            const isDone = Boolean(loc.submittedAt)
            const href = `/field/visit/${loc.shiftId}/${loc.locationId}`

            return (
              <Card
                key={`${loc.shiftId}-${loc.locationId}`}
                className={cn(
                  'py-0 transition-all',
                  isActive &&
                    'border-teal-600/30 ring-1 ring-teal-600/30 dark:border-teal-300/25 dark:ring-teal-300/25',
                  isDone && 'border-green-600/30 opacity-80 dark:border-green-300/25'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold tabular-nums',
                          isDone
                            ? 'bg-green-600/12 text-green-600 dark:bg-green-300/12 dark:text-green-300'
                            : isActive
                              ? 'bg-teal-600/10 text-teal-600 dark:bg-teal-300/12 dark:text-teal-300'
                              : 'bg-secondary text-muted-foreground'
                        )}
                      >
                        {isDone ? <CheckCircle className="size-4" /> : index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{loc.locationName}</p>
                        <p className="text-sm text-muted-foreground">{loc.clientName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            <span className="font-mono tabular-nums">{loc.shiftTime}</span>
                          </span>
                          {loc.checklistName && (
                            <span className="flex items-center gap-1">
                              <ClipboardList className="size-3" />
                              {loc.checklistName}
                            </span>
                          )}
                          {loc.notDoneCount > 0 && (
                            <span className="flex items-center gap-1 text-gold-600 dark:text-gold-400">
                              <AlertTriangle className="size-3" />
                              {loc.notDoneCount} {t.notDone.toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge variant={statusVariant[loc.status] ?? 'neutral'} className="ml-2 shrink-0">
                      {statusLabel[loc.status] ?? t.statusPending}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row">
                    <Button variant={isDone ? 'outline' : 'gold'} className="h-11 flex-1 gap-1.5" asChild>
                      <Link href={href}>
                        {isDone ? t.view : isActive ? t.continue : t.start}
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                    {!isDone && (
                      <ReportProblemButton
                        shiftId={loc.shiftId}
                        locationId={loc.locationId}
                        locationName={loc.locationName}
                        lang={lang}
                        className="h-11"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
