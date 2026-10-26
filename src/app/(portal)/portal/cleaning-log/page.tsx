import Link from 'next/link'
import { format, formatDistanceToNow, subMonths } from 'date-fns'
import { Camera, MapPin, Star } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { getStartOfLocalDay } from '@/lib/services/autopilot-schedule'
import { addDaysToKey, dbDateKey, localDateKey } from '@/lib/portal-dates'
import { VisitRating } from '@/components/portal/visit-rating'
import {
  LiveEmpty,
  LiveFilterPill,
  LivePage,
  LivePageHead,
} from '@/components/portal/live-shell'

// Cleaning log — LiveLog spec (usp-live-pages.jsx): month filter pills
// (active = ink solid), visit cards with display date + mono time, a gold
// "Latest visit" chip on the newest entry, crew line, CREW NOTE panel, and
// photo thumbs with a "+N" tile. Data fetching unchanged (last 90 days);
// the month pills filter the fetched timeline.

export default async function CleaningLogPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const ctx = await requirePortalContext()
  const locationIds = ctx.locations.map(l => l.id)

  // Self-serve clients aren't UR cleaning customers — the cleaning log would
  // always be empty. Send them to the walkthrough history, which is the
  // equivalent surface for them.
  if (ctx.client.isSelfServe) {
    return (
      <LivePage>
        <LiveEmpty
          icon={<Camera className="h-4.5 w-4.5" />}
          title="The cleaning log is for Urban Simple cleaning clients"
          sub="You can browse your team's walkthroughs and inspection trail instead."
          action={
            <Link
              href="/portal/walkthroughs"
              className="inline-flex items-center rounded-full border border-border bg-card px-[18px] py-[9px] text-[13px] font-semibold text-foreground hover:bg-secondary/60"
            >
              See walkthrough history
            </Link>
          }
        />
      </LivePage>
    )
  }

  if (locationIds.length === 0) {
    return (
      <LivePage>
        <LiveEmpty
          icon={<MapPin className="h-4.5 w-4.5" />}
          title="No active locations on your account"
          sub="Once a location is set up, every visit lands here with photos."
        />
      </LivePage>
    )
  }

  // Company timezone drives the "through today" boundary so tonight's visit
  // still counts as history while genuinely future shifts are excluded.
  const clientBranch = await prisma.client.findUnique({
    where: { id: ctx.client.id },
    select: { branch: { select: { timezone: true } } },
  })
  const timezone = clientBranch?.branch?.timezone || 'America/Chicago'

  // Last 90 days of service reviews + shifts, bounded to end of today so
  // future scheduled shifts never appear under this history view.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const endOfToday = getStartOfLocalDay(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
    timezone
  )

  const todayKey = localDateKey(new Date(), timezone)
  const ratingFloorKey = addDaysToKey(todayKey, -30)

  const [reviews, shifts, myRatings] = await Promise.all([
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
        date: { gte: since, lt: endOfToday },
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
        // Shared routes stop at other clients too: only ever load our own stops.
        shiftLocations: {
          where: { locationId: { in: locationIds } },
          orderBy: { sortOrder: 'asc' },
          include: { location: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.clientVisitRating.findMany({
      where: {
        createdById: ctx.userId,
        locationId: { in: locationIds },
        serviceDate: { gte: new Date(`${ratingFloorKey}T00:00:00Z`) },
      },
      select: { locationId: true, serviceDate: true, rating: true, comment: true },
    }),
  ])

  const ratingByKey = new Map(
    myRatings.map(r => [`${r.locationId}:${dbDateKey(r.serviceDate)}`, r])
  )
  const canRate = !ctx.impersonating
  const isRateableDate = (key: string) => key >= ratingFloorKey && key <= todayKey
  // One rating control per location + day, on the first (newest) row for it.
  const ratingShown = new Set<string>()
  const claimRating = (locationId: string, dateKey: string) => {
    const key = `${locationId}:${dateKey}`
    if (!canRate || !isRateableDate(dateKey) || ratingShown.has(key)) return null
    ratingShown.add(key)
    const r = ratingByKey.get(key)
    return { initial: r ? { rating: r.rating, comment: r.comment } : null }
  }

  // Merge into a single timeline keyed by date.
  type Entry =
    | { kind: 'review'; date: Date; data: typeof reviews[number] }
    | { kind: 'shift'; date: Date; data: typeof shifts[number] }

  const fullTimeline: Entry[] = [
    ...reviews.map<Entry>(r => ({ kind: 'review', date: r.reviewDate, data: r })),
    ...shifts.map<Entry>(s => ({ kind: 'shift', date: s.date, data: s })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  // Month filter pills — current + two previous months, on top of the same
  // 90-day window.
  const now = new Date()
  const months = [0, 1, 2].map(offset => {
    const d = subMonths(now, offset)
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMMM') }
  })
  const activeMonth = months.find(m => m.key === month)?.key ?? null
  const timeline = activeMonth
    ? fullTimeline.filter(e => format(e.date, 'yyyy-MM') === activeMonth)
    : fullTimeline

  const latestKey =
    fullTimeline.length > 0
      ? `${fullTimeline[0].kind}-${fullTimeline[0].kind === 'review' ? fullTimeline[0].data.id : fullTimeline[0].data.id}`
      : null

  return (
    <LivePage>
      <LivePageHead
        kicker="Every visit, photographed"
        title="Cleaning log"
        sub={`The full history of ${ctx.locations.length === 1 ? 'your kitchen' : `your ${ctx.locations.length} locations`}: what was done, by whom, with proof.`}
        right={
          <div className="flex gap-1.5">
            <LiveFilterPill href="/portal/cleaning-log" active={!activeMonth}>
              All
            </LiveFilterPill>
            {months.map(m => (
              <LiveFilterPill
                key={m.key}
                href={`/portal/cleaning-log?month=${m.key}`}
                active={activeMonth === m.key}
              >
                {m.label}
              </LiveFilterPill>
            ))}
          </div>
        }
      />

      {timeline.length === 0 ? (
        <LiveEmpty
          icon={<Camera className="h-4.5 w-4.5" />}
          title={
            activeMonth
              ? 'Nothing logged this month yet'
              : 'No activity logged yet in the last 90 days'
          }
          sub="Every visit lands here with photos and crew notes. Proof of work, always on hand."
        />
      ) : (
        <div className="flex flex-col gap-3.5">
          {timeline.map((entry) => {
            if (entry.kind === 'review') {
              const r = entry.data
              const latest = latestKey === `review-${r.id}`
              const reviewDateKey = dbDateKey(r.reviewDate)
              const reviewRating = claimRating(r.location.id, reviewDateKey)
              return (
                <article
                  key={`r-${r.id}`}
                  id={`review-${r.id}`}
                  className={`rounded-[18px] border bg-card p-6 shadow-soft ${
                    latest ? 'border-gold-600/30' : 'border-border'
                  }`}
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-display text-[17.5px] font-bold tracking-[-0.3px] text-foreground">
                      {format(r.reviewDate, 'EEEE · MMMM d')}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.location.name}
                    </span>
                    {latest && (
                      <span className="rounded-full border border-gold-600/30 bg-gold-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold-600">
                        Latest visit
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 font-mono text-xs tabular-nums text-gold-600">
                      <Star className="h-3 w-3 fill-current" />
                      {Number(r.overallRating).toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 text-[12.5px] text-cream-700">
                    Reviewed by {r.reviewer.firstName} {r.reviewer.lastName}
                  </div>

                  {r.notes && (
                    <div className="mt-3.5 rounded-xl bg-secondary px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
                      <span className="mb-1 block font-mono text-[9px] uppercase tracking-[1.6px] text-muted-foreground">
                        Crew note
                      </span>
                      {r.notes}
                    </div>
                  )}

                  {r.photos.length > 0 && (
                    <div className="mt-3.5 flex items-center gap-2">
                      {r.photos.slice(0, 3).map((url, idx) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={idx}
                          src={url}
                          alt=""
                          className="h-16 w-[86px] rounded-[10px] border border-border object-cover"
                        />
                      ))}
                      {r.photos.length > 3 && (
                        <div className="grid h-16 w-[86px] place-items-center rounded-[10px] border border-border bg-secondary text-xs font-semibold text-cream-700">
                          +{r.photos.length - 3}
                        </div>
                      )}
                    </div>
                  )}

                  {reviewRating && (
                    <VisitRating
                      locationId={r.location.id}
                      serviceDate={reviewDateKey}
                      initial={reviewRating.initial}
                    />
                  )}
                </article>
              )
            }

            // Shift entry
            const s = entry.data
            const ownStops =
              s.shiftLocations.length > 0
                ? s.shiftLocations.map(sl => sl.location)
                : s.location && locationIds.includes(s.location.id)
                  ? [s.location]
                  : []
            const locations = ownStops.map(l => l.name)
            const shiftDateKey = dbDateKey(s.date)
            const rateable = s.status === 'completed' || s.status === 'in_progress'
            const ratingTargets = rateable
              ? ownStops.flatMap(l => {
                  const claim = claimRating(l.id, shiftDateKey)
                  return claim ? [{ location: l, initial: claim.initial }] : []
                })
              : []
            const shiftChip =
              s.status === 'completed'
                ? 'border-sage-line bg-sage-bg text-sage-deep'
                : s.status === 'in_progress'
                  ? 'border-sky-line bg-sky-bg text-sky-deep'
                  : 'border-border bg-secondary text-muted-foreground'

            // Title must match the shift's real state — a completed crew visit
            // is never "scheduled", with or without a named manager.
            const managerName = s.manager
              ? `${s.manager.firstName} ${s.manager.lastName}`
              : null
            const shiftTitle =
              s.status === 'completed'
                ? managerName
                  ? `${managerName} visited`
                  : 'Crew visit completed'
                : s.status === 'in_progress'
                  ? managerName
                    ? `${managerName} on site`
                    : 'Crew on site'
                  : managerName
                    ? `${managerName} scheduled`
                    : 'Visit scheduled'

            return (
              <article
                key={`s-${s.id}`}
                className="rounded-[18px] border border-border bg-card px-5 py-4 shadow-soft"
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-bg text-sky-deep">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
                      {shiftTitle}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-cream-700">
                      <span className="font-mono tabular-nums">
                        {format(s.date, 'EEE, MMM d')} · {s.startTime}–{s.endTime}
                      </span>
                      {' · '}
                      {locations.join(', ') || ctx.client.name}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${shiftChip}`}
                  >
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
                {ratingTargets.map(t => (
                  <VisitRating
                    key={t.location.id}
                    locationId={t.location.id}
                    locationName={ownStops.length > 1 ? t.location.name : undefined}
                    serviceDate={shiftDateKey}
                    shiftId={s.id}
                    initial={t.initial}
                  />
                ))}
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        Showing {timeline.length} {timeline.length === 1 ? 'entry' : 'entries'}
        {activeMonth ? '' : ' from the last 90 days'}.{' '}
        {timeline.length > 0
          ? `Most recent: ${formatDistanceToNow(timeline[0].date, { addSuffix: true })}.`
          : ''}
      </p>
    </LivePage>
  )
}
