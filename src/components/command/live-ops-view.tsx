'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { MapPin, Clock, User, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
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

const statusConfig: Record<
  string,
  { label: string; variant: 'neutral' | 'teal' | 'coral' | 'green'; icon: React.ComponentType<{ className?: string }> }
> = {
  scheduled: { label: 'Scheduled', variant: 'neutral', icon: Clock },
  in_progress: { label: 'In progress', variant: 'teal', icon: Loader2 },
  completed: { label: 'Completed', variant: 'green', icon: CheckCircle },
  missed: { label: 'Missed', variant: 'coral', icon: AlertCircle },
  cancelled: { label: 'Cancelled', variant: 'neutral', icon: AlertCircle },
}

export function LiveOpsView() {
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

  const statusCounts = {
    scheduled: shifts.filter(s => s.status === 'scheduled').length,
    in_progress: shifts.filter(s => s.status === 'in_progress').length,
    completed: shifts.filter(s => s.status === 'completed').length,
  }

  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle>Tonight&apos;s Operations</CardTitle>
          {!loading && shifts.length > 0 && (
            <div className="flex gap-3 font-mono text-[11px] tabular-nums">
              <span className="text-muted-foreground">{statusCounts.scheduled} scheduled</span>
              <span className="text-teal-600 dark:text-teal-300">{statusCounts.in_progress} active</span>
              <span className="text-green-600 dark:text-green-300">{statusCounts.completed} done</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading...
          </div>
        ) : shifts.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No shifts tonight — enjoy the quiet"
            description="Tonight's crews and locations will show up here as the schedule fills in."
            className="py-6"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shifts.map((shift) => {
              const config = statusConfig[shift.status] || statusConfig.scheduled
              const StatusIcon = config.icon
              const locations = shift.shiftLocations.length > 0
                ? shift.shiftLocations.map(sl => sl.location)
                : shift.location
                  ? [shift.location]
                  : []

              return (
                <div
                  key={shift.id}
                  className={cn(
                    'rounded-[12px] border p-3 transition-all',
                    shift.status === 'in_progress' &&
                      'border-teal-600/30 bg-teal-600/10 dark:border-teal-300/25 dark:bg-teal-300/12',
                    shift.status === 'completed' &&
                      'border-green-600/30 bg-green-600/12 dark:border-green-300/25 dark:bg-green-300/12',
                    shift.status === 'missed' &&
                      'border-coral-600/30 bg-coral-600/10 dark:border-coral-300/25 dark:bg-coral-300/12',
                    !['in_progress', 'completed', 'missed'].includes(shift.status) &&
                      'border-border bg-background'
                  )}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <Badge variant={config.variant}>
                      <StatusIcon className={cn('mr-1 size-3', shift.status === 'in_progress' && 'animate-spin')} />
                      {config.label}
                    </Badge>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      {shift.startTime} – {shift.endTime}
                    </span>
                  </div>

                  {locations.map((loc) => (
                    <div key={loc.id} className="mb-1 flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{loc.name}</p>
                        {loc.client && (
                          <p className="truncate text-xs text-muted-foreground">{loc.client.name}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {shift.associate && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
                      <User className="size-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {shift.associate.firstName} {shift.associate.lastName}
                      </span>
                    </div>
                  )}

                  {!shift.associate && shift.status === 'scheduled' && (
                    <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
                      <AlertCircle className="size-3 text-coral-600 dark:text-coral-300" />
                      <span className="text-xs font-medium text-coral-600 dark:text-coral-300">Unassigned</span>
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
