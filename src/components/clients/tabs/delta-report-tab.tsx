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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

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
      <Card className="border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm text-warm-600 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchDelta} className="rounded-sm">Retry</Button>
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
        <div className="text-xs text-warm-500">
          {report.previousMonth.monthLabel} vs {report.currentMonth.monthLabel}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-warm-200">
          <CardContent className="p-3">
            <p className="text-xs text-warm-500 mb-0.5">{report.previousMonth.monthLabel}</p>
            <p className="text-lg font-display font-semibold text-warm-900">
              {formatCurrency(report.previousMonth.total)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warm-200">
          <CardContent className="p-3">
            <p className="text-xs text-warm-500 mb-0.5">{report.currentMonth.monthLabel}</p>
            <p className="text-lg font-display font-semibold text-warm-900">
              {formatCurrency(report.currentMonth.total)}
            </p>
          </CardContent>
        </Card>
        <Card className={cn(
          'border-warm-200',
          isUp ? 'bg-red-50/50' : isDown ? 'bg-lime-50/50' : '',
        )}>
          <CardContent className="p-3">
            <p className="text-xs text-warm-500 mb-0.5">Net Change</p>
            <div className="flex items-center gap-1.5">
              {isUp && <TrendingUp className="h-4 w-4 text-red-500" />}
              {isDown && <TrendingDown className="h-4 w-4 text-lime-600" />}
              {isFlat && <Minus className="h-4 w-4 text-warm-400" />}
              <span className={cn(
                'text-lg font-display font-semibold',
                isUp ? 'text-red-600' : isDown ? 'text-lime-700' : 'text-warm-600',
              )}>
                {isFlat ? 'No change' : `${isUp ? '+' : ''}${formatCurrency(report.totalDelta)}`}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warm-200">
          <CardContent className="p-3">
            <p className="text-xs text-warm-500 mb-0.5">Facilities Changed</p>
            <p className="text-lg font-display font-semibold text-warm-900">
              {report.changedCount}
              <span className="text-sm font-normal text-warm-500 ml-1">
                of {report.facilities.length}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Changed facilities table */}
      {changed.length > 0 ? (
        <Card className="border-warm-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-medium text-warm-900">
              Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-warm-200 hover:bg-transparent">
                    <TableHead className="text-warm-600 text-xs font-medium">Facility</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium">Type</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium text-right">
                      {report.previousMonth.monthLabel}
                    </TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium text-center w-8" />
                    <TableHead className="text-warm-600 text-xs font-medium text-right">
                      {report.currentMonth.monthLabel}
                    </TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium text-right">Delta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {changed.map((f) => (
                    <DeltaRow key={f.facilityProfileId} facility={f} />
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-warm-200 bg-warm-50 font-medium">
                    <TableCell colSpan={2} className="text-sm text-warm-800">
                      Net Impact
                    </TableCell>
                    <TableCell />
                    <TableCell className="text-right text-sm text-warm-800">
                      {formatCurrency(changed.reduce((s, f) => s + f.previousTotal, 0))}
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-3 w-3 text-warm-400 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right text-sm text-warm-800">
                      {formatCurrency(changed.reduce((s, f) => s + f.currentTotal, 0))}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right text-sm font-semibold',
                      report.totalDelta > 0 ? 'text-red-600' : report.totalDelta < 0 ? 'text-lime-700' : 'text-warm-600',
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
        <Card className="border-warm-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Equal className="h-8 w-8 text-warm-300 mb-3" />
            <p className="text-sm font-medium text-warm-700">No changes between months</p>
            <p className="text-xs text-warm-500 mt-1">
              All facilities have the same billing totals.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Unchanged facilities (collapsible) */}
      {unchanged.length > 0 && (
        <div>
          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="text-xs text-warm-500 hover:text-warm-700 transition-colors"
          >
            {showUnchanged ? 'Hide' : 'Show'} {unchanged.length} unchanged {unchanged.length === 1 ? 'facility' : 'facilities'}
          </button>
          {showUnchanged && (
            <Card className="border-warm-200 mt-2">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableBody>
                      {unchanged.map((f) => (
                        <TableRow key={f.facilityProfileId} className="border-warm-200 opacity-60">
                          <TableCell className="py-2 text-sm text-warm-700">{f.locationName}</TableCell>
                          <TableCell className="py-2 text-xs text-warm-500">{f.currentStatus.replace('_', ' ')}</TableCell>
                          <TableCell className="py-2 text-right text-sm text-warm-700">
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
  const typeConfig: Record<string, { label: string; icon: typeof Plus; color: string }> = {
    added: { label: 'Added', icon: Plus, color: 'bg-lime-100 text-lime-700 border-lime-200' },
    removed: { label: 'Removed', icon: X, color: 'bg-red-100 text-red-700 border-red-200' },
    changed: { label: 'Changed', icon: ArrowRight, color: 'bg-orange-100 text-orange-700 border-orange-200' },
    unchanged: { label: 'Same', icon: Equal, color: 'bg-warm-100 text-warm-500 border-warm-200' },
  }

  const config = typeConfig[f.changeType]
  const Icon = config.icon
  const deltaPositive = f.totalDelta > 0
  const deltaNegative = f.totalDelta < 0

  return (
    <TableRow className="border-warm-200">
      <TableCell className="py-2">
        <span className="text-sm text-warm-800">{f.locationName}</span>
        {f.category && (
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-warm-200 text-warm-500">
            {f.category}
          </Badge>
        )}
      </TableCell>
      <TableCell className="py-2">
        <Badge className={cn('text-[10px] px-1.5 py-0 rounded-sm', config.color)}>
          <Icon className="h-2.5 w-2.5 mr-0.5" />
          {config.label}
        </Badge>
      </TableCell>
      <TableCell className="py-2 text-xs text-warm-600">
        {f.previousStatus !== '-' && f.currentStatus !== '-' && f.previousStatus !== f.currentStatus ? (
          <span>
            {f.previousStatus.replace('_', ' ')}
            <ArrowRight className="inline h-3 w-3 mx-0.5 text-warm-400" />
            {f.currentStatus.replace('_', ' ')}
          </span>
        ) : (
          <span>{(f.currentStatus !== '-' ? f.currentStatus : f.previousStatus).replace('_', ' ')}</span>
        )}
      </TableCell>
      <TableCell className="py-2 text-right text-sm text-warm-700">
        {f.isNew ? '-' : formatCurrency(f.previousTotal)}
      </TableCell>
      <TableCell className="py-2 text-center">
        <ArrowRight className="h-3 w-3 text-warm-400 mx-auto" />
      </TableCell>
      <TableCell className="py-2 text-right text-sm text-warm-700">
        {f.isRemoved ? '-' : formatCurrency(f.currentTotal)}
      </TableCell>
      <TableCell className={cn(
        'py-2 text-right text-sm font-medium',
        deltaPositive ? 'text-red-600' : deltaNegative ? 'text-lime-700' : 'text-warm-500',
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
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-warm-200">
            <CardContent className="p-3">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-warm-200">
        <CardHeader className="pb-3">
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
