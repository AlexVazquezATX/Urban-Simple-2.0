import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, ThumbsUp, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import type { WalkthroughZone } from '@/lib/portal-walkthrough'

export default async function WalkthroughDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await requirePortalContext()

  const w = await prisma.portalWalkthrough.findFirst({
    where: { id, clientId: ctx.client.id },
    include: {
      location: { select: { name: true } },
      completedBy: { select: { firstName: true, lastName: true } },
    },
  })
  if (!w) notFound()

  const zones = (Array.isArray(w.zones) ? (w.zones as unknown as WalkthroughZone[]) : []).filter(Boolean)

  return (
    <div className="space-y-4">
      <Link
        href="/portal/walkthroughs"
        className="inline-flex items-center gap-1 text-xs text-warm-500 hover:text-ocean-600"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to walkthroughs
      </Link>

      <div className="rounded-sm border border-warm-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-warm-500">Walkthrough</p>
            <h1 className="mt-1 text-lg font-medium text-warm-900">{w.location.name}</h1>
            <p className="mt-0.5 text-xs text-warm-500">
              {format(w.capturedAt, 'EEEE, MMM d, yyyy · h:mm a')} · {w.completedBy.firstName} {w.completedBy.lastName}
            </p>
          </div>
          {w.overallRating === 'issue' ? (
            <Badge className="rounded-sm bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Issue flagged
            </Badge>
          ) : w.overallRating === 'ok' ? (
            <Badge className="rounded-sm bg-lime-100 text-lime-700 border-lime-200 text-[10px]">
              <ThumbsUp className="mr-1 h-3 w-3" />
              All good
            </Badge>
          ) : null}
        </div>

        {w.notes && (
          <p className="mt-3 text-sm text-warm-700 whitespace-pre-wrap">{w.notes}</p>
        )}
      </div>

      <div className="space-y-3">
        {zones.map((z, idx) => {
          const hasIssue = z.rating === 'issue'
          const ok = z.rating === 'ok'
          return (
            <section
              key={idx}
              className={`rounded-sm border bg-white p-3 ${
                hasIssue ? 'border-amber-200' : ok ? 'border-lime-200' : 'border-warm-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-warm-900">{z.zone}</p>
                {hasIssue ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Issue
                  </span>
                ) : ok ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-lime-700 font-medium">
                    <ThumbsUp className="h-3 w-3" />
                    OK
                  </span>
                ) : null}
              </div>

              {z.photos.length > 0 && (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {z.photos.map((url, p) => (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img key={p} src={url} alt="" className="h-24 w-full rounded-sm object-cover" />
                  ))}
                </div>
              )}

              {z.notes && (
                <p className="mt-2 text-xs text-warm-700 whitespace-pre-wrap">{z.notes}</p>
              )}

              {z.photos.length === 0 && !z.notes && (
                <p className="mt-2 text-[11px] text-warm-400 italic">No photos or notes captured.</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
