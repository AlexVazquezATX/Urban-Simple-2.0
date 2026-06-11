import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Designed empty state — icon in a 40px soft-gold rounded square, a warm
 * specific display-font title ("No shifts tonight — enjoy the quiet"),
 * a muted line, and an optional outline action. Never ship bare
 * icon+gray-text again.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="grid size-10 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
        <Icon className="size-[18px] text-gold-600 dark:text-gold-400" />
      </div>
      <div className="mt-3 font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
        {title}
      </div>
      {description && (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
