'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Clock, CheckCircle, Loader2, ClipboardList, ChevronRight } from 'lucide-react'
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

const statusConfig: Record<string, { label: string; variant: 'neutral' | 'teal' | 'green' | 'gold' }> = {
  pending: { label: 'Not started', variant: 'neutral' },
  in_progress: { label: 'In progress', variant: 'teal' },
  completed: { label: 'Complete', variant: 'green' },
  partial: { label: 'Partial', variant: 'gold' },
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
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 size-6 animate-spin" />
        Loading tonight&apos;s route...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <PageHeader
          kicker="TODAY · MY NIGHT"
          title={`Good evening, ${userName}`}
          subtitle={
            shiftCount === 0
              ? 'No shifts scheduled for tonight'
              : `${completedCount}/${totalCount} locations complete`
          }
          className="mb-0"
        />

        {/* Progress bar — track secondary, fill gold */}
        {totalCount > 0 && (
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="font-mono text-[11.5px] tabular-nums text-gold-600 dark:text-gold-400">
              {completedCount}/{totalCount}
            </span>
          </div>
        )}
      </div>

      {/* Location Cards */}
      {locations.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={Clock}
              title="No shifts tonight — enjoy the quiet"
              description="Check back here when your shift starts."
            />
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
                  'py-0 transition-all',
                  isActive &&
                    'border-teal-600/30 ring-1 ring-teal-600/30 dark:border-teal-300/25 dark:ring-teal-300/25',
                  isDone && 'border-green-600/30 opacity-75 dark:border-green-300/25'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      {/* Step number */}
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
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
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
                        </div>
                      </div>
                    </div>

                    <Badge variant={config.variant} className="ml-2 shrink-0">
                      {config.label}
                    </Badge>
                  </div>

                  {/* Action Button */}
                  {!isDone && loc.checklistId && (
                    <div className="mt-3 border-t border-border pt-3">
                      <Button
                        variant={isActive ? 'gold' : 'outline'}
                        size="sm"
                        className="w-full gap-1.5"
                        asChild
                      >
                        <Link href={`/operations/checklists/${loc.checklistId}`}>
                          {isActive ? 'Continue Checklist' : 'Start Checklist'}
                          <ChevronRight className="size-3.5" />
                        </Link>
                      </Button>
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
