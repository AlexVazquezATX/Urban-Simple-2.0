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
      <Card className="border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm text-warm-600 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchSchedule} className="rounded-sm">Retry</Button>
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
          <Button variant="outline" size="icon" onClick={goToPreviousMonth} className="rounded-sm border-warm-200 h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px] rounded-sm border-warm-200 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[85px] rounded-sm border-warm-200 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 1 + i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextMonth} className="rounded-sm border-warm-200 h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" onClick={goToCurrentMonth} className="rounded-sm text-ocean-600 text-xs ml-1">
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-warm-500">
            {preview.activeFacilityCount} active facilities
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/clients/${clientId}/print-schedule?year=${year}&month=${month}`, '_blank')}
            className="rounded-sm border-warm-200 text-warm-700 print:hidden"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <Card className="border-warm-200">
        <CardContent className="p-2 sm:p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-warm-500 py-1.5">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          <div className="grid grid-cols-7 gap-px bg-warm-200 border border-warm-200 rounded-sm overflow-hidden">
            {monthCells.map((cell, idx) => {
              if (!cell.date) {
                return <div key={idx} className="bg-warm-50 min-h-[72px]" />
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
                    'bg-white min-h-[72px] p-1.5 text-left transition-colors relative',
                    'hover:bg-ocean-50/50 focus:outline-none focus:ring-1 focus:ring-ocean-400 focus:ring-inset',
                    isSelected && 'bg-ocean-50 ring-1 ring-ocean-400 ring-inset',
                    isWeekend && !isSelected && 'bg-warm-50/50',
                  )}
                >
                  {/* Day number */}
                  <span className={cn(
                    'text-xs font-medium',
                    isToday
                      ? 'bg-ocean-600 text-white rounded-full w-5 h-5 flex items-center justify-center'
                      : 'text-warm-700',
                  )}>
                    {cell.dayOfMonth}
                  </span>

                  {/* Facility count */}
                  {count > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-lime-500" />
                        <span className="text-[10px] text-warm-600">{count}</span>
                      </div>
                      {/* Tiny dots for individual facilities (max 6 shown) */}
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {facilities.slice(0, 6).map((f, i) => (
                          <div
                            key={i}
                            className={cn(
                              'h-1 w-1 rounded-full',
                              f.isOverridden ? 'bg-orange-400' : 'bg-lime-400',
                            )}
                            title={f.locationName}
                          />
                        ))}
                        {count > 6 && (
                          <span className="text-[8px] text-warm-400">+{count - 6}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* No service indicator */}
                  {count === 0 && (
                    <div className="mt-1">
                      <span className="text-[10px] text-warm-300">No service</span>
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
        <Card className="border-warm-200 border-ocean-200 bg-ocean-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display font-medium text-warm-900">
              {MONTH_NAMES[month - 1]} {selectedDay}, {year}
              <span className="ml-2 text-warm-500 font-normal">
                — {DAY_HEADERS[new Date(year, month - 1, selectedDay).getDay()]}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDayFacilities.length === 0 ? (
              <p className="text-sm text-warm-500">No facilities scheduled for this day.</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDayFacilities.map((f) => (
                  <div key={f.facilityProfileId} className="flex items-center justify-between py-1 px-2 rounded-sm bg-white border border-warm-100">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-2 w-2 rounded-full',
                        f.isOverridden ? 'bg-orange-400' : 'bg-lime-500',
                      )} />
                      <span className="text-sm text-warm-800">{f.locationName}</span>
                      {f.category && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 border-warm-200 text-warm-500">
                          {f.category}
                        </Badge>
                      )}
                      {f.isOverridden && (
                        <Badge className="text-[9px] px-1 py-0 bg-orange-100 text-orange-700 border-orange-200">
                          Override
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-warm-500">{f.effectiveFrequency}x/wk</span>
                  </div>
                ))}
                <p className="text-xs text-warm-500 pt-1">
                  {selectedDayFacilities.length} {selectedDayFacilities.length === 1 ? 'facility' : 'facilities'} scheduled
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend / inactive facilities */}
      {inactiveFacilities.length > 0 && (
        <Card className="border-warm-200 bg-warm-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display font-medium text-warm-800">
              Not Scheduled This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {inactiveFacilities.map((f) => (
                <Badge
                  key={f.facilityProfileId}
                  variant="outline"
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-sm',
                    f.effectiveStatus === 'PAUSED' && 'border-yellow-300 text-yellow-700 bg-yellow-50',
                    f.effectiveStatus === 'SEASONAL_PAUSED' && 'border-orange-300 text-orange-700 bg-orange-50',
                    f.effectiveStatus === 'PENDING_APPROVAL' && 'border-warm-300 text-warm-600 bg-warm-50',
                    f.effectiveStatus === 'CLOSED' && 'border-red-300 text-red-600 bg-red-50',
                  )}
                >
                  {f.locationName}
                  <span className="ml-1 opacity-60">
                    ({f.effectiveStatus.replace('_', ' ').toLowerCase()})
                  </span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-warm-500">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-lime-500" /> Active
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-orange-400" /> Override
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-warm-300" /> No service
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
      <Card className="border-warm-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
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
