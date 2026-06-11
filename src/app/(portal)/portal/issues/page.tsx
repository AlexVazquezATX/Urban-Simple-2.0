import Link from 'next/link'
import { format } from 'date-fns'
import { CheckCircle2, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import {
  LiveEmpty,
  LiveFilterPill,
  LivePage,
  LivePageHead,
} from '@/components/portal/live-shell'

// Issues — LiveIssues spec (usp-live-pages.jsx): pastel status chips
// (open→peach, in progress→sky, resolved→sage), filter pills, issue cards
// with a meta line. "Report something" is the one gold pill in the head.

const STATUS_CHIP: Record<string, { label: string; classes: string }> = {
  open: {
    label: "Open — we're on it",
    classes: 'border-peach-line bg-peach-bg text-peach-deep',
  },
  in_progress: {
    label: 'In progress',
    classes: 'border-sky-line bg-sky-bg text-sky-deep',
  },
  resolved: {
    label: 'Resolved',
    classes: 'border-sage-line bg-sage-bg text-sage-deep',
  },
  closed: {
    label: 'Resolved',
    classes: 'border-sage-line bg-sage-bg text-sage-deep',
  },
}

export default async function PortalIssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const ctx = await requirePortalContext()

  const issues = await prisma.issue.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 60,
    select: {
      id: true,
      title: true,
      category: true,
      severity: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      location: { select: { id: true, name: true } },
    },
  })

  const counts = {
    open: issues.filter(i => i.status === 'open').length,
    in_progress: issues.filter(i => i.status === 'in_progress').length,
    resolved: issues.filter(i => i.status === 'resolved' || i.status === 'closed').length,
  }

  const activeFilter = ['open', 'in_progress', 'resolved'].includes(status ?? '')
    ? (status as 'open' | 'in_progress' | 'resolved')
    : null

  const filtered = activeFilter
    ? issues.filter(i =>
        activeFilter === 'resolved'
          ? i.status === 'resolved' || i.status === 'closed'
          : i.status === activeFilter
      )
    : issues

  return (
    <LivePage>
      <LivePageHead
        kicker="Flag it — we'll handle it"
        title="Issues"
        sub="Anything that needs attention. You flag it, we schedule it, you see it resolved."
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
          title={
            activeFilter ? 'Nothing here right now' : 'No issues — everything looks good'
          }
          sub="Spot something that needs attention? Flag it and your account manager is notified immediately."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map((i) => {
            const chip = STATUS_CHIP[i.status] ?? STATUS_CHIP.open
            return (
              <Link
                key={i.id}
                href={`/portal/issues/${i.id}`}
                className="block rounded-[18px] border border-border bg-card p-6 shadow-soft transition-colors hover:border-gold-600/30"
              >
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 font-display text-[16.5px] font-bold tracking-[-0.3px] text-foreground">
                    {i.title}
                  </span>
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-[3px] text-[11.5px] font-semibold ${chip.classes}`}
                  >
                    {chip.label}
                  </span>
                </div>
                <div className="mt-1.5 text-xs text-muted-foreground">
                  {i.location.name} · {format(i.createdAt, 'MMM d')} · {i.category} ·{' '}
                  {i.severity}
                  {i.resolvedAt ? ` · resolved ${format(i.resolvedAt, 'MMM d')}` : ''}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </LivePage>
  )
}
