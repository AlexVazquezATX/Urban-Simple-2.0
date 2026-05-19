import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbEntry {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbEntry[]
  className?: string
}

// Lightweight breadcrumb. The last item renders as the current page (no link).
// Used on the client and location detail pages to make the Client -> Location
// hierarchy obvious at a glance.
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex flex-wrap items-center gap-1.5 text-sm', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-warm-500 dark:text-cream-400 hover:text-ocean-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'font-medium text-warm-900 dark:text-cream-100'
                    : 'text-warm-500 dark:text-cream-400'
                }
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-warm-400 dark:text-cream-500" />
            )}
          </span>
        )
      })}
    </nav>
  )
}
