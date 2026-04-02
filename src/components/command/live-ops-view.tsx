'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  scheduled: { label: 'Scheduled', color: 'bg-warm-100 text-warm-700 border-warm-300 dark:bg-charcoal-800 dark:text-cream-300 dark:border-charcoal-600', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-ocean-50 text-ocean-700 border-ocean-300 dark:bg-ocean-950 dark:text-ocean-300 dark:border-ocean-700', icon: Loader2 },
  completed: { label: 'Completed', color: 'bg-lime-50 text-lime-700 border-lime-300 dark:bg-lime-950 dark:text-lime-300 dark:border-lime-700', icon: CheckCircle },
  missed: { label: 'Missed', color: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-700', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-warm-50 text-warm-500 border-warm-200 dark:bg-charcoal-800 dark:text-cream-500 dark:border-charcoal-700', icon: AlertCircle },
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
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-medium text-warm-900 dark:text-cream-100">
            Tonight&apos;s Operations
          </CardTitle>
          {!loading && shifts.length > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="text-warm-500 dark:text-cream-400">{statusCounts.scheduled} scheduled</span>
              <span className="text-ocean-600 dark:text-ocean-400">{statusCounts.in_progress} active</span>
              <span className="text-lime-600 dark:text-lime-400">{statusCounts.completed} done</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4 text-warm-400 dark:text-cream-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-4 text-warm-400 dark:text-cream-500">
            <Clock className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
            <p className="text-sm">No shifts scheduled for tonight</p>
          </div>
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
                    'rounded-sm border p-3 transition-all dark:bg-charcoal-800',
                    shift.status === 'in_progress' && 'border-ocean-300 bg-ocean-50/30 dark:border-ocean-700 dark:bg-ocean-950/30',
                    shift.status === 'completed' && 'border-lime-300 bg-lime-50/30 dark:border-lime-700 dark:bg-lime-950/30',
                    shift.status === 'missed' && 'border-red-300 bg-red-50/30 dark:border-red-700 dark:bg-red-950/30',
                    !['in_progress', 'completed', 'missed'].includes(shift.status) && 'border-warm-200 dark:border-charcoal-700'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.color)}>
                      <StatusIcon className={cn('h-3 w-3 mr-1', shift.status === 'in_progress' && 'animate-spin')} />
                      {config.label}
                    </Badge>
                    <span className="text-xs text-warm-500 dark:text-cream-400">{shift.startTime} - {shift.endTime}</span>
                  </div>

                  {locations.map((loc) => (
                    <div key={loc.id} className="flex items-start gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-warm-400 dark:text-cream-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warm-800 dark:text-cream-200 truncate">{loc.name}</p>
                        {loc.client && (
                          <p className="text-xs text-warm-500 dark:text-cream-400 truncate">{loc.client.name}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {shift.associate && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-warm-100 dark:border-charcoal-700">
                      <User className="h-3 w-3 text-warm-400 dark:text-cream-500" />
                      <span className="text-xs text-warm-600 dark:text-cream-300">
                        {shift.associate.firstName} {shift.associate.lastName}
                      </span>
                    </div>
                  )}

                  {!shift.associate && shift.status === 'scheduled' && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-warm-100 dark:border-charcoal-700">
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Unassigned</span>
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
