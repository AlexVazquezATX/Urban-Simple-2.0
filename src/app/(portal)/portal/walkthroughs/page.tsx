import Link from 'next/link'
import { format } from 'date-fns'
import { Plus, ClipboardList, ThumbsUp, AlertTriangle, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'

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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-display font-medium text-warm-900">Walkthroughs</h1>
          <p className="mt-1 text-sm text-warm-500">
            Your daily condition logs. Builds your inspection-prep history.
          </p>
        </div>
        <Link href="/portal/walkthrough/new">
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-sm border border-dashed border-warm-300 bg-white p-8 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-warm-300" />
          <p className="mt-2 text-sm text-warm-700">No walkthroughs yet.</p>
          <p className="text-xs text-warm-500">
            Start your first one — most take about 60 seconds.
          </p>
          <Link href="/portal/walkthrough/new">
            <Button variant="outline" className="mt-3 rounded-sm">
              <Camera className="mr-1.5 h-4 w-4" />
              Start a walkthrough
            </Button>
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((w) => {
            const ratingIcon =
              w.overallRating === 'issue' ? (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              ) : w.overallRating === 'ok' ? (
                <ThumbsUp className="h-4 w-4 text-lime-600" />
              ) : null

            return (
              <li key={w.id}>
                <Link
                  href={`/portal/walkthroughs/${w.id}`}
                  className="flex items-start gap-3 rounded-sm border border-warm-200 bg-white p-3 hover:border-ocean-400 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ocean-50 text-ocean-700">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-warm-900 truncate">{w.location.name}</p>
                    <p className="mt-0.5 text-[11px] text-warm-500">
                      {format(w.capturedAt, 'EEE, MMM d · h:mm a')} · {w.completedBy.firstName} {w.completedBy.lastName} · {w.photoCount} {w.photoCount === 1 ? 'photo' : 'photos'}
                    </p>
                  </div>
                  {ratingIcon}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
