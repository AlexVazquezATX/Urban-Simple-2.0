import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import {
  formatCurrency,
  formatMargin,
  marginToneClass,
  type FinancialSummary,
} from '@/lib/financials'

interface AgreementRow {
  id: string
  description: string
  locationName: string
  monthlyAmount: number
  monthlyLaborCost: number | null
  monthlyMaterialCost: number | null
  monthlyOtherCost: number | null
}

interface ClientFinancialsBlockProps {
  summary: FinancialSummary
  agreements: AgreementRow[]
}

export function ClientFinancialsBlock({ summary, agreements }: ClientFinancialsBlockProps) {
  if (summary.agreementCount === 0) {
    return null
  }

  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
              Financials
            </CardTitle>
            <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
              Per-location P&L. Edit cost values via the service agreement form.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">
            <Lock className="h-3 w-3" />
            Super admin only
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Monthly Revenue</p>
            <p className="mt-1 text-xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.monthlyRevenue)}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Monthly Cost</p>
            <p className="mt-1 text-xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.monthlyCost)}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Monthly Profit</p>
            <p className={`mt-1 text-xl font-bold ${marginToneClass(summary.marginPct)}`}>
              {formatCurrency(summary.monthlyProfit)}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Margin</p>
            <p className={`mt-1 text-xl font-bold ${marginToneClass(summary.marginPct)}`}>
              {formatMargin(summary.marginPct)}
            </p>
          </div>
        </div>

        {/* Per-location table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 dark:border-charcoal-700 text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">
                <th className="py-2 pr-3 text-left">Location</th>
                <th className="py-2 px-3 text-right">Revenue</th>
                <th className="py-2 px-3 text-right">Labor</th>
                <th className="py-2 px-3 text-right">Materials</th>
                <th className="py-2 px-3 text-right">Other</th>
                <th className="py-2 px-3 text-right">Profit</th>
                <th className="py-2 pl-3 text-right">Margin</th>
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => {
                const totalCost = (a.monthlyLaborCost ?? 0) + (a.monthlyMaterialCost ?? 0) + (a.monthlyOtherCost ?? 0)
                const profit = a.monthlyAmount - totalCost
                const margin = a.monthlyAmount > 0 ? (profit / a.monthlyAmount) * 100 : null
                return (
                  <tr key={a.id} className="border-b border-warm-100 dark:border-charcoal-800/60">
                    <td className="py-2 pr-3 text-warm-900 dark:text-cream-100">{a.locationName}</td>
                    <td className="py-2 px-3 text-right font-mono text-warm-700 dark:text-cream-300">
                      {formatCurrency(a.monthlyAmount)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-warm-600 dark:text-cream-400">
                      {a.monthlyLaborCost !== null ? formatCurrency(a.monthlyLaborCost) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-warm-600 dark:text-cream-400">
                      {a.monthlyMaterialCost !== null ? formatCurrency(a.monthlyMaterialCost) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-warm-600 dark:text-cream-400">
                      {a.monthlyOtherCost !== null ? formatCurrency(a.monthlyOtherCost) : '—'}
                    </td>
                    <td className={`py-2 px-3 text-right font-mono ${marginToneClass(margin)}`}>
                      {formatCurrency(profit)}
                    </td>
                    <td className={`py-2 pl-3 text-right font-mono ${marginToneClass(margin)}`}>
                      {formatMargin(margin)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
