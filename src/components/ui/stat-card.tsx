import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

type StatTone = 'neutral' | 'gold' | 'teal' | 'coral' | 'green'

const valueTone: Record<StatTone, string> = {
  neutral: 'text-foreground',
  gold: 'text-gold-600 dark:text-gold-400',
  teal: 'text-teal-600 dark:text-teal-300',
  coral: 'text-coral-600 dark:text-coral-300',
  green: 'text-green-600 dark:text-green-300',
}

/**
 * KPI / stat card — replaces every left-border-accent stat card and the
 * 5-card financial row. Anatomy: mono uppercase kicker + optional icon
 * right → display-font value (tabular) → 12px sub line. Value stays
 * neutral unless the number IS the signal (e.g. Overdue → coral).
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
  delta,
  className,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon?: LucideIcon
  tone?: StatTone
  delta?: { text: string; tone?: StatTone }
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-[14px] border border-border bg-card p-[18px] shadow-soft dark:shadow-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="kicker text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-[15px] shrink-0 text-muted-foreground" />}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-display text-[28px] font-bold leading-none tracking-[-1px] tabular-nums',
            valueTone[tone]
          )}
        >
          {value}
        </span>
        {delta && (
          <Badge variant={delta.tone === 'neutral' || !delta.tone ? 'neutral' : delta.tone}>
            {delta.text}
          </Badge>
        )}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

/**
 * Equation-row variant (Financials): `op` renders the −/= operator to the
 * card's left; `highlight` gives the gold-outlined treatment used on `=`
 * results.
 */
export function StatCardEq({
  op,
  highlight,
  className,
  ...props
}: React.ComponentProps<typeof StatCard> & { op?: string; highlight?: boolean }) {
  return (
    <div className="relative min-w-[168px] flex-1">
      {op && (
        <div className="absolute -left-[22px] top-1/2 w-[22px] -translate-y-1/2 text-center font-mono text-[15px] text-muted-foreground">
          {op}
        </div>
      )}
      <StatCard
        {...props}
        className={cn(
          highlight &&
            'border-primary/30 bg-gradient-to-br from-primary/10 to-transparent dark:from-gold-400/12',
          className
        )}
      />
    </div>
  )
}
