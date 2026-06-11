import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowRight, Camera, Flag, Sparkles } from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { TrialBanner } from '@/components/portal/trial-banner'
import {
  LiveHomeNav,
  LiveManager,
  LivePhotoPanel,
  LiveStatTile,
  LiveTimelineRow,
  LiveActionRow,
} from '@/components/portal/live-shell'

// Portal home — LIVE redesign (D · Quiet merge, spec: usp-live-home.jsx).
// Photo panel left; right column: inline nav, date kicker, display greeting,
// story line, pastel stat tiles, latest-activity timeline, action rows,
// photo strip, manager footer. All data fetching preserved from the
// 2026-05-07 build.

export default async function PortalHomePage() {
  const ctx = await requirePortalContext()

  const locationIds = ctx.locations.map((l) => l.id)
  const isSelfServe = ctx.client.isSelfServe
  const showTrialBanner =
    isSelfServe && ctx.client.portalTrialEndsAt && ctx.client.portalStatus === 'trial'

  // ──────────────── data ────────────────

  const [
    lastWalkthrough,
    docCount,
    teamSize,
    lastReview,
    openIssueCount,
    recentVisitCount,
    walkthroughCount,
    recentReviewsForStrip,
    nextShift,
    lastShiftWithManager,
    locationHero,
  ] = await Promise.all([
    prisma.portalWalkthrough.findFirst({
      where: { clientId: ctx.client.id },
      orderBy: [{ capturedAt: 'desc' }],
      select: {
        id: true,
        capturedAt: true,
        photoCount: true,
        overallRating: true,
        location: { select: { name: true } },
      },
    }),
    prisma.portalDocument.count({ where: { clientId: ctx.client.id } }),
    prisma.clientContact.count({
      where: { clientId: ctx.client.id, isPortalUser: true },
    }),
    !isSelfServe && locationIds.length > 0
      ? prisma.serviceReview.findFirst({
          where: { locationId: { in: locationIds }, photos: { isEmpty: false } },
          orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            reviewDate: true,
            overallRating: true,
            photos: true,
            location: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve(null),
    locationIds.length > 0
      ? prisma.issue.count({
          where: {
            locationId: { in: locationIds },
            status: { in: ['open', 'in_progress'] },
          },
        })
      : Promise.resolve(0),
    !isSelfServe && locationIds.length > 0
      ? prisma.shift.count({
          where: {
            OR: [
              { locationId: { in: locationIds } },
              { shiftLocations: { some: { locationId: { in: locationIds } } } },
            ],
            date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { in: ['scheduled', 'in_progress', 'completed'] },
          },
        })
      : Promise.resolve(0),
    isSelfServe
      ? prisma.portalWalkthrough.count({
          where: {
            clientId: ctx.client.id,
            capturedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        })
      : Promise.resolve(0),
    !isSelfServe && locationIds.length > 0
      ? prisma.serviceReview.findMany({
          where: { locationId: { in: locationIds }, photos: { isEmpty: false } },
          orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
          take: 6,
          select: { id: true, photos: true, location: { select: { name: true } } },
        })
      : Promise.resolve([]),
    !isSelfServe && locationIds.length > 0
      ? prisma.shift.findFirst({
          where: {
            OR: [
              { locationId: { in: locationIds } },
              { shiftLocations: { some: { locationId: { in: locationIds } } } },
            ],
            date: { gte: new Date() },
            status: { in: ['scheduled', 'in_progress'] },
          },
          orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
          select: { id: true, date: true, startTime: true },
        })
      : Promise.resolve(null),
    !isSelfServe && locationIds.length > 0
      ? prisma.shift.findFirst({
          where: {
            OR: [
              { locationId: { in: locationIds } },
              { shiftLocations: { some: { locationId: { in: locationIds } } } },
            ],
            managerId: { not: null },
          },
          orderBy: [{ date: 'desc' }],
          select: {
            manager: {
              select: {
                firstName: true,
                lastName: true,
                phone: true,
                avatarUrl: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    locationIds.length > 0
      ? prisma.location.findFirst({
          where: { id: { in: locationIds }, photos: { isEmpty: false } },
          select: { photos: true, name: true },
        })
      : Promise.resolve(null),
  ])

  // Hero photo: prefer last review photo (real proof of work), then a stock
  // location photo, then nothing — the panel's gradient fallback handles it.
  const heroPhoto = lastReview?.photos[0] || locationHero?.photos[0] || null

  // Pull a recent-photos strip (max 6 thumbs across recent reviews).
  const recentThumbs = recentReviewsForStrip
    .flatMap((r) =>
      r.photos.slice(0, 2).map((url) => ({
        url,
        locationName: r.location.name,
        reviewId: r.id,
      }))
    )
    .slice(0, 6)

  const totalRecentPhotos = recentReviewsForStrip.reduce((sum, r) => sum + r.photos.length, 0)

  const accountManager = lastShiftWithManager?.manager || null

  const storyLine = buildStoryLine({
    isSelfServe,
    lastReview,
    lastWalkthrough,
    nextShift,
    walkthroughCount,
    recentVisitCount,
    openIssueCount,
    clientName: ctx.client.name,
  })

  // Latest-activity timeline rows from real events (graceful when sparse).
  const timeline: Array<{ time: string; text: string }> = []
  if (lastReview) {
    timeline.push({
      time: format(lastReview.reviewDate, 'MMM d'),
      text: `Visit reviewed at ${lastReview.location.name} — ${lastReview.photos.length} ${lastReview.photos.length === 1 ? 'photo' : 'photos'} added`,
    })
  }
  if (lastWalkthrough) {
    timeline.push({
      time: format(lastWalkthrough.capturedAt, 'MMM d'),
      text: `Walkthrough at ${lastWalkthrough.location.name} — ${lastWalkthrough.photoCount} ${lastWalkthrough.photoCount === 1 ? 'photo' : 'photos'} captured`,
    })
  }
  if (nextShift) {
    timeline.push({
      time: format(nextShift.date, 'MMM d'),
      text: `Next visit on the books · crew arrives at ${nextShift.startTime}`,
    })
  }

  const photoPanelPill = isSelfServe
    ? 'Inspection-ready, every day'
    : lastReview
      ? `Serviced ${format(lastReview.reviewDate, 'EEEE')} · ready for today's service`
      : 'We clean while you sleep'

  // ──────────────── render ────────────────

  return (
    <div className="flex min-h-screen w-full">
      <LivePhotoPanel
        photoUrl={heroPhoto}
        photoAlt={ctx.client.name}
        brandName={ctx.client.name}
        logoUrl={ctx.client.logoUrl}
        pill={photoPanelPill}
      />

      <div className="flex min-w-0 flex-1 flex-col px-6 pb-10 pt-8 sm:px-9 lg:px-[clamp(36px,4.5vw,72px)]">
        <div className="mb-9">
          <LiveHomeNav />
        </div>

        {showTrialBanner && ctx.client.portalTrialEndsAt && (
          <div className="mb-6">
            <TrialBanner
              trialEndsAt={ctx.client.portalTrialEndsAt}
              status={ctx.client.portalStatus}
            />
          </div>
        )}

        <div className="mb-3 font-mono text-[11px] uppercase tracking-[2.4px] text-gold-600">
          {format(new Date(), 'EEEE · MMMM d')}
        </div>
        <h1 className="font-display text-[40px] font-bold leading-[1.05] tracking-[-1.2px] text-foreground">
          Good morning, {ctx.firstName}.
        </h1>
        <p className="mt-3 max-w-[470px] text-[15px] leading-relaxed text-cream-700">
          {storyLine}
        </p>

        {/* Pastel stat tiles */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isSelfServe ? (
            <>
              <LiveStatTile
                palette="sage"
                label="Walkthroughs"
                value={
                  walkthroughCount > 0 ? `${walkthroughCount} this month` : 'Ready to start'
                }
                sub={
                  lastWalkthrough
                    ? `Last one at ${lastWalkthrough.location.name}, ${format(lastWalkthrough.capturedAt, 'MMM d')}`
                    : 'Your first walkthrough starts your inspection trail'
                }
              />
              <LiveStatTile
                palette="sky"
                label="Inspection binder"
                value={docCount > 0 ? `${docCount} ${docCount === 1 ? 'doc' : 'docs'}` : 'Empty'}
                sub={
                  docCount > 0
                    ? 'Print your inspection packet anytime'
                    : 'Upload your COI, permits, and training records'
                }
              />
            </>
          ) : (
            <>
              <LiveStatTile
                palette="sage"
                label="Kitchen status"
                value={openIssueCount === 0 ? 'All clear ✦' : `${openIssueCount} open ${openIssueCount === 1 ? 'issue' : 'issues'}`}
                sub={
                  openIssueCount === 0
                    ? recentVisitCount > 0
                      ? `${recentVisitCount} ${recentVisitCount === 1 ? 'visit' : 'visits'} in the last 30 days`
                      : 'Your visit history will collect here'
                    : "We're on it — track progress in Issues"
                }
              />
              <LiveStatTile
                palette="sky"
                label="Next visit"
                value={
                  nextShift
                    ? `${format(nextShift.date, 'EEE')} · ${nextShift.startTime}`
                    : 'Not scheduled'
                }
                sub={
                  nextShift
                    ? "We'll be in and out while you're closed"
                    : "Reach out and we'll get you on the calendar"
                }
              />
            </>
          )}
        </div>

        {/* Latest-activity timeline */}
        {timeline.length > 0 ? (
          <div className="mt-4 rounded-2xl bg-secondary px-6 py-5">
            <div className="mb-3.5 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
              The latest
            </div>
            {timeline.map((row, i) => (
              <LiveTimelineRow
                key={i}
                time={row.time}
                text={row.text}
                last={i === timeline.length - 1}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-secondary px-6 py-5">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
              The latest
            </div>
            <p className="text-sm leading-relaxed text-cream-700">
              Welcome to your portal, {ctx.client.name}. Photos and notes from every visit
              will collect here — walkthroughs you capture will too.
            </p>
          </div>
        )}

        {/* Primary actions */}
        <div className="mt-2">
          <LiveActionRow
            href="/portal/walkthrough/new"
            icon={<Camera className="h-[17px] w-[17px]" strokeWidth={1.7} />}
            title="Start a walkthrough"
            sub={
              lastWalkthrough
                ? `Last: ${lastWalkthrough.location.name} · ${format(lastWalkthrough.capturedAt, 'EEE')}`
                : 'Photo + note capture by zone'
            }
          />
          <LiveActionRow
            href="/portal/issues/new"
            icon={<Flag className="h-[17px] w-[17px]" strokeWidth={1.7} />}
            title="Report something"
            sub={
              openIssueCount > 0
                ? `${openIssueCount} open ${openIssueCount === 1 ? 'issue' : 'issues'}`
                : 'Flag what needs attention'
            }
          />
        </div>

        {/* Recent photos — only when there's something to show */}
        {recentThumbs.length > 0 && (
          <div className="mt-5">
            <div className="mb-2.5 flex items-baseline">
              <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted-foreground">
                The last visit, in photos
              </span>
              <Link
                href="/portal/cleaning-log"
                className="ml-auto text-[12.5px] font-semibold text-gold-600 hover:underline"
              >
                See all {totalRecentPhotos} →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {recentThumbs.slice(0, 3).map((t, i) => (
                <Link
                  key={i}
                  href={`/portal/cleaning-log#review-${t.reviewId}`}
                  className="relative h-[104px] overflow-hidden rounded-xl border border-border bg-secondary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.url}
                    alt={t.locationName}
                    className="h-full w-full object-cover"
                  />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* BackHaus perk — quiet footer row. UR cleaning customers only. */}
        {!isSelfServe && (
          <Link
            href={`https://backhaus.ai/studio/signup?ref=urban-simple-portal&client=${encodeURIComponent(ctx.client.name)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5 transition-colors hover:border-cream-500"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-gold-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                Free perk: BackHaus food photography
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                Menu-ready images from your phone snaps. Credits on us.
              </p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Link>
        )}

        {/* Manager footer — the relationship beat. */}
        <LiveManager manager={!isSelfServe ? accountManager : null} />

        {/* Keep team size in the DOM story for screen readers / future use. */}
        <span className="sr-only">
          {teamSize} portal {teamSize === 1 ? 'user' : 'users'} on this account
        </span>
      </div>
    </div>
  )
}

// ──────────────── helpers ────────────────

interface StoryLineInput {
  isSelfServe: boolean
  lastReview: { reviewDate: Date; location: { name: string }; photos: string[] } | null
  lastWalkthrough: { capturedAt: Date; location: { name: string }; photoCount: number } | null
  nextShift: { date: Date; startTime: string } | null
  walkthroughCount: number
  recentVisitCount: number
  openIssueCount: number
  clientName: string
}

function buildStoryLine(input: StoryLineInput): string {
  const {
    isSelfServe,
    lastReview,
    lastWalkthrough,
    nextShift,
    walkthroughCount,
    recentVisitCount,
    openIssueCount,
    clientName,
  } = input

  // Self-serve clients: the story is their own walkthrough cadence.
  if (isSelfServe) {
    if (walkthroughCount > 0 && lastWalkthrough) {
      const walkLabel =
        walkthroughCount === 1
          ? '1 walkthrough this month'
          : `${walkthroughCount} walkthroughs this month`
      return `${walkLabel}. Last one at ${lastWalkthrough.location.name} on ${format(lastWalkthrough.capturedAt, 'EEE, MMM d')}.`
    }
    return `${clientName} is set up. Capture your first walkthrough to start your inspection trail.`
  }

  // Cleaning clients: weave together what happened + what's next.
  const parts: string[] = []
  if (lastReview) {
    const photoLabel =
      lastReview.photos.length === 1 ? '1 photo' : `${lastReview.photos.length} photos`
    parts.push(
      `Your team was at ${lastReview.location.name} ${format(lastReview.reviewDate, 'EEEE')} (${photoLabel})`
    )
  }
  if (nextShift) {
    parts.push(`next visit ${format(nextShift.date, 'EEE, MMM d')} at ${nextShift.startTime}`)
  } else if (recentVisitCount > 0 && !lastReview) {
    parts.push(
      `${recentVisitCount} visit${recentVisitCount === 1 ? '' : 's'} in the last 30 days`
    )
  }

  if (parts.length > 0) {
    if (openIssueCount > 0) {
      parts.push(
        `${openIssueCount} open issue${openIssueCount === 1 ? '' : 's'}`
      )
    }
    return parts.join(' · ') + '.'
  }

  // Day-zero account: no visits, no shifts. Friendly anticipation copy.
  return `Welcome to ${clientName}. Photos, notes, and visit history will live here as your team gets to work.`
}
