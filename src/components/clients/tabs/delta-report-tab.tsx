'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ArrowRight,
  Equal,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatMoneyExact } from '@/lib/format'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Billing money always shows cents.
const formatCurrency = formatMoneyExact

interface DeltaFacility {
  facilityProfileId: string
  locationName: string
  category: string | null
  currentStatus: string
  previousStatus: string
  currentTotal: number
  previousTotal: number
  currentRate: number
  previousRate: number
  currentFrequency: number
  previousFrequency: number
  currentIncluded: boolean
  previousIncluded: boolean
  totalDelta: number
  isNew: boolean
  isRemoved: boolean
  changeType: 'added' | 'removed' | 'changed' | 'unchanged'
}

interface DeltaReport {
  currentMonth: { year: number; month: number; monthLabel: string; total: number }
  previousMonth: { year: number; month: number; monthLabel: string; total: number }
  totalDelta: number
  subtotalDelta: number
  taxDelta: number
  facilities: DeltaFacility[]
  changedCount: number
  unchangedCount: number
}

interface DeltaReportTabProps {
  clientId: string
}

export function DeltaReportTab({ clientId }: DeltaReportTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<DeltaReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUnchanged, setShowUnchanged] = useState(false)

  const fetchDelta = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/billing-preview/delta?year=${year}&month=${month}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load delta report')
      }
      const data = await res.json()
      setReport(data)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [clientId, year, month])

  useEffect(() => {
    fetchDelta()
  }, [fetchDelta])

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

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  if (loading) return <DeltaSkeleton />

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-3 h-8 w-8 text-coral-600 dark:text-coral-300" />
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDelta}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (!report) return null

  const changed = report.facilities.filter(f => f.changeType !== 'unchanged')
  const unchanged = report.facilities.filter(f => f.changeType === 'unchanged')
  const isUp = report.totalDelta > 0
  const isDown = report.totalDelta < 0
  const isFlat = report.totalDelta === 0

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
        <div className="font-mono text-xs text-muted-foreground">
          {report.previousMonth.monthLabel} vs {report.currentMonth.monthLabel}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="gap-0 py-3">
          <CardContent className="px-4">
            <p className="kicker mb-1 text-muted-foreground">{report.previousMonth.monthLabel}</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(report.previousMonth.total)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-3">
          <CardContent className="px-4">
            <p className="kicker mb-1 text-muted-foreground">{report.currentMonth.monthLabel}</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatCurrency(report.currentMonth.total)}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-3">
          <CardContent className="px-4">
            <p className="kicker mb-1 text-muted-foreground">Net Change</p>
            <div className="flex items-center gap-1.5">
              {isUp && <TrendingUp className="h-4 w-4 text-coral-600 dark:text-coral-300" />}
              {isDown && <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-300" />}
              {isFlat && <Minus className="h-4 w-4 text-muted-foreground" />}
              <span className={cn(
                'font-mono text-lg font-semibold tabular-nums',
                isUp
                  ? 'text-coral-600 dark:text-coral-300'
                  : isDown
                    ? 'text-green-600 dark:text-green-300'
                    : 'text-muted-foreground',
              )}>
                {isFlat ? 'No change' : `${isUp ? '+' : ''}${formatCurrency(report.totalDelta)}`}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="gap-0 py-3">
          <CardContent className="px-4">
            <p className="kicker mb-1 text-muted-foreground">Facilities Changed</p>
            <p className="font-display text-lg font-semibold tabular-nums text-foreground">
              {report.changedCount}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                of {report.facilities.length}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Changed facilities table */}
      {changed.length > 0 ? (
        <Card className="gap-3">
          <CardHeader className="pb-0">
            <CardTitle className="text-[15px]">Changes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Facility</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">
                      {report.previousMonth.monthLabel}
                    </TableHead>
                    <TableHead className="w-8 text-center" />
                    <TableHead className="text-right">
                      {report.currentMonth.monthLabel}
                    </TableHead>
                    <TableHead className="pr-6 text-right">Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changed.map((f) => (
                    <DeltaRow key={f.facilityProfileId} facility={f} />
                  ))}
                  {/* Totals row */}
                  <TableRow className="bg-secondary/50 font-medium hover:bg-secondary/50">
                    <TableCell colSpan={2} className="pl-6 text-sm text-foreground">
                      Net Impact
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(changed.reduce((s, f) => s + f.previousTotal, 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="mx-auto h-3 w-3 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(changed.reduce((s, f) => s + f.currentTotal, 0))}
                    </TableCell>
                    <TableCell className={cn(
                      'pr-6 text-right font-mono text-sm font-semibold tabular-nums',
                      report.totalDelta > 0
                        ? 'text-coral-600 dark:text-coral-300'
                        : report.totalDelta < 0
                          ? 'text-green-600 dark:text-green-300'
                          : 'text-muted-foreground',
                    )}>
                      {report.totalDelta !== 0 && (report.totalDelta > 0 ? '+' : '')}
                      {formatCurrency(changed.reduce((s, f) => s + f.totalDelta, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <EmptyState
              icon={Equal}
              title="No changes between months"
              description="All facilities have the same billing totals."
            />
          </CardContent>
        </Card>
      )}

      {/* Unchanged facilities (collapsible) */}
      {unchanged.length > 0 && (
        <div>
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {showUnchanged ? 'Hide' : 'Show'} {unchanged.length} unchanged {unchanged.length === 1 ? 'facility' : 'facilities'}
          </button>
          {showUnchanged && (
            <Card className="mt-2 py-0">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      {unchanged.map((f) => (
                        <TableRow key={f.facilityProfileId} className="opacity-60">
                          <TableCell className="py-2 pl-6 text-sm text-foreground">{f.locationName}</TableCell>
                          <TableCell className="py-2 text-xs text-muted-foreground">{f.currentStatus.replace('_', ' ')}</TableCell>
                          <TableCell className="py-2 pr-6 text-right font-mono text-sm tabular-nums text-foreground">
                            {formatCurrency(f.currentTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function DeltaRow({ facility: f }: { facility: DeltaFacility }) {
  const typeConfig: Record<
    string,
    { label: string; icon: typeof Plus; variant: 'neutral' | 'gold' | 'teal' | 'coral' | 'green' }
  > = {
    added: { label: 'Added', icon: Plus, variant: 'green' },
    removed: { label: 'Removed', icon: X, variant: 'coral' },
    changed: { label: 'Changed', icon: ArrowRight, variant: 'gold' },
    unchanged: { label: 'Same', icon: Equal, variant: 'neutral' },
  }

  const config = typeConfig[f.changeType]
  const Icon = config.icon
  const deltaPositive = f.totalDelta > 0
  const deltaNegative = f.totalDelta < 0

  return (
    <TableRow>
      <TableCell className="py-2 pl-6">
        <span className="text-sm text-foreground">{f.locationName}</span>
        {f.category && (
          <Badge variant="neutral" className="ml-2">
            {f.category}
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-2">
        <Badge variant={config.variant}>
          <Icon className="h-2.5 w-2.5" />
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {f.previousStatus !== '-' && f.currentStatus !== '-' && f.previousStatus !== f.currentStatus ? (
          <span>
            {f.previousStatus.replace('_', ' ')}
            <ArrowRight className="mx-0.5 inline h-3 w-3 text-muted-foreground" />
            {f.currentStatus.replace('_', ' ')}
          </span>
        ) : (
          <span>{(f.currentStatus !== '-' ? f.currentStatus : f.previousStatus).replace('_', ' ')}</span>
        )}
      </TableCell>
      <TableCell className="py-2 text-right font-mono text-sm tabular-nums text-foreground">
        {f.isNew ? '-' : formatCurrency(f.previousTotal)}
      </TableCell>
      <TableCell className="py-2 text-center">
        <ArrowRight className="mx-auto h-3 w-3 text-muted-foreground" />
      </TableCell>
      <TableCell className="py-2 text-right font-mono text-sm tabular-nums text-foreground">
        {f.isRemoved ? '-' : formatCurrency(f.currentTotal)}
      </TableCell>
      <TableCell className={cn(
        'py-2 pr-6 text-right font-mono text-sm font-medium tabular-nums',
        deltaPositive
          ? 'text-coral-600 dark:text-coral-300'
          : deltaNegative
            ? 'text-green-600 dark:text-green-300'
            : 'text-muted-foreground',
      )}>
        {f.totalDelta !== 0 && (deltaPositive ? '+' : '')}
        {formatCurrency(f.totalDelta)}
      </TableCell>
    </TableRow>
  )
}

function DeltaSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-[130px]" />
          <Skeleton className="h-8 w-[85px]" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="gap-0 py-3">
            <CardContent className="px-4">
              <Skeleton className="mb-2 h-3 w-16" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="gap-3">
        <CardHeader className="pb-0">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
