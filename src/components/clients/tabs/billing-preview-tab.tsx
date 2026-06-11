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
import { EmptyState } from '@/components/ui/empty-state'
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
import { Plus, Wrench, Edit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoneyExact } from '@/lib/format'
import type { BillingPreview, FacilityLineItem, ServiceLineItemData } from '@/lib/billing/billing-types'
import { ServiceLineItemForm } from '@/components/forms/service-line-item-form'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Billing money always shows cents.
const formatCurrency = formatMoneyExact

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
    ACTIVE: 'bg-green-600 dark:bg-green-300',
    PAUSED: 'bg-gold-600 dark:bg-gold-400',
    SEASONAL_PAUSED: 'bg-teal-600 dark:bg-teal-300',
    PENDING_APPROVAL: 'bg-muted-foreground/50',
    CLOSED: 'bg-coral-600 dark:bg-coral-300',
  }
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[status] || 'bg-muted-foreground/40'}`} />
  )
}

interface BillingPreviewTabProps {
  clientId: string
  facilities?: Array<{ id: string; location: { name: string } }>
}

export function BillingPreviewTab({ clientId, facilities }: BillingPreviewTabProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [preview, setPreview] = useState<BillingPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [hideTax, setHideTax] = useState(false)

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

  const taxParam = hideTax ? '&hideTax=1' : ''

  const handleExportCsv = () => {
    window.open(`/api/clients/${clientId}/billing-preview/export?year=${year}&month=${month}${taxParam}`, '_blank')
  }

  const handleExportPdf = () => {
    window.open(`/api/clients/${clientId}/billing-preview/export-pdf?year=${year}&month=${month}${taxParam}`, '_blank')
  }

  const handleExportQb = () => {
    window.open(`/api/clients/${clientId}/billing-preview/export-qb?year=${year}&month=${month}${taxParam}`, '_blank')
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="mb-3 h-8 w-8 text-coral-600 dark:text-coral-300" />
          <p className="mb-4 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPreview}>
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
            size="icon-sm"
            onClick={goToPreviousMonth}
          >
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

          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToCurrentMonth}
              className="ml-1 text-xs"
            >
              Today
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <Switch checked={hideTax} onCheckedChange={setHideTax} />
            <span className="text-xs text-muted-foreground">Hide Tax</span>
          </label>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleExportPdf}>
              <FileDown className="h-3.5 w-3.5" />
              PDF Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCsv}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV Spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportQb}>
              <FileText className="h-3.5 w-3.5" />
              QuickBooks CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Summary cards */}
      <div className={`grid gap-3 grid-cols-2 ${hideTax ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}>
        <SummaryCard
          label="Subtotal"
          value={formatCurrency(preview.subtotal)}
        />
        {!hideTax && (
          <SummaryCard
            label={`Tax (${formatPercent(preview.taxRate)})`}
            value={formatCurrency(preview.taxAmount)}
          />
        )}
        <SummaryCard
          label="Total"
          value={formatCurrency(hideTax ? preview.subtotal : preview.total)}
          highlight
        />
        <DeltaCard
          currentTotal={hideTax ? preview.subtotal : preview.total}
          previousTotal={preview.previousMonthTotal}
          deltaAmount={preview.explanation.deltaAmount}
        />
      </div>

      {/* Line items table */}
      <Card className="gap-3">
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[15px]">Facility Line Items</CardTitle>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {preview.activeFacilityCount} of {preview.totalFacilityCount} active
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {preview.lineItems.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No facility profiles configured"
              description="Add facilities in the Facilities tab to generate billing previews."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">Facility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    {!hideTax && <TableHead className="text-right">Tax</TableHead>}
                    <TableHead className="pr-6 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.lineItems.map((li) => (
                    <LineItemRow
                      key={li.facilityProfileId}
                      item={li}
                      toggling={toggling}
                      onToggle={handleToggleFacility}
                      hideTax={hideTax}
                    />
                  ))}
                  {/* Facility subtotal row */}
                  {(() => {
                    const facilitySubtotal = preview.lineItems.reduce((s, li) => s + li.lineItemTotal, 0)
                    const facilityTax = preview.lineItems.reduce((s, li) => s + li.lineItemTax, 0)
                    return (
                      <TableRow className="bg-secondary/50 font-medium hover:bg-secondary/50">
                        <TableCell colSpan={3} className="pl-6 text-sm text-foreground">
                          Facility Subtotal ({preview.activeFacilityCount} active)
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                          {formatCurrency(facilitySubtotal)}
                        </TableCell>
                        {!hideTax && (
                          <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                            {formatCurrency(facilityTax)}
                          </TableCell>
                        )}
                        <TableCell className="pr-6 text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                          {formatCurrency(hideTax ? facilitySubtotal : facilitySubtotal + facilityTax)}
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Line Items */}
      <ServiceItemsSection
        clientId={clientId}
        preview={preview}
        facilities={facilities}
        year={year}
        month={month}
        onRefresh={fetchPreview}
        hideTax={hideTax}
      />

      {/* Grand total — only shown if there are service items */}
      {preview.serviceLineItems.length > 0 && (
        <Card className="border-gold-600/30 bg-gold-600/10 py-3 dark:border-gold-400/25 dark:bg-gold-400/12">
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-sm font-bold text-foreground">
                Grand Total (facilities + services)
              </p>
              <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                {formatCurrency(hideTax ? preview.subtotal : preview.total)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

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
    <Card
      className={cn(
        'gap-0 py-3',
        highlight &&
          'border-primary/30 bg-gradient-to-br from-primary/10 to-transparent dark:from-gold-400/12'
      )}
    >
      <CardContent className="px-4">
        <p className="kicker mb-1 text-muted-foreground">{label}</p>
        <p className="font-mono text-lg font-semibold tabular-nums text-foreground">{value}</p>
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
      <Card className="gap-0 py-3">
        <CardContent className="px-4">
          <p className="kicker mb-1 text-muted-foreground">vs. Prior Month</p>
          <p className="text-sm text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    )
  }

  const isUp = deltaAmount > 0
  const isDown = deltaAmount < 0
  const isFlat = deltaAmount === 0

  return (
    <Card className="gap-0 py-3">
      <CardContent className="px-4">
        <p className="kicker mb-1 text-muted-foreground">vs. Prior Month</p>
        <div className="flex items-center gap-1.5">
          {isUp && <TrendingUp className="h-4 w-4 text-coral-600 dark:text-coral-300" />}
          {isDown && <TrendingDown className="h-4 w-4 text-green-600 dark:text-green-300" />}
          {isFlat && <Minus className="h-4 w-4 text-muted-foreground" />}
          <span
            className={cn(
              'font-mono text-lg font-semibold tabular-nums',
              isUp
                ? 'text-coral-600 dark:text-coral-300'
                : isDown
                  ? 'text-green-600 dark:text-green-300'
                  : 'text-muted-foreground'
            )}
          >
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
  hideTax,
}: {
  item: FacilityLineItem
  toggling: string | null
  onToggle: (facilityId: string, activate: boolean) => void
  hideTax?: boolean
}) {
  const dimmed = !item.includedInTotal
  const canToggle = item.effectiveStatus === 'ACTIVE' || item.effectiveStatus === 'PAUSED'

  return (
    <TableRow className={dimmed ? 'opacity-50' : ''}>
      <TableCell className="py-2 pl-6">
        <div className="flex items-center gap-2">
          {canToggle ? (
            <Switch
              checked={item.effectiveStatus === 'ACTIVE'}
              disabled={toggling === item.facilityProfileId}
              onCheckedChange={(checked) => onToggle(item.facilityProfileId, checked)}
            />
          ) : (
            <StatusDot status={item.effectiveStatus} />
          )}
          <div>
            <span className="text-sm text-foreground">{item.locationName}</span>
            {item.category && (
              <Badge variant="neutral" className="ml-2">
                {item.category}
              </Badge>
            )}
            {item.isOverridden && (
              <Badge variant="gold" className="ml-1">
                Override
              </Badge>
            )}
            {item.isSeasonallyPaused && (
              <Badge variant="teal" className="ml-1">
                Seasonal
              </Badge>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2 text-xs text-muted-foreground">
        {item.effectiveStatus.replace('_', ' ')}
      </TableCell>
      <TableCell className="py-2 font-mono text-xs tabular-nums text-muted-foreground">
        {item.includedInTotal ? `${item.effectiveFrequency}x/wk · ${formatDays(item.effectiveDaysOfWeek)}` : '-'}
      </TableCell>
      <TableCell className="py-2 text-right font-mono text-sm tabular-nums text-foreground">
        {item.includedInTotal ? (
          <div>
            {formatCurrency(item.effectiveRate)}
            {item.isProRated && (
              <div className="text-[10px] font-normal text-muted-foreground">
                {item.activeDays} of {item.scheduledDays} days
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground line-through">{formatCurrency(item.effectiveRate)}</span>
        )}
      </TableCell>
      {!hideTax && (
        <TableCell className="py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
          {item.includedInTotal ? formatCurrency(item.lineItemTax) : '-'}
        </TableCell>
      )}
      <TableCell className="py-2 pr-6 text-right font-mono text-sm font-medium tabular-nums text-foreground">
        {item.includedInTotal ? (
          <div className="flex items-center justify-end gap-1">
            {formatCurrency(hideTax ? item.lineItemTotal : item.lineItemTotal)}
            {item.isProRated && <Badge variant="gold">Pro-rated</Badge>}
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
    <Card className="gap-2 border-teal-600/30 bg-teal-600/10 py-4 dark:border-teal-300/25 dark:bg-teal-300/12">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">Billing Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 text-[13px] text-muted-foreground">
        {explanation.seasonallyPaused.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Seasonally paused:</span>{' '}
            {explanation.seasonallyPaused.join(', ')}
          </div>
        )}
        {explanation.pausedFacilities.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Paused:</span>{' '}
            {explanation.pausedFacilities.join(', ')}
          </div>
        )}
        {explanation.pendingApproval.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Pending approval:</span>{' '}
            {explanation.pendingApproval.join(', ')}
          </div>
        )}
        {explanation.closedFacilities.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Closed:</span>{' '}
            {explanation.closedFacilities.join(', ')}
          </div>
        )}
        {explanation.overrides.length > 0 && (
          <div>
            <span className="font-medium text-foreground">Overrides this month:</span>
            <ul className="ml-4 mt-1 list-disc space-y-0.5">
              {explanation.overrides.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
        )}
        {explanation.deltaReason && (
          <div className="border-t border-teal-600/30 pt-1 dark:border-teal-300/25">
            <span className="font-medium text-foreground">Month-over-month:</span>{' '}
            {explanation.deltaReason}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ServiceItemsSection({
  clientId,
  preview,
  facilities,
  year,
  month,
  onRefresh,
  hideTax,
}: {
  clientId: string
  preview: BillingPreview
  facilities?: Array<{ id: string; location: { name: string } }>
  year: number
  month: number
  onRefresh: () => void
  hideTax?: boolean
}) {
  const items = preview.serviceLineItems || []
  const serviceTotal = items.reduce((s, si) => s + si.lineItemTotal, 0)
  const serviceTax = items.reduce((s, si) => s + si.lineItemTax, 0)

  return (
    <Card className="gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-[15px]">Service Line Items</CardTitle>
            {items.length > 0 && (
              <Badge variant="neutral" className="font-mono">
                {items.length}
              </Badge>
            )}
          </div>
          <ServiceLineItemForm
            clientId={clientId}
            facilities={facilities}
            defaultYear={year}
            defaultMonth={month}
            onSuccess={onRefresh}
          >
            <Button variant="outline" size="sm" className="h-7 text-xs">
              <Plus className="h-3 w-3" />
              Add Service
            </Button>
          </ServiceLineItemForm>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No ad-hoc services this month"
            description="Add one-time charges like deep cleaning, high dusting, etc."
            className="py-8"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6">Description</TableHead>
                  <TableHead>Facility</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  {!hideTax && <TableHead className="text-right">Tax</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-8 pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((si) => (
                  <TableRow key={si.id}>
                    <TableCell className="py-2 pl-6">
                      <span className="text-sm text-foreground">{si.description}</span>
                      {si.notes && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{si.notes}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      {si.locationName || <span aria-hidden>—</span>}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {si.quantity !== 1 ? si.quantity : '1'}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(si.unitRate)}
                    </TableCell>
                    {!hideTax && (
                      <TableCell className="py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(si.lineItemTax)}
                      </TableCell>
                    )}
                    <TableCell className="py-2 text-right font-mono text-sm font-medium tabular-nums text-foreground">
                      {formatCurrency(si.lineItemTotal)}
                    </TableCell>
                    <TableCell className="py-2 pr-6">
                      <ServiceLineItemForm
                        clientId={clientId}
                        facilities={facilities}
                        item={si}
                        defaultYear={year}
                        defaultMonth={month}
                        onSuccess={onRefresh}
                      >
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${si.description}`}>
                          <Edit className="h-3 w-3" />
                        </Button>
                      </ServiceLineItemForm>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Service subtotal */}
                <TableRow className="bg-secondary/50 font-medium hover:bg-secondary/50">
                  <TableCell colSpan={hideTax ? 3 : 4} className="pl-6 text-sm text-foreground">
                    Service Subtotal
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                    {formatCurrency(serviceTotal)}
                  </TableCell>
                  {!hideTax && (
                    <TableCell className="text-right font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(serviceTax)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(hideTax ? serviceTotal : serviceTotal + serviceTax)}
                  </TableCell>
                  <TableCell className="pr-6" />
                </TableRow>
              </TableBody>
            </Table>
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
