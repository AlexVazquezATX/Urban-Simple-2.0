/**
 * Studio UI primitives — Urban Cognitive design language.
 *
 * Shared presentational building blocks so every Backhaus studio screen
 * inherits a consistent look (bronze + honey discipline, generous radius,
 * Fraunces display type, layered warm shadows) instead of re-styling ad hoc.
 *
 * These are pure/presentational (no hooks) and safe to use from client pages.
 */
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Base surface: white card, soft border, soft shadow. */
export function StudioCard({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-2xl bg-white border border-cream-300/70 shadow-soft', className)}>
      {children}
    </div>
  )
}

/** Padded card with an uppercase micro-label and optional right-aligned action. */
export function SectionCard({
  label,
  action,
  className,
  bodyClassName,
  children,
}: {
  label?: string
  action?: React.ReactNode
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('rounded-2xl bg-white border border-cream-300/70 shadow-soft p-5', className)}>
      {(label || action) && (
        <div className="flex items-center justify-between mb-3.5">
          {label && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-warm-500 font-semibold">{label}</p>
          )}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}

/** Compact metric tile: label, large display number, sub-label. */
export function StatTile({
  label,
  value,
  sub,
  accent = 'text-bronze-600',
}: {
  label: string
  value: string | number
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl bg-white border border-cream-300/70 shadow-soft px-5 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-warm-500 font-semibold">{label}</p>
      <p className={cn('mt-1.5 font-display text-3xl tracking-tight', accent)}>{value}</p>
      {sub && <p className="text-xs text-warm-500 mt-0.5">{sub}</p>}
    </div>
  )
}

/** Linkable tool row with a bronze-tinted icon and a hover lift. */
export function ToolCard({
  icon: Icon,
  title,
  sub,
  href,
  badge,
}: {
  icon: LucideIcon
  title: string
  sub: string
  href: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white border border-cream-300/70 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 p-4 flex items-center gap-3.5"
    >
      <div className="w-11 h-11 rounded-xl bg-bronze-50 border border-bronze-100 flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px] text-bronze-600" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-charcoal-900">{title}</h3>
          {badge && (
            <span className="text-[9px] uppercase tracking-wide font-semibold text-honey-700 bg-honey-100 border border-honey-200 rounded-full px-1.5 py-px">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-warm-500 truncate mt-0.5">{sub}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-warm-300 group-hover:text-bronze-500 transition-colors ml-auto" />
    </Link>
  )
}
