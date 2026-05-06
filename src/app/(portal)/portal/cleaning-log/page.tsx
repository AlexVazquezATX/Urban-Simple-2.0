import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { Star, Camera, MapPin } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'

export default async function CleaningLogPage() {
  const ctx = await requirePortalContext()
  const locationIds = ctx.locations.map(l => l.id)

  if (locationIds.length === 0) {
    return (
      <div className="rounded-sm border border-warm-200 bg-white p-6 text-center">
        <p className="text-sm text-warm-500">No active locations on your account.</p>
      </div>
    )
  }

  // Last 90 days of service reviews + shifts.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const [reviews, shifts] = await Promise.all([
    prisma.serviceReview.findMany({
      where: {
        locationId: { in: locationIds },
        reviewDate: { gte: since },
      },
      orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        reviewDate: true,
        overallRating: true,
        photos: true,
        notes: true,
        location: { select: { id: true, name: true } },
        reviewer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.shift.findMany({
      where: {
        OR: [
          { locationId: { in: locationIds } },
          { shiftLocations: { some: { locationId: { in: locationIds } } } },
        ],
        date: { gte: since },
      },
      orderBy: [{ date: 'desc' }],
      take: 30,
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        manager: { select: { firstName: true, lastName: true } },
        location: { select: { id: true, name: true } },
        shiftLocations: { include: { location: { select: { id: true, name: true } } } },
      },
    }),
  ])

  // Merge into a single timeline keyed by date.
  type Entry =
    | { kind: 'review'; date: Date; data: typeof reviews[number] }
    | { kind: 'shift'; date: Date; data: typeof shifts[number] }

  const timeline: Entry[] = [
    ...reviews.map<Entry>(r => ({ kind: 'review', date: r.reviewDate, data: r })),
    ...shifts.map<Entry>(s => ({ kind: 'shift', date: s.date, data: s })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-medium text-warm-900">Cleaning Log</h1>
        <p className="mt-1 text-sm text-warm-500">
          Last 90 days of visits and reviews across {ctx.locations.length} {ctx.locations.length === 1 ? 'location' : 'locations'}.
        </p>
      </div>

      {timeline.length === 0 ? (
        <div className="rounded-sm border border-dashed border-warm-300 bg-white p-8 text-center">
          <Camera className="mx-auto h-8 w-8 text-warm-300" />
          <p className="mt-2 text-sm text-warm-600">No activity logged yet in the last 90 days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timeline.map((entry) => {
            if (entry.kind === 'review') {
              const r = entry.data
              return (
                <article
                  key={`r-${r.id}`}
                  id={`review-${r.id}`}
                  className="rounded-sm border border-warm-200 bg-white overflow-hidden"
                >
                  {r.photos.length > 0 && (
                    <div className="relative h-44 bg-warm-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={r.photos[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      {r.photos.length > 1 && (
                        <div className="absolute bottom-2 right-2 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          +{r.photos.length - 1} more
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-warm-900">{r.location.name}</p>
                        <p className="text-[11px] text-warm-500">
                          {format(r.reviewDate, 'EEE, MMM d')} •{' '}
                          {r.reviewer.firstName} {r.reviewer.lastName} reviewed
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-sm bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                        <Star className="h-3 w-3 fill-current" />
                        {Number(r.overallRating).toFixed(1)}
                      </div>
                    </div>
                    {r.notes && (
                      <p className="mt-2 text-xs text-warm-600">{r.notes}</p>
                    )}
                    {r.photos.length > 1 && (
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {r.photos.slice(1, 5).map((url, idx) => (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img key={idx} src={url} alt="" className="h-16 w-full rounded-sm object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              )
            }

            // Shift entry
            const s = entry.data
            const locations =
              s.shiftLocations.length > 0
                ? s.shiftLocations.map(sl => sl.location.name)
                : s.location ? [s.location.name] : []

            return (
              <article
                key={`s-${s.id}`}
                className="flex items-center gap-3 rounded-sm border border-warm-200 bg-white p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-ocean-50 text-ocean-600">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-warm-900">
                    {s.manager
                      ? `${s.manager.firstName} ${s.manager.lastName} visited`
                      : 'Manager visit scheduled'}
                  </p>
                  <p className="truncate text-xs text-warm-500">
                    {format(s.date, 'EEE, MMM d')} • {s.startTime}–{s.endTime} • {locations.join(', ') || 'Multiple stops'}
                  </p>
                </div>
                <span className="shrink-0 rounded-sm bg-warm-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-warm-600">
                  {s.status}
                </span>
              </article>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-warm-500 text-center">
        Showing {timeline.length} entries from the last 90 days.{' '}
        {reviews.length > 0 ? `Most recent: ${formatDistanceToNow(timeline[0].date, { addSuffix: true })}.` : ''}
      </p>
    </div>
  )
}
