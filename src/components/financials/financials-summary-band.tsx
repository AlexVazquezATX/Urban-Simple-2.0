import { Lock } from 'lucide-react'
import {
  formatCurrency,
  formatMargin,
  marginToneClass,
  type FinancialsBandData,
} from '@/lib/financials'
import { cn } from '@/lib/utils'

interface FinancialsSummaryBandProps {
  // 'admin' shows the full money band; 'plain' shows only the locations count.
  variant: 'admin' | 'plain'
  locationsServiced: number
  // Money figures. Only passed for SUPER_ADMIN — never computed for others, so
  // financial data never reaches the client bundle for non-admins.
  data?: FinancialsBandData | null
  // Optional scope hint, e.g. "Portfolio", a client name, or a location name.
  scopeLabel?: string
}

function Tile({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-sm border border-warm-200 bg-white p-3 dark:border-charcoal-700 dark:bg-charcoal-900">
      <p className="text-[10px] font-medium uppercase tracking-wider text-warm-500 dark:text-cream-400">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-xl font-semibold tabular-nums text-warm-900 dark:text-cream-100',
          valueClass
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-warm-400 dark:text-cream-500">{sub}</p>}
    </div>
  )
}

export function FinancialsSummaryBand({
  variant,
  locationsServiced,
  data,
  scopeLabel,
}: FinancialsSummaryBandProps) {
  const locationsLabel = locationsServiced === 1 ? 'Location Serviced' : 'Locations Serviced'

  // Non-admins: a single honest count, no money.
  if (variant === 'plain' || !data) {
    return (
      <div className="rounded-sm border border-warm-200 bg-warm-50/60 px-4 py-3 dark:border-charcoal-700 dark:bg-charcoal-900">
        <p className="text-[10px] font-medium uppercase tracking-wider text-warm-500 dark:text-cream-400">
          {locationsLabel}
        </p>
        <p className="mt-0.5 text-xl font-semibold text-warm-900 dark:text-cream-100">
          {locationsServiced}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label={locationsLabel} value={String(locationsServiced)} sub="with active billing" />
        <Tile label="MRR" value={formatCurrency(data.mrr)} sub="monthly recurring" />
        <Tile label="ARR" value={formatCurrency(data.arr)} sub="annualized" />
        <Tile
          label="Monthly Profit"
          value={formatCurrency(data.monthlyProfit)}
          valueClass={marginToneClass(data.blendedMarginPct)}
        />
        <Tile
          label="Blended Margin"
          value={formatMargin(data.blendedMarginPct)}
          valueClass={marginToneClass(data.blendedMarginPct)}
        />
      </div>
      <p className="flex items-center gap-1 text-[11px] text-warm-400 dark:text-cream-500">
        <Lock className="h-3 w-3 shrink-0" />
        Gross P&amp;L from service agreements{scopeLabel ? ` · ${scopeLabel}` : ''}. Overhead-inclusive
        net lives on the Financials dashboard.
      </p>
    </div>
  )
}
