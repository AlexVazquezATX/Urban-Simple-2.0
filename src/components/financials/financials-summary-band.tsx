import { Lock } from 'lucide-react'
import {
  formatMargin,
  type FinancialsBandData,
} from '@/lib/financials'
import { formatMoney } from '@/lib/format'
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

// Margin tone — negative is attention (coral), thin is gold, healthy is green.
// Never red: red is reserved for destructive confirms + the AR 90+ bucket.
function marginTone(marginPct: number | null): string {
  if (marginPct === null) return 'text-muted-foreground'
  if (marginPct < 0) return 'text-coral-600 dark:text-coral-300'
  if (marginPct < 20) return 'text-gold-600 dark:text-gold-400'
  return 'text-green-600 dark:text-green-300'
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
    <div className="rounded-[14px] border border-border bg-card p-3.5 shadow-soft dark:shadow-none">
      <p className="kicker text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1.5 font-display text-xl font-bold tabular-nums text-foreground',
          valueClass
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
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
      <div className="rounded-[14px] border border-border bg-secondary/40 px-4 py-3">
        <p className="kicker text-muted-foreground">{locationsLabel}</p>
        <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
          {locationsServiced}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label={locationsLabel} value={String(locationsServiced)} sub="with active billing" />
        <Tile label="MRR" value={formatMoney(data.mrr)} sub="monthly recurring" />
        <Tile label="ARR" value={formatMoney(data.arr)} sub="annualized" />
        <Tile
          label="Monthly Profit"
          value={formatMoney(data.monthlyProfit)}
          valueClass={marginTone(data.blendedMarginPct)}
        />
        <Tile
          label="Blended Margin"
          value={formatMargin(data.blendedMarginPct)}
          valueClass={marginTone(data.blendedMarginPct)}
        />
      </div>
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" />
        Gross P&amp;L from service agreements{scopeLabel ? ` · ${scopeLabel}` : ''}. Overhead-inclusive
        net lives on the Financials dashboard.
      </p>
    </div>
  )
}
