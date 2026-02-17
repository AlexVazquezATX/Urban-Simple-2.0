'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BillingPreview, FacilityLineItem } from '@/lib/billing/billing-types'

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

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDays(days: number[]): string {
  if (days.length === 0) return '-'
  if (days.length === 7) return 'Every day'
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 5 && sorted.join(',') === '1,2,3,4,5') return 'Mon-Fri'
  if (sorted.length === 6 && sorted.join(',') === '1,2,3,4,5,6') return 'Mon-Sat'
  return sorted.map(d => DAY_LABELS[d]).join(', ')
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-lime-500',
    PAUSED: 'bg-yellow-500',
    SEASONAL_PAUSED: 'bg-orange-400',
    PENDING_APPROVAL: 'bg-warm-400',
    CLOSED: 'bg-red-400',
  }
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || 'bg-warm-300'}`} />
  )
}

interface BillingPreviewTabProps {
  clientId: string
}

export function BillingPreviewTab({ clientId }: BillingPreviewTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [preview, setPreview] = useState<BillingPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/billing-preview?year=${year}&month=${month}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load billing preview')
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
    fetchPreview()
  }, [fetchPreview])

  const goToPreviousMonth = () => {
    if (month === 1) {
      setYear(y => y - 1)
      setMonth(12)
    } else {
      setMonth(m => m - 1)
    }
  }

  const goToNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1)
      setMonth(1)
    } else {
      setMonth(m => m + 1)
    }
  }

  const goToCurrentMonth = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  const handleExportCsv = () => {
    window.open(`/api/clients/${clientId}/billing-preview/export?year=${year}&month=${month}`, '_blank')
  }

  const handleExportPdf = () => {
    window.open(`/api/clients/${clientId}/billing-preview/export-pdf?year=${year}&month=${month}`, '_blank')
  }

  const handleExportQb = () => {
    window.open(`/api/clients/${clientId}/billing-preview/export-qb?year=${year}&month=${month}`, '_blank')
  }

  const handleToggleFacility = async (facilityId: string, activate: boolean) => {
    setToggling(facilityId)
    try {
      const res = await fetch(`/api/clients/${clientId}/facilities/${facilityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: activate ? 'ACTIVE' : 'PAUSED' }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update')
      }
      toast.success(`Facility ${activate ? 'activated' : 'paused'}`)
      fetchPreview() // re-fetch to reflect updated totals
    } catch (err: any) {
      toast.error(err.message || 'Failed to update facility')
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return <BillingPreviewSkeleton />
  }

  if (error) {
    return (
      <Card className="border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm text-warm-600 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPreview} className="rounded-sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!preview) return null

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousMonth}
            className="rounded-sm border-warm-200 h-8 w-8"
          >
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

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="rounded-sm border-warm-200 h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToCurrentMonth}
              className="rounded-sm text-ocean-600 text-xs ml-1"
            >
              Today
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-sm border-warm-200 text-warm-700"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportPdf}>
              <FileDown className="h-3.5 w-3.5 mr-2" />
              PDF Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCsv}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
              CSV Spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportQb}>
              <FileText className="h-3.5 w-3.5 mr-2" />
              QuickBooks CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <SummaryCard
          label="Subtotal"
          value={formatCurrency(preview.subtotal)}
        />
        <SummaryCard
          label={`Tax (${formatPercent(preview.taxRate)})`}
          value={formatCurrency(preview.taxAmount)}
        />
        <SummaryCard
          label="Total"
          value={formatCurrency(preview.total)}
          highlight
        />
        <DeltaCard
          currentTotal={preview.total}
          previousTotal={preview.previousMonthTotal}
          deltaAmount={preview.explanation.deltaAmount}
        />
      </div>

      {/* Line items table */}
      <Card className="border-warm-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display font-medium text-warm-900">
              Facility Line Items
            </CardTitle>
            <span className="text-xs text-warm-500">
              {preview.activeFacilityCount} of {preview.totalFacilityCount} active
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {preview.lineItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <FileText className="h-8 w-8 text-warm-300 mb-3" />
              <p className="text-sm text-warm-500">
                No facility profiles configured for this client.
              </p>
              <p className="text-xs text-warm-400 mt-1">
                Add facilities in the Facilities tab to generate billing previews.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-warm-200 hover:bg-transparent">
                    <TableHead className="text-warm-600 text-xs font-medium">Facility</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium">Status</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium">Schedule</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium text-right">Rate</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium text-right">Tax</TableHead>
                    <TableHead className="text-warm-600 text-xs font-medium text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.lineItems.map((li) => (
                    <LineItemRow
                      key={li.facilityProfileId}
                      item={li}
                      toggling={toggling}
                      onToggle={handleToggleFacility}
                    />
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-warm-200 bg-warm-50 font-medium">
                    <TableCell colSpan={3} className="text-sm text-warm-800">
                      Total ({preview.activeFacilityCount} facilities)
                    </TableCell>
                    <TableCell className="text-right text-sm text-warm-800">
                      {formatCurrency(preview.subtotal)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-warm-800">
                      {formatCurrency(preview.taxAmount)}
                    </TableCell>
                    <TableCell className="text-right text-sm text-warm-900 font-semibold">
                      {formatCurrency(preview.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explanation panel */}
      <ExplanationPanel preview={preview} />
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card className={`border-warm-200 ${highlight ? 'bg-ocean-50 border-ocean-200' : ''}`}>
      <CardContent className="p-3">
        <p className="text-xs text-warm-500 mb-0.5">{label}</p>
        <p className={`text-lg font-display font-semibold ${highlight ? 'text-ocean-700' : 'text-warm-900'}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function DeltaCard({
  currentTotal,
  previousTotal,
  deltaAmount,
}: {
  currentTotal: number
  previousTotal: number | null
  deltaAmount: number | null
}) {
  if (previousTotal === null || deltaAmount === null) {
    return (
      <Card className="border-warm-200">
        <CardContent className="p-3">
          <p className="text-xs text-warm-500 mb-0.5">vs. Prior Month</p>
          <p className="text-sm text-warm-400">No data</p>
        </CardContent>
      </Card>
    )
  }

  const isUp = deltaAmount > 0
  const isDown = deltaAmount < 0
  const isFlat = deltaAmount === 0

  return (
    <Card className={`border-warm-200 ${isUp ? 'bg-red-50/50' : isDown ? 'bg-lime-50/50' : ''}`}>
      <CardContent className="p-3">
        <p className="text-xs text-warm-500 mb-0.5">vs. Prior Month</p>
        <div className="flex items-center gap-1.5">
          {isUp && <TrendingUp className="h-4 w-4 text-red-500" />}
          {isDown && <TrendingDown className="h-4 w-4 text-lime-600" />}
          {isFlat && <Minus className="h-4 w-4 text-warm-400" />}
          <span className={`text-lg font-display font-semibold ${
            isUp ? 'text-red-600' : isDown ? 'text-lime-700' : 'text-warm-600'
          }`}>
            {isFlat ? 'No change' : `${isUp ? '+' : ''}${formatCurrency(deltaAmount)}`}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function LineItemRow({
  item,
  toggling,
  onToggle,
}: {
  item: FacilityLineItem
  toggling: string | null
  onToggle: (facilityId: string, activate: boolean) => void
}) {
  const dimmed = !item.includedInTotal
  const canToggle = item.effectiveStatus === 'ACTIVE' || item.effectiveStatus === 'PAUSED'

  return (
    <TableRow className={`border-warm-200 ${dimmed ? 'opacity-50' : ''}`}>
      <TableCell className="py-2">
        <div className="flex items-center gap-2">
          {canToggle ? (
            <Switch
              checked={item.effectiveStatus === 'ACTIVE'}
              disabled={toggling === item.facilityProfileId}
              onCheckedChange={(checked) => onToggle(item.facilityProfileId, checked)}
              className="data-[state=checked]:bg-lime-500 data-[state=unchecked]:bg-warm-300"
            />
          ) : (
            <StatusDot status={item.effectiveStatus} />
          )}
          <div>
            <span className="text-sm text-warm-800">{item.locationName}</span>
            {item.category && (
              <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 border-warm-200 text-warm-500">
                {item.category}
              </Badge>
            )}
            {item.isOverridden && (
              <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">
                Override
              </Badge>
            )}
            {item.isSeasonallyPaused && (
              <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-700 border-yellow-200">
                Seasonal
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2 text-xs text-warm-600">
        {item.effectiveStatus.replace('_', ' ')}
      </TableCell>
      <TableCell className="py-2 text-xs text-warm-600">
        {item.includedInTotal ? `${item.effectiveFrequency}x/wk · ${formatDays(item.effectiveDaysOfWeek)}` : '-'}
      </TableCell>
      <TableCell className="py-2 text-right text-sm text-warm-800">
        {item.includedInTotal ? (
          <div>
            {formatCurrency(item.effectiveRate)}
            {item.isProRated && (
              <div className="text-[10px] text-orange-600 font-normal">
                {item.activeDays} of {item.scheduledDays} days
              </div>
            )}
          </div>
        ) : (
          <span className="line-through text-warm-400">{formatCurrency(item.effectiveRate)}</span>
        )}
      </TableCell>
      <TableCell className="py-2 text-right text-xs text-warm-600">
        {item.includedInTotal ? formatCurrency(item.lineItemTax) : '-'}
      </TableCell>
      <TableCell className="py-2 text-right text-sm font-medium text-warm-800">
        {item.includedInTotal ? (
          <div>
            {formatCurrency(item.lineItemTotal)}
            {item.isProRated && (
              <Badge className="ml-1 text-[9px] px-1 py-0 bg-orange-100 text-orange-700 border-orange-200">
                Pro-rated
              </Badge>
            )}
          </div>
        ) : '$0.00'}
      </TableCell>
    </TableRow>
  )
}

function ExplanationPanel({ preview }: { preview: BillingPreview }) {
  const { explanation } = preview
  const hasContent =
    explanation.seasonallyPaused.length > 0 ||
    explanation.pausedFacilities.length > 0 ||
    explanation.pendingApproval.length > 0 ||
    explanation.closedFacilities.length > 0 ||
    explanation.overrides.length > 0 ||
    explanation.deltaReason

  if (!hasContent) return null

  return (
    <Card className="border-warm-200 bg-warm-50/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-display font-medium text-warm-800">
          Billing Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-warm-600">
        {explanation.seasonallyPaused.length > 0 && (
          <div>
            <span className="font-medium text-orange-700">Seasonally paused:</span>{' '}
            {explanation.seasonallyPaused.join(', ')}
          </div>
        )}
        {explanation.pausedFacilities.length > 0 && (
          <div>
            <span className="font-medium text-yellow-700">Paused:</span>{' '}
            {explanation.pausedFacilities.join(', ')}
          </div>
        )}
        {explanation.pendingApproval.length > 0 && (
          <div>
            <span className="font-medium text-warm-700">Pending approval:</span>{' '}
            {explanation.pendingApproval.join(', ')}
          </div>
        )}
        {explanation.closedFacilities.length > 0 && (
          <div>
            <span className="font-medium text-red-700">Closed:</span>{' '}
            {explanation.closedFacilities.join(', ')}
          </div>
        )}
        {explanation.overrides.length > 0 && (
          <div>
            <span className="font-medium text-orange-700">Overrides this month:</span>
            <ul className="mt-1 ml-4 list-disc space-y-0.5">
              {explanation.overrides.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {explanation.deltaReason && (
          <div className="pt-1 border-t border-warm-200">
            <span className="font-medium text-warm-700">Month-over-month:</span>{' '}
            {explanation.deltaReason}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BillingPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-[130px]" />
          <Skeleton className="h-8 w-[85px]" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-8 w-28" />
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
          <Skeleton className="h-4 w-40" />
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
