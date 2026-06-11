'use client'

// Revenue-vs-cost trend for the Financials dashboard. Pure presentation —
// the server page aggregates monthly snapshots and passes plain numbers.
// Chart rules: revenue bars gold (current month emphasized), cost bars
// muted secondary with a border, 5px bar radius, no gridlines.

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { formatMoney } from '@/lib/format'

export interface TrendPoint {
  label: string
  revenue: number
  cost: number
  net: number
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload?: TrendPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point) return null
  return (
    <div className="rounded-[10px] border border-border bg-popover px-3 py-2.5 text-xs shadow-soft">
      <div className="kicker text-muted-foreground">{label}</div>
      <div className="mt-1.5 space-y-1 font-mono tabular-nums">
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Revenue</span>
          <span className="text-foreground">{formatMoney(point.revenue)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">All costs</span>
          <span className="text-foreground">{formatMoney(point.cost)}</span>
        </div>
        <div className="flex items-center justify-between gap-6">
          <span className="text-muted-foreground">Net cash flow</span>
          <span
            className={
              point.net < 0
                ? 'text-coral-600 dark:text-coral-300'
                : 'text-foreground'
            }
          >
            {formatMoney(point.net)}
          </span>
        </div>
      </div>
    </div>
  )
}

export function FinancialsTrendChart({ data }: { data: TrendPoint[] }) {
  const lastIndex = data.length - 1
  return (
    <div>
      <div className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barGap={5}>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              tick={{ fontSize: 10, fontFamily: 'var(--font-mono)', fill: 'var(--color-muted-foreground)' }}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-secondary)', fillOpacity: 0.5 }}
              content={<TrendTooltip />}
            />
            <Bar dataKey="revenue" name="Revenue" radius={[5, 5, 2, 2]} maxBarSize={22}>
              {data.map((d, i) => (
                <Cell
                  key={d.label}
                  fill="var(--color-primary)"
                  fillOpacity={i === lastIndex ? 1 : 0.35}
                  stroke="var(--color-primary)"
                  strokeOpacity={i === lastIndex ? 1 : 0.4}
                />
              ))}
            </Bar>
            <Bar
              dataKey="cost"
              name="All costs"
              radius={[5, 5, 2, 2]}
              maxBarSize={22}
              fill="var(--color-secondary)"
              stroke="var(--color-border)"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3.5 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-[9px] rounded-[3px] bg-primary" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block size-[9px] rounded-[3px] border border-border bg-secondary" />
          All costs
        </span>
        <span className="ml-auto font-mono text-[11px]">gap between bars = net cash flow</span>
      </div>
    </div>
  )
}
