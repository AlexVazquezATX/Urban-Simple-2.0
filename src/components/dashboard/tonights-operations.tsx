'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Moon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import { localeFor, type ManagerLang } from '@/lib/i18n/manager'

interface ShiftLocation {
  id: string
  location: {
    id: string
    name: string
    client: { id: string; name: string } | null
  }
}

interface ServiceLog {
  id: string
  status: string
  clockIn: string | null
  clockOut: string | null
}

type StopStatus = 'not_started' | 'on_site' | 'clocked_out' | 'submitted'

interface AssociateStop {
  locationId: string
  locationName: string
  status: StopStatus
  clockIn: string | null
  clockOut: string | null
  done: number
  total: number
  notDoneCount: number
  issueId: string | null
}

const stopStatusTone: Record<StopStatus, 'neutral' | 'teal' | 'green' | 'gold'> = {
  not_started: 'neutral',
  on_site: 'teal',
  clocked_out: 'gold',
  submitted: 'green',
}

function formatClock(iso: string | null, lang: ManagerLang): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString(localeFor(lang), { hour: 'numeric', minute: '2-digit' })
}

interface TonightShift {
  id: string
  date: string
  startTime: string
  endTime: string
  status: string
  notes: string | null
  location: { id: string; name: string; client: { id: string; name: string } | null } | null
  shiftLocations: ShiftLocation[]
  associate: { id: string; firstName: string; lastName: string } | null
  manager: { id: string; firstName: string; lastName: string } | null
  serviceLogs: ServiceLog[]
  stops?: AssociateStop[]
}

const statusTone: Record<string, 'neutral' | 'gold' | 'teal' | 'coral' | 'green'> = {
  scheduled: 'neutral',
  in_progress: 'teal',
  completed: 'green',
  missed: 'coral',
  cancelled: 'neutral',
}

/** "21:30" → "9:30 PM" (falls back to the raw string). */
function formatShiftTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return time
  let hours = parseInt(match[1], 10)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${match[2]} ${suffix}`
}

const avatarFills = ['bg-sky-deep', 'bg-peach-deep', 'bg-sage-deep', 'bg-ink-600']

export function TonightsOperations() {
  const [shifts, setShifts] = useState<TonightShift[]>([])
  const [loading, setLoading] = useState(true)
  const { lang, t } = useManagerLang()

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch('/api/operations/tonight')
      if (res.ok) {
        const data = await res.json()
        setShifts(data)
      }
    } catch (error) {
      console.error('Failed to fetch tonight shifts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchShifts()
    const interval = setInterval(fetchShifts, 15000)
    return () => clearInterval(interval)
  }, [fetchShifts])

  const crewCount = new Set(
    shifts.flatMap(s => [s.associate?.id, s.manager?.id].filter(Boolean))
  ).size

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5 pb-3.5">
        <div className="flex items-center gap-2.5">
          <Moon className="size-4 shrink-0 text-teal-600 dark:text-teal-300" />
          <CardTitle>{t.tonight.title}</CardTitle>
          <span className="flex-1" />
          {!loading && shifts.length > 0 && (
            <span className="text-[12.5px] text-muted-foreground">
              {t.dash.shifts(shifts.length)}
              {crewCount > 0 && t.tonight.crew(crewCount)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            {t.common.loading}
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Moon}
            title={t.tonight.emptyTitle}
            description={t.tonight.emptyBody}
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {shifts.map(shift => {
              const statusKey = statusTone[shift.status] ? shift.status : 'scheduled'
              const locations = shift.shiftLocations.length > 0
                ? shift.shiftLocations.map(sl => sl.location)
                : shift.location
                  ? [shift.location]
                  : []
              const clientName =
                locations[0]?.client?.name || locations[0]?.name || t.tonight.locationTbd
              const place = locations.map(loc => loc.name).join(' · ')
              const crew = [shift.associate, shift.manager].filter(
                (person): person is { id: string; firstName: string; lastName: string } =>
                  Boolean(person)
              )

              const stops = shift.stops ?? []

              return (
                <div
                  key={shift.id}
                  className="rounded-[11px] border border-border/60 bg-secondary/40 px-4 py-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 shrink-0 font-mono text-[13px] tabular-nums text-gold-600 dark:text-gold-400">
                      {formatShiftTime(shift.startTime)}
                    </div>
                    <div className="w-px self-stretch bg-border" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{clientName}</div>
                      <div className="mt-px truncate text-[11.5px] text-muted-foreground">{place || '—'}</div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      {crew.map((person, i) => (
                        <div
                          key={person.id}
                          className={cn(
                            'grid size-6 place-items-center rounded-full border-2 border-card text-[9.5px] font-bold text-cream-50',
                            avatarFills[i % avatarFills.length],
                            i > 0 && '-ml-2.5'
                          )}
                          title={`${person.firstName} ${person.lastName}`}
                        >
                          {person.firstName.charAt(0)}
                        </div>
                      ))}
                      {shift.associate ? (
                        <span className="ml-1.5 hidden text-[11.5px] text-muted-foreground sm:inline">
                          {t.tonight.leads(shift.associate.firstName)}
                        </span>
                      ) : shift.status === 'scheduled' ? (
                        <span className="ml-1.5 text-[11.5px] font-semibold text-coral-600 dark:text-coral-300">
                          {t.common.unassigned}
                        </span>
                      ) : null}
                    </div>
                    <Badge variant={statusTone[statusKey]}>{t.shiftStatus[statusKey]}</Badge>
                  </div>
                  {stops.length > 0 && (
                    <div className="mt-2.5 flex flex-col gap-1.5 border-t border-border/60 pt-2.5">
                      {stops.map(stop => {
                        const stopKey: StopStatus = stopStatusTone[stop.status] ? stop.status : 'not_started'
                        const clockIn = formatClock(stop.clockIn, lang)
                        const clockOut = formatClock(stop.clockOut, lang)
                        return (
                          <div
                            key={stop.locationId}
                            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted-foreground"
                          >
                            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                              {stop.locationName}
                            </span>
                            {clockIn && (
                              <span className="font-mono tabular-nums">
                                {clockIn}–{clockOut ?? t.tonight.now}
                              </span>
                            )}
                            {stop.total > 0 && (
                              <span className="font-mono tabular-nums">
                                {stop.done}/{stop.total}
                              </span>
                            )}
                            {stop.notDoneCount > 0 &&
                              (stop.issueId ? (
                                <Link href={`/operations/issues/${stop.issueId}`}>
                                  <Badge variant="coral">{t.common.notDone(stop.notDoneCount)}</Badge>
                                </Link>
                              ) : (
                                <Badge variant="coral">{t.common.notDone(stop.notDoneCount)}</Badge>
                              ))}
                            <Badge variant={stopStatusTone[stopKey]}>{t.stopStatus[stopKey]}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
