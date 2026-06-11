import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/format'

export interface CashFlowMonth {
  label: string
  value: number
}

/**
 * Mini 6-month net cash flow strip — mono kicker, mono signed value
 * (green positive / coral negative), tiny bars with the latest month gold.
 * Data comes from MonthlyFinancialSnapshot (SUPER_ADMIN only).
 */
export function NetCashFlowCard({ months }: { months: CashFlowMonth[] }) {
  if (months.length === 0) return null

  const latest = months[months.length - 1]
  const maxAbs = Math.max(...months.map(m => Math.abs(m.value)), 1)

  return (
    <div className="rounded-[14px] border border-border bg-card p-[18px] shadow-soft dark:shadow-none">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="kicker text-muted-foreground">
          Net cash flow · {months.length} mo
        </span>
        <span
          className={cn(
            'font-mono text-xs tabular-nums',
            latest.value >= 0
              ? 'text-green-600 dark:text-green-300'
              : 'text-coral-600 dark:text-coral-300'
          )}
        >
          {latest.value >= 0 ? '+' : ''}
          {formatMoney(latest.value)}
        </span>
      </div>
      <div className="flex h-[52px] items-end gap-1.5">
        {months.map((month, i) => {
          const isCurrent = i === months.length - 1
          const height = Math.max(Math.round((Math.abs(month.value) / maxAbs) * 100), 8)
          return (
            <div
              key={`${month.label}-${i}`}
              title={`${month.label} ${formatMoney(month.value)}`}
              className={cn(
                'flex-1 rounded-[4px] border',
                isCurrent
                  ? 'border-gold-600/30 bg-gold-600 dark:border-gold-400/25 dark:bg-gold-400'
                  : month.value < 0
                    ? 'border-coral-600/30 bg-coral-600/15 dark:border-coral-300/25 dark:bg-coral-300/15'
                    : 'border-border bg-secondary'
              )}
              style={{ height: `${height}%` }}
            />
          )
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[9.5px] uppercase text-muted-foreground">
        <span>{months[0].label}</span>
        <span>{latest.label}</span>
      </div>
    </div>
  )
}
