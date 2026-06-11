import { Building2, DollarSign, TrendingUp, PiggyBank, Percent } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { formatMoney } from '@/lib/format'
import { formatMargin } from '@/lib/financials'

/**
 * The 5-card financial KPI row shared by Clients and Locations — one
 * component so the two screens can never drift apart.
 */
export function FinancialKPIRow({
  locationsServiced,
  mrr,
  arr,
  monthlyProfit,
  blendedMarginPct,
}: {
  locationsServiced: number
  mrr: number
  arr: number
  monthlyProfit: number
  blendedMarginPct: number | null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Locations serviced" value={locationsServiced} icon={Building2} />
      <StatCard
        label="MRR"
        value={<span className="font-mono">{formatMoney(mrr)}</span>}
        icon={DollarSign}
      />
      <StatCard
        label="ARR"
        value={<span className="font-mono">{formatMoney(arr)}</span>}
        icon={TrendingUp}
      />
      <StatCard
        label="Monthly profit"
        value={<span className="font-mono">{formatMoney(monthlyProfit)}</span>}
        icon={PiggyBank}
        tone={monthlyProfit < 0 ? 'coral' : 'neutral'}
      />
      <StatCard
        label="Blended margin"
        value={<span className="font-mono">{formatMargin(blendedMarginPct)}</span>}
        icon={Percent}
      />
    </div>
  )
}
