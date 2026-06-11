'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CalendarDays,
  Printer,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { BillingPreview, FacilityLineItem } from '@/lib/billing/billing-types'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface ScheduleCalendarTabProps {
  clientId: string
}

/** Get all dates in a month as an array of Date objects */
function getMonthDates(year: number, month: number) {
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startPad = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  const cells: Array<{ date: Date | null; dayOfMonth: number; dayOfWeek: number }> = []

  // Leading empty cells
  for (let i = 0; i < startPad; i++) {
    cells.push({ date: null, dayOfMonth: 0, dayOfWeek: i })
  }

  // Actual days
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month - 1, d)
    cells.push({ date, dayOfMonth: d, dayOfWeek: date.getDay() })
  }

  // Trailing empty cells to fill last week
  while (cells.length % 7 !== 0) {
    cells.push({ date: null, dayOfMonth: 0, dayOfWeek: cells.length % 7 })
  }

  return cells
}

export function ScheduleCalendarTab({ clientId }: ScheduleCalendarTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [preview, setPreview] = useState<BillingPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedDay(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/billing-preview?year=${year}&month=${month}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load schedule')
      }
      const data = await res.json()
      setPreview(data)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId, year, month])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const goToPreviousMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else { setMonth(m => m - 1) }
  }

  const goToNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else { setMonth(m => m + 1) }
  }

  const goToCurrentMonth = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  // Build a map: dayOfWeek -> list of active facilities scheduled that day
  const scheduleByDow = useMemo(() => {
    if (!preview) return new Map<number, FacilityLineItem[]>()
    const map = new Map<number, FacilityLineItem[]>()
    for (let dow = 0; dow < 7; dow++) {
      map.set(dow, [])
    }
    for (const li of preview.lineItems) {
      if (!li.includedInTotal) continue
      for (const dow of li.effectiveDaysOfWeek) {
        map.get(dow)?.push(li)
      }
    }
    return map
  }, [preview])

  // Paused/inactive facilities (shown in legend)
  const inactiveFacilities = useMemo(() => {
    if (!preview) return []
    return preview.lineItems.filter(li => !li.includedInTotal)
  }, [preview])

  const monthCells = useMemo(() => getMonthDates(year, month), [year, month])
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const today = now.getDate()

  // Facilities scheduled on the selected day
  const selectedDayFacilities = useMemo(() => {
    if (selectedDay === null) return null
    const date = new Date(year, month - 1, selectedDay)
    return scheduleByDow.get(date.getDay()) || []
  }, [selectedDay, year, month, scheduleByDow])

  if (loading) return <CalendarSkeleton />

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-3 h-8 w-8 text-coral-600 dark:text-coral-300" />
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSchedule}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!preview) return null

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="h-8 w-[130px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="h-8 w-[85px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="ml-1 text-xs">
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {preview.activeFacilityCount} active facilities
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/clients/${clientId}/print-schedule?year=${year}&month=${month}`, '_blank')}
            className="print:hidden"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="px-2 sm:px-4">
          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7">
            {DAY_HEADERS.map((day) => (
              <div key={day} className="kicker py-1.5 text-center text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[10px] border border-border bg-border">
            {monthCells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={idx} className="min-h-[72px] bg-secondary/50" />
              }

              const dow = cell.dayOfWeek
              const facilities = scheduleByDow.get(dow) || []
              const count = facilities.length
              const isToday = isCurrentMonth && cell.dayOfMonth === today
              const isSelected = selectedDay === cell.dayOfMonth
              const isWeekend = dow === 0 || dow === 6

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : cell.dayOfMonth)}
                  className={cn(
                    'relative min-h-[72px] bg-card p-1.5 text-left transition-colors',
                    'hover:bg-secondary/40 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring',
                    isSelected &&
                      'bg-gold-600/10 ring-1 ring-inset ring-gold-600/40 dark:bg-gold-400/12 dark:ring-gold-400/40',
                    isWeekend && !isSelected && 'bg-secondary/30',
                  )}
                >
                  {/* Day number */}
                  <span className={cn(
                    'font-mono text-xs font-medium tabular-nums',
                    isToday
                      ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground'
                      : 'text-foreground',
                  )}>
                    {cell.dayOfMonth}
                  </span>

                  {/* Facility count */}
                  {count > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-300" />
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{count}</span>
                      </div>
                      {/* Tiny dots for individual facilities (max 6 shown) */}
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {facilities.slice(0, 6).map((f, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 w-1 rounded-full',
                              f.isOverridden
                                ? 'bg-gold-600 dark:bg-gold-400'
                                : 'bg-green-600 dark:bg-green-300',
                            )}
                            title={f.locationName}
                          />
                        ))}
                        {count > 6 && (
                          <span className="text-[8px] text-muted-foreground">+{count - 6}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No service indicator */}
                  {count === 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] text-muted-foreground/60">No service</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected day detail */}
      {selectedDay !== null && selectedDayFacilities !== null && (
        <Card className="gap-2 border-gold-600/30 bg-gold-600/10 py-4 dark:border-gold-400/25 dark:bg-gold-400/12">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">
              {MONTH_NAMES[month - 1]} {selectedDay}, {year}
              <span className="ml-2 font-sans font-normal text-muted-foreground">
                — {DAY_HEADERS[new Date(year, month - 1, selectedDay).getDay()]}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {selectedDayFacilities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No facilities scheduled for this day.</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDayFacilities.map((f) => (
                  <div key={f.facilityProfileId} className="flex items-center justify-between rounded-[9px] border border-border bg-card px-2 py-1">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        f.isOverridden
                          ? 'bg-gold-600 dark:bg-gold-400'
                          : 'bg-green-600 dark:bg-green-300',
                      )} />
                      <span className="text-sm text-foreground">{f.locationName}</span>
                      {f.category && (
                        <Badge variant="neutral">
                          {f.category}
                        </Badge>
                      )}
                      {f.isOverridden && <Badge variant="gold">Override</Badge>}
                    </div>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{f.effectiveFrequency}x/wk</span>
                  </div>
                ))}
                <p className="pt-1 text-xs text-muted-foreground">
                  {selectedDayFacilities.length} {selectedDayFacilities.length === 1 ? 'facility' : 'facilities'} scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend / inactive facilities */}
      {inactiveFacilities.length > 0 && (
        <Card className="gap-2 bg-secondary/40 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">Not Scheduled This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="flex flex-wrap gap-2">
              {inactiveFacilities.map((f) => (
                <Badge
                  key={f.facilityProfileId}
                  variant={
                    f.effectiveStatus === 'PAUSED'
                      ? 'gold'
                      : f.effectiveStatus === 'SEASONAL_PAUSED'
                        ? 'teal'
                        : f.effectiveStatus === 'CLOSED'
                          ? 'coral'
                          : 'neutral'
                  }
                >
                  {f.locationName}
                  <span className="opacity-60">
                    ({f.effectiveStatus.replace('_', ' ').toLowerCase()})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-300" /> Active
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-gold-600 dark:bg-gold-400" /> Override
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" /> No service
        </div>
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-[130px]" />
          <Skeleton className="h-8 w-[85px]" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-4 w-28" />
      </div>
      <Card>
        <CardContent className="px-4">
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAY_HEADERS.map(d => <Skeleton key={d} className="h-4 w-full" />)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
