import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import {
  formatCurrency,
  formatMargin,
  marginToneClass,
  type FinancialSummary,
} from '@/lib/financials'
import { FinancialsQuickEditDialog } from '@/components/clients/financials-quick-edit-dialog'

interface LocationFinancialsBlockProps {
  summary: FinancialSummary
  locationName: string
  agreement: {
    id: string
    description: string
    monthlyAmount: number
    monthlyLaborCost: number | null
    monthlyMaterialCost: number | null
    monthlyOtherCost: number | null
    startDate: string
    paymentTerms: string
    billingDay: number
  }
}

export function LocationFinancialsBlock({
  summary,
  agreement,
  locationName,
}: LocationFinancialsBlockProps) {
  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
              Financials
            </CardTitle>
            <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
              {agreement.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <FinancialsQuickEditDialog
              agreementId={agreement.id}
              locationName={locationName}
              initial={{
                monthlyAmount: agreement.monthlyAmount,
                monthlyLaborCost: agreement.monthlyLaborCost,
                monthlyMaterialCost: agreement.monthlyMaterialCost,
                monthlyOtherCost: agreement.monthlyOtherCost,
              }}
            />
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">
              <Lock className="h-3 w-3" />
              Super admin
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Revenue</p>
            <p className="mt-1 text-lg font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.monthlyRevenue)}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Cost</p>
            <p className="mt-1 text-lg font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.monthlyCost)}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Profit</p>
            <p className={`mt-1 text-lg font-bold ${marginToneClass(summary.marginPct)}`}>
              {formatCurrency(summary.monthlyProfit)}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-3">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Margin</p>
            <p className={`mt-1 text-lg font-bold ${marginToneClass(summary.marginPct)}`}>
              {formatMargin(summary.marginPct)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-2">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Labor</p>
            <p className="font-mono text-warm-900 dark:text-cream-100">
              {agreement.monthlyLaborCost !== null ? formatCurrency(agreement.monthlyLaborCost) : '—'}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-2">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Materials</p>
            <p className="font-mono text-warm-900 dark:text-cream-100">
              {agreement.monthlyMaterialCost !== null ? formatCurrency(agreement.monthlyMaterialCost) : '—'}
            </p>
          </div>
          <div className="rounded-sm border border-warm-200 dark:border-charcoal-700 p-2">
            <p className="text-[10px] uppercase tracking-wider text-warm-500 dark:text-cream-400">Other</p>
            <p className="font-mono text-warm-900 dark:text-cream-100">
              {agreement.monthlyOtherCost !== null ? formatCurrency(agreement.monthlyOtherCost) : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
