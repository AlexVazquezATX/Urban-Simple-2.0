import Link from 'next/link'
import { format } from 'date-fns'
import { ClipboardList, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { categoryLabel } from '@/lib/ops/constants'
import { StatusChip } from '@/components/portal/issue-chips'
import {
  LiveEmpty,
  LiveFilterPill,
  LivePage,
  LivePageHead,
} from '@/components/portal/live-shell'

// Service requests: Issues with type 'request'. Same card language as the
// issues list; detail lives on /portal/issues/[id] (type-aware).

export default async function PortalRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const ctx = await requirePortalContext()

  if (ctx.client.isSelfServe) {
    return (
      <LivePage>
        <LiveEmpty
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title="Requests are for Urban Simple cleaning clients"
          sub="Want us cleaning your kitchen? Email hello@urbansimple.net and we'll set up a walkthrough."
        />
      </LivePage>
    )
  }

  const requests = await prisma.issue.findMany({
    where: { clientId: ctx.client.id, visibleToClient: true, type: 'request' },
    orderBy: [{ createdAt: 'desc' }],
    take: 60,
    select: {
      id: true,
      title: true,
      category: true,
      status: true,
      preferredDate: true,
      createdAt: true,
      resolvedAt: true,
      location: { select: { name: true } },
    },
  })

  const isDone = (s: string) => s === 'resolved' || s === 'closed'
  const counts = {
    open: requests.filter(r => !isDone(r.status)).length,
    done: requests.filter(r => isDone(r.status)).length,
  }
  const activeFilter = status === 'open' || status === 'done' ? status : null
  // Open first, newest first within each group.
  const sorted = [...requests].sort((a, b) => Number(isDone(a.status)) - Number(isDone(b.status)))
  const filtered = activeFilter
    ? sorted.filter(r => (activeFilter === 'done' ? isDone(r.status) : !isDone(r.status)))
    : sorted

  return (
    <LivePage>
      <LivePageHead
        kicker="Ask for what you need"
        title="Requests"
        sub="Extra cleaning, supplies, schedule changes and event prep. Track each one here."
        right={
          <Button asChild variant="gold" className="rounded-full px-5">
            <Link href="/portal/requests/new">
              <Plus className="h-3.5 w-3.5" />
              New request
            </Link>
          </Button>
        }
      />

      <div className="mb-4.5 flex flex-wrap gap-1.5">
        <LiveFilterPill href="/portal/requests" active={!activeFilter}>
          All
        </LiveFilterPill>
        <LiveFilterPill href="/portal/requests?status=open" active={activeFilter === 'open'}>
          Open · {counts.open}
        </LiveFilterPill>
        <LiveFilterPill href="/portal/requests?status=done" active={activeFilter === 'done'}>
          Done · {counts.done}
        </LiveFilterPill>
      </div>

      {filtered.length === 0 ? (
        <LiveEmpty
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title={activeFilter ? 'Nothing here right now' : 'No requests yet'}
          sub="Need something extra? Send a request and your account manager gets it right away."
          action={
            !activeFilter ? (
              <Button asChild variant="gold" className="rounded-full px-5">
                <Link href="/portal/requests/new">New request</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {filtered.map(r => (
            <Link
              key={r.id}
              href={`/portal/issues/${r.id}`}
              className="block rounded-[18px] border border-border bg-card p-5 shadow-soft transition-colors hover:border-gold-600/30 sm:p-6"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="min-w-0 flex-1 font-display text-[16.5px] font-bold tracking-[-0.3px] text-foreground">
                  {r.title}
                </span>
                <StatusChip status={r.status} type="request" />
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                {r.location.name} · {categoryLabel(r.category, 'request')} · sent{' '}
                {format(r.createdAt, 'MMM d')}
                {r.preferredDate ? ` · preferred ${format(r.preferredDate, 'EEE, MMM d')}` : ''}
                {r.resolvedAt ? ` · done ${format(r.resolvedAt, 'MMM d')}` : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </LivePage>
  )
}
