import { cn } from '@/lib/utils'

/**
 * Standard page header — mono gold kicker (section · context, e.g.
 * "MONEY · JUNE 2026"), display title at 30px, right-aligned actions
 * (max one gold button). Subtitle only when it adds information.
 */
export function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
  backHref,
  className,
  children,
}: {
  kicker?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  backHref?: string
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker && (
          <div className="kicker mb-2 text-[11px] tracking-[1.6px] text-primary">{kicker}</div>
        )}
        <div className="flex items-center gap-3">
          {backHref && (
            <a
              href={backHref}
              className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Back"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </a>
          )}
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-[-0.8px] text-foreground">
            {title}
          </h1>
        </div>
        {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2.5">{actions}</div>}
    </div>
  )
}
