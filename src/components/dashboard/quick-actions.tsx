import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Camera, FileText, ListChecks } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const actions: Array<{ href: string; icon: LucideIcon; label: string }> = [
  { href: '/clients', icon: Plus, label: 'Add a client' },
  { href: '/operations/nightly-reviews', icon: Camera, label: 'Nightly reviews' },
  { href: '/invoices', icon: FileText, label: 'Create invoice' },
  { href: '/tasks', icon: ListChecks, label: 'Manage tasks' },
]

/** 2×2 grid of icon tiles — the whole tile is the link. */
export function QuickActions() {
  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5 pb-3">
        <CardTitle className="text-[16px]">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        <div className="grid grid-cols-2 gap-2">
          {actions.map(action => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col gap-2 rounded-[11px] border border-border/60 bg-secondary/40 px-3 py-3.5 transition-colors hover:border-gold-600/30 hover:bg-gold-600/5 dark:hover:border-gold-400/25 dark:hover:bg-gold-400/5"
            >
              <action.icon className="size-4 text-gold-600 dark:text-gold-400" />
              <span className="text-xs font-semibold text-foreground/80">{action.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
