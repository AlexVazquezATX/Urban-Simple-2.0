import Link from 'next/link'
import { format } from 'date-fns'
import { Camera, ClipboardList, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { LiveEmpty, LivePage, LivePageHead } from '@/components/portal/live-shell'

// Walkthrough history — inner-page shell following the LiveLog card
// language: white cards, display titles, mono meta, pastel status chips.

export default async function WalkthroughsListPage() {
  const ctx = await requirePortalContext()

  const items = await prisma.portalWalkthrough.findMany({
    where: { clientId: ctx.client.id },
    orderBy: [{ capturedAt: 'desc' }],
    take: 60,
    include: {
      location: { select: { id: true, name: true } },
      completedBy: { select: { firstName: true, lastName: true } },
    },
  })

  return (
    <LivePage>
      <LivePageHead
        kicker="Your inspection trail"
        title="Walkthroughs"
        sub="Your daily condition logs. Every one builds your inspection-prep history."
        right={
          <Button asChild variant="gold" className="rounded-full px-5">
            <Link href="/portal/walkthrough/new">
              <Plus className="h-3.5 w-3.5" />
              New walkthrough
            </Link>
          </Button>
        }
      />

      {items.length === 0 ? (
        <LiveEmpty
          icon={<ClipboardList className="h-4.5 w-4.5" />}
          title="No walkthroughs yet — your trail starts here"
          sub="Most take about 60 seconds: a photo or two per zone, a note if something needs attention."
          action={
            <Link
              href="/portal/walkthrough/new"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-[18px] py-[9px] text-[13px] font-semibold text-foreground hover:bg-secondary/60"
            >
              <Camera className="h-3.5 w-3.5 text-gold-600" />
              Start a walkthrough
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {items.map((w) => (
            <Link
              key={w.id}
              href={`/portal/walkthroughs/${w.id}`}
              className="block rounded-[18px] border border-border bg-card p-6 shadow-soft transition-colors hover:border-gold-600/30"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="min-w-0 flex-1 font-display text-[16.5px] font-bold tracking-[-0.3px] text-foreground">
                  {w.location.name}
                </span>
                {w.overallRating === 'issue' ? (
                  <span className="shrink-0 rounded-full border border-peach-line bg-peach-bg px-3 py-[3px] text-[11.5px] font-semibold text-peach-deep">
                    Issue flagged
                  </span>
                ) : w.overallRating === 'ok' ? (
                  <span className="shrink-0 rounded-full border border-sage-line bg-sage-bg px-3 py-[3px] text-[11.5px] font-semibold text-sage-deep">
                    All good
                  </span>
                ) : null}
              </div>
              <div className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">
                  {format(w.capturedAt, 'EEE, MMM d · h:mm a')}
                </span>
                {' · '}
                {w.completedBy.firstName} {w.completedBy.lastName}
                {' · '}
                {w.photoCount} {w.photoCount === 1 ? 'photo' : 'photos'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </LivePage>
  )
}
