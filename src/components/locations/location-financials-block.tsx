import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { formatMargin, type FinancialSummary } from '@/lib/financials'
import { formatMoney, moneyClass } from '@/lib/format'
import { marginTone } from './tones'
import { cn } from '@/lib/utils'
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
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Financials</CardTitle>
            <CardDescription className="text-xs">
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
            <div className="flex items-center gap-1.5 kicker text-muted-foreground">
              <Lock className="size-3" />
              Super admin
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Revenue</p>
            <p className={cn('mt-1 font-display text-lg font-bold text-foreground', moneyClass)}>
              {formatMoney(summary.monthlyRevenue)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Cost</p>
            <p className={cn('mt-1 font-display text-lg font-bold text-foreground', moneyClass)}>
              {formatMoney(summary.monthlyCost)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Profit</p>
            <p
              className={cn(
                'mt-1 font-display text-lg font-bold',
                moneyClass,
                marginTone(summary.marginPct)
              )}
            >
              {formatMoney(summary.monthlyProfit)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Margin</p>
            <p
              className={cn(
                'mt-1 font-display text-lg font-bold',
                moneyClass,
                marginTone(summary.marginPct)
              )}
            >
              {formatMargin(summary.marginPct)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-[10px] border border-border p-2">
            <p className="kicker text-muted-foreground">Labor</p>
            <p className={cn('text-foreground', moneyClass)}>
              {agreement.monthlyLaborCost !== null ? formatMoney(agreement.monthlyLaborCost) : '—'}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-2">
            <p className="kicker text-muted-foreground">Materials</p>
            <p className={cn('text-foreground', moneyClass)}>
              {agreement.monthlyMaterialCost !== null ? formatMoney(agreement.monthlyMaterialCost) : '—'}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-2">
            <p className="kicker text-muted-foreground">Other</p>
            <p className={cn('text-foreground', moneyClass)}>
              {agreement.monthlyOtherCost !== null ? formatMoney(agreement.monthlyOtherCost) : '—'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
