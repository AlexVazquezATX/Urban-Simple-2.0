import Link from 'next/link'
import { format } from 'date-fns'
import { CheckCircle2, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { categoryLabel } from '@/lib/ops/constants'
import { StatusChip, UnfinishedBadge } from '@/components/portal/issue-chips'
import {
  LiveEmpty,
  LiveFilterPill,
  LivePage,
  LivePageHead,
} from '@/components/portal/live-shell'

// Issues — LiveIssues spec (usp-live-pages.jsx): pastel status chips
// (open→peach, in progress→sky, resolved→sage), filter pills, issue cards
// with a meta line. "Report something" is the one gold pill in the head.
// Shows client reports plus unfinished work flagged by the crew; service
// requests live on /portal/requests.

export default async function PortalIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const ctx = await requirePortalContext()

  const issues = await prisma.issue.findMany({
    where: {
      clientId: ctx.client.id,
      visibleToClient: true,
      type: { in: ['issue', 'incomplete_work'] },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 60,
    select: {
      id: true,
      type: true,
      title: true,
      category: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      location: { select: { id: true, name: true } },
    },
  })

  const rank = (s: string) => (s === 'open' ? 0 : s === 'in_progress' ? 1 : 2)
  const sorted = [...issues].sort((a, b) => rank(a.status) - rank(b.status))

  const counts = {
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  }

  const activeFilter = ['open', 'in_progress', 'resolved'].includes(status ?? '')
    ? (status as 'open' | 'in_progress' | 'resolved')
    : null

  const filtered = activeFilter
    ? sorted.filter(i =>
        activeFilter === 'resolved'
          ? i.status === 'resolved' || i.status === 'closed'
          : i.status === activeFilter
      )
    : sorted

  return (
    <LivePage>
      <LivePageHead
        kicker="Flag it. We'll handle it."
        title="Issues"
        sub="Anything that needs attention. You flag it, we take care of it, you see it resolved."
        right={
          <Button asChild variant="gold" className="rounded-full px-5">
            <Link href="/portal/issues/new">
              <Flag className="h-3.5 w-3.5" />
              Report something
            </Link>
          </Button>
        }
      />

      <div className="mb-4.5 flex flex-wrap gap-1.5">
        <LiveFilterPill href="/portal/issues" active={!activeFilter}>
          All
        </LiveFilterPill>
        <LiveFilterPill href="/portal/issues?status=open" active={activeFilter === 'open'}>
          Open · {counts.open}
        </LiveFilterPill>
        <LiveFilterPill
          href="/portal/issues?status=in_progress"
          active={activeFilter === 'in_progress'}
        >
          In progress · {counts.in_progress}
        </LiveFilterPill>
        <LiveFilterPill
          href="/portal/issues?status=resolved"
          active={activeFilter === 'resolved'}
        >
          Resolved · {counts.resolved}
        </LiveFilterPill>
      </div>

      {filtered.length === 0 ? (
        <LiveEmpty
          icon={<CheckCircle2 className="h-4.5 w-4.5" />}
          title={activeFilter ? 'Nothing here right now' : 'No issues. Everything looks good.'}
          sub="Spot something that needs attention? Flag it and your account manager is notified right away."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map((i) => (
            <Link
              key={i.id}
              href={`/portal/issues/${i.id}`}
              className="block rounded-[18px] border border-border bg-card p-5 shadow-soft transition-colors hover:border-gold-600/30 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 flex-1 font-display text-[16.5px] font-bold tracking-[-0.3px] text-foreground">
                  {i.title}
                </span>
                {i.type === 'incomplete_work' && <UnfinishedBadge />}
                <StatusChip status={i.status} />
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {i.location.name} · {format(i.createdAt, 'MMM d')}
                {i.type === 'incomplete_work'
                  ? ' · flagged by our crew'
                  : ` · ${categoryLabel(i.category)} · ${i.severity}`}
                {i.resolvedAt ? ` · resolved ${format(i.resolvedAt, 'MMM d')}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </LivePage>
  )
}
