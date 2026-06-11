import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { formatMargin, type FinancialSummary } from '@/lib/financials'
import { formatMoney } from '@/lib/format'
import { FinancialsQuickEditDialog } from './financials-quick-edit-dialog'
import { marginToneClass } from './margin-tone'

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
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Financials</CardTitle>
            <CardDescription className="text-xs">
              Per-location P&amp;L. Edit cost values via the service agreement form.
            </CardDescription>
          </div>
          <div className="kicker flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3 w-3" />
            Super admin only
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4">
        {/* Summary tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Monthly Revenue</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
              {formatMoney(summary.monthlyRevenue)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Monthly Cost</p>
            <p className="mt-1 font-display text-xl font-bold tabular-nums text-foreground">
              {formatMoney(summary.monthlyCost)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Monthly Profit</p>
            <p
              className={`mt-1 font-display text-xl font-bold tabular-nums ${marginToneClass(summary.marginPct)}`}
            >
              {formatMoney(summary.monthlyProfit)}
            </p>
          </div>
          <div className="rounded-[10px] border border-border p-3">
            <p className="kicker text-muted-foreground">Margin</p>
            <p
              className={`mt-1 font-display text-xl font-bold tabular-nums ${marginToneClass(summary.marginPct)}`}
            >
              {formatMargin(summary.marginPct)}
            </p>
          </div>
        </div>

        {/* Per-location table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="kicker py-2 pr-3 text-left font-normal text-muted-foreground">Location</th>
                <th className="kicker px-3 py-2 text-right font-normal text-muted-foreground">Revenue</th>
                <th className="kicker px-3 py-2 text-right font-normal text-muted-foreground">Labor</th>
                <th className="kicker px-3 py-2 text-right font-normal text-muted-foreground">Materials</th>
                <th className="kicker px-3 py-2 text-right font-normal text-muted-foreground">Other</th>
                <th className="kicker px-3 py-2 text-right font-normal text-muted-foreground">Profit</th>
                <th className="kicker px-3 py-2 text-right font-normal text-muted-foreground">Margin</th>
                <th className="py-2 pl-3 text-right" />
              </tr>
            </thead>
            <tbody>
              {agreements.map((a) => {
                const totalCost = (a.monthlyLaborCost ?? 0) + (a.monthlyMaterialCost ?? 0) + (a.monthlyOtherCost ?? 0)
                const profit = a.monthlyAmount - totalCost
                const margin = a.monthlyAmount > 0 ? (profit / a.monthlyAmount) * 100 : null
                return (
                  <tr key={a.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 text-foreground">{a.locationName}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                      {formatMoney(a.monthlyAmount)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {a.monthlyLaborCost !== null ? formatMoney(a.monthlyLaborCost) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {a.monthlyMaterialCost !== null ? formatMoney(a.monthlyMaterialCost) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                      {a.monthlyOtherCost !== null ? formatMoney(a.monthlyOtherCost) : '—'}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${marginToneClass(margin)}`}>
                      {formatMoney(profit)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono tabular-nums ${marginToneClass(margin)}`}>
                      {formatMargin(margin)}
                    </td>
                    <td className="py-1 pl-3 text-right">
                      <FinancialsQuickEditDialog
                        agreementId={a.id}
                        locationName={a.locationName}
                        initial={{
                          monthlyAmount: a.monthlyAmount,
                          monthlyLaborCost: a.monthlyLaborCost,
                          monthlyMaterialCost: a.monthlyMaterialCost,
                          monthlyOtherCost: a.monthlyOtherCost,
                        }}
                      />
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
