'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, CheckCircle, Loader2, ClipboardList, ChevronRight } from 'lucide-react'
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
  serviceLogId: string | null
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Not Started', color: 'text-warm-500 dark:text-cream-400', bgColor: 'bg-warm-50 border-warm-200 dark:bg-charcoal-800 dark:border-charcoal-700' },
  in_progress: { label: 'In Progress', color: 'text-ocean-600 dark:text-ocean-400', bgColor: 'bg-ocean-50 border-ocean-300 dark:bg-ocean-950 dark:border-ocean-700' },
  completed: { label: 'Complete', color: 'text-lime-600 dark:text-lime-400', bgColor: 'bg-lime-50 border-lime-300 dark:bg-lime-950 dark:border-lime-700' },
  partial: { label: 'Partial', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 border-amber-300 dark:bg-amber-950 dark:border-amber-700' },
}

export function MyNightView({ userName }: { userName: string }) {
  const [locations, setLocations] = useState<NightLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [shiftCount, setShiftCount] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/my-night')
      if (res.ok) {
        const data = await res.json()
        setLocations(data.locations)
        setShiftCount(data.shifts)
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

  const completedCount = locations.filter(l => l.status === 'completed').length
  const totalCount = locations.length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-warm-400 dark:text-cream-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading tonight&apos;s route...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-medium tracking-tight font-display text-warm-900 dark:text-cream-100">
          My Night
        </h1>
        <p className="text-warm-500 dark:text-cream-400">
          {shiftCount === 0
            ? 'No shifts scheduled for tonight'
            : `${completedCount}/${totalCount} locations complete`}
        </p>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="w-full h-2 bg-warm-200 dark:bg-charcoal-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Location Cards */}
      {locations.length === 0 ? (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
          <CardContent className="py-12 text-center">
            <Clock className="h-10 w-10 mx-auto text-warm-300 dark:text-cream-600 mb-3" />
            <p className="text-warm-500 dark:text-cream-400 font-medium">No locations tonight</p>
            <p className="text-sm text-warm-400 dark:text-cream-500 mt-1">Check back when your shift starts</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {locations.map((loc, index) => {
            const config = statusConfig[loc.status] || statusConfig.pending
            const isActive = loc.status === 'in_progress'
            const isDone = loc.status === 'completed'

            return (
              <Card
                key={`${loc.shiftId}-${loc.locationId}`}
                className={cn(
                  'rounded-sm border transition-all dark:bg-charcoal-900',
                  isActive && 'border-ocean-400 shadow-sm ring-1 ring-ocean-200 dark:ring-ocean-800',
                  isDone && 'border-lime-300 dark:border-lime-700 opacity-75',
                  !isActive && !isDone && 'border-warm-200 dark:border-charcoal-700'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Step number */}
                      <div className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold',
                        isDone ? 'bg-lime-100 text-lime-600 dark:bg-lime-950 dark:text-lime-400' : isActive ? 'bg-ocean-100 text-ocean-600 dark:bg-ocean-950 dark:text-ocean-400' : 'bg-warm-100 text-warm-500 dark:bg-charcoal-800 dark:text-cream-400'
                      )}>
                        {isDone ? <CheckCircle className="h-4 w-4" /> : index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-warm-900 dark:text-cream-100 truncate">{loc.locationName}</p>
                        <p className="text-sm text-warm-500 dark:text-cream-400">{loc.clientName}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-warm-400 dark:text-cream-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {loc.shiftTime}
                          </span>
                          {loc.checklistName && (
                            <span className="flex items-center gap-1">
                              <ClipboardList className="h-3 w-3" />
                              {loc.checklistName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge variant="outline" className={cn('text-xs shrink-0 ml-2', config.color)}>
                      {config.label}
                    </Badge>
                  </div>

                  {/* Action Button */}
                  {!isDone && loc.checklistId && (
                    <div className="mt-3 pt-3 border-t border-warm-100 dark:border-charcoal-700">
                      <Link href={`/operations/checklists/${loc.checklistId}`}>
                        <Button
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            'w-full gap-1.5',
                            isActive && 'bg-ocean-600 hover:bg-ocean-700'
                          )}
                        >
                          {isActive ? 'Continue Checklist' : 'Start Checklist'}
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
