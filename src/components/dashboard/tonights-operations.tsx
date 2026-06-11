'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Moon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

const statusConfig: Record<string, { label: string; tone: 'neutral' | 'gold' | 'teal' | 'coral' | 'green' }> = {
  scheduled: { label: 'Scheduled', tone: 'neutral' },
  in_progress: { label: 'In progress', tone: 'teal' },
  completed: { label: 'Completed', tone: 'green' },
  missed: { label: 'Missed', tone: 'coral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
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
          <CardTitle>Tonight&apos;s operations</CardTitle>
          <span className="flex-1" />
          {!loading && shifts.length > 0 && (
            <span className="text-[12.5px] text-muted-foreground">
              {shifts.length} {shifts.length === 1 ? 'shift' : 'shifts'}
              {crewCount > 0 && ` · ${crewCount} crew`}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading...
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Moon}
            title="No shifts tonight — enjoy the quiet"
            description="Shifts scheduled for tonight will show up here as the crew heads out."
            className="py-8"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {shifts.map(shift => {
              const config = statusConfig[shift.status] || statusConfig.scheduled
              const locations = shift.shiftLocations.length > 0
                ? shift.shiftLocations.map(sl => sl.location)
                : shift.location
                  ? [shift.location]
                  : []
              const clientName =
                locations[0]?.client?.name || locations[0]?.name || 'Location TBD'
              const place = locations.map(loc => loc.name).join(' · ')
              const crew = [shift.associate, shift.manager].filter(
                (person): person is { id: string; firstName: string; lastName: string } =>
                  Boolean(person)
              )

              return (
                <div
                  key={shift.id}
                  className="flex items-center gap-3.5 rounded-[11px] border border-border/60 bg-secondary/40 px-4 py-3"
                >
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
                        {shift.associate.firstName} leads
                      </span>
                    ) : shift.status === 'scheduled' ? (
                      <span className="ml-1.5 text-[11.5px] font-semibold text-coral-600 dark:text-coral-300">
                        Unassigned
                      </span>
                    ) : null}
                  </div>
                  <Badge variant={config.tone}>{config.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
