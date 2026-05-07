import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertCircle,
  ArrowRight,
  Camera,
  ClipboardList,
  FileText,
  MessageCircle,
  Sparkles,
  ThumbsUp,
  Users,
} from 'lucide-react'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'
import { TrialBanner } from '@/components/portal/trial-banner'

// Portal home, redesigned 2026-05-07. Reframed from "ops dashboard" to
// "your service relationship at a glance":
//   1. Photography-led hero (last visit photo or warm fallback)
//   2. Account manager card with face + text-button (the killer retention move)
//   3. Story-line strip in place of empty zero-stats
//   4. Two prominent actions (walkthrough + report)
//   5. Recent photos strip
//   6. Quiet tools row (collapsed from the old five-tile menu)
//   7. BackHaus perk demoted to a slim footer card

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
  // location photo, then nothing — fallback CSS gradient handles the rest.
  const heroPhoto =
    lastReview?.photos[0] || locationHero?.photos[0] || null

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

  const accountManager = lastShiftWithManager?.manager || null

  // ──────────────── render ────────────────

  return (
    <div className="space-y-6">
      {showTrialBanner && ctx.client.portalTrialEndsAt && (
        <TrialBanner
          trialEndsAt={ctx.client.portalTrialEndsAt}
          status={ctx.client.portalStatus}
        />
      )}

      {/* HERO — photography-led, photographic if we have proof, gradient if not. */}
      <section className="relative overflow-hidden rounded-2xl bg-warm-900 shadow-lg">
        <div className="relative aspect-[16/9] sm:aspect-[21/9]">
          {heroPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heroPhoto}
              alt={`${ctx.client.name}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-warm-900 via-warm-800 to-plum-900">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 20% 20%, rgba(190, 242, 100, 0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(244, 114, 182, 0.2), transparent 50%)',
                }}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/70">
              {isSelfServe ? 'Your portal' : 'Urban Simple · Your kitchen'}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-white sm:text-3xl">
              Good morning, {ctx.firstName}.
            </h1>
            <p className="mt-1 max-w-md text-sm text-white/80">
              {isSelfServe
                ? `Here's what's happening across ${ctx.client.name}.`
                : lastReview
                  ? `Latest visit at ${lastReview.location.name}, ${format(lastReview.reviewDate, 'EEEE')}.`
                  : `Your team is getting ${ctx.client.name} ready for service.`}
            </p>
          </div>
        </div>
      </section>

      {/* ACCOUNT MANAGER — the relationship beat. Only for cleaning clients. */}
      {!isSelfServe && (
        <section className="rounded-2xl border border-warm-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-warm-200 bg-warm-100">
              {accountManager?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={accountManager.avatarUrl}
                  alt={accountManager.firstName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-base font-medium text-warm-600">
                  {accountManager
                    ? `${accountManager.firstName[0]}${accountManager.lastName[0]}`
                    : 'US'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-warm-500">
                {accountManager ? 'Your account manager' : 'Your team'}
              </p>
              <p className="truncate text-sm font-medium text-warm-900">
                {accountManager
                  ? `${accountManager.firstName} ${accountManager.lastName}`
                  : 'Urban Simple'}
              </p>
              <p className="truncate text-xs text-warm-500">
                {accountManager
                  ? 'Reach out anytime'
                  : 'Your manager will appear here after your first visit'}
              </p>
            </div>
            {accountManager?.phone ? (
              <a
                href={`sms:${accountManager.phone}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-warm-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-warm-800"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Text {accountManager.firstName}
              </a>
            ) : (
              <a
                href="mailto:hello@urbansimple.net"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-warm-300 bg-white px-3.5 py-2 text-xs font-medium text-warm-800 hover:border-warm-400"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Email us
              </a>
            )}
          </div>
        </section>
      )}

      {/* STORY STRIP — replaces empty 0/0 stats with a narrative beat. */}
      <section className="rounded-2xl border border-warm-200 bg-cream-50 px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-lime-500" />
          <p className="text-sm leading-relaxed text-warm-800">
            {buildStoryLine({
              isSelfServe,
              lastReview,
              lastWalkthrough,
              nextShift,
              walkthroughCount,
              recentVisitCount,
              openIssueCount,
              clientName: ctx.client.name,
            })}
          </p>
        </div>
      </section>

      {/* PRIMARY ACTIONS — only two. Walkthrough + Report. */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/portal/walkthrough/new"
          className="group flex items-center gap-3.5 rounded-2xl border-2 border-lime-200 bg-gradient-to-br from-lime-50 to-cream-50 p-4 transition-colors hover:border-lime-400"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lime-100 text-lime-700">
            <Camera className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-warm-900">Start a walkthrough</p>
            <p className="mt-0.5 truncate text-xs text-warm-600">
              {lastWalkthrough
                ? `Last: ${lastWalkthrough.location.name} · ${format(lastWalkthrough.capturedAt, 'EEE')}`
                : 'Photo + note capture by zone'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-warm-400 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/portal/issues/new"
          className="group flex items-center gap-3.5 rounded-2xl border border-warm-200 bg-white p-4 transition-colors hover:border-amber-300"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-warm-900">Report something</p>
            <p className="mt-0.5 text-xs text-warm-600">
              {openIssueCount > 0
                ? `${openIssueCount} open issue${openIssueCount === 1 ? '' : 's'}`
                : 'Flag what needs attention'}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-warm-400 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </section>

      {/* RECENT PHOTOS — only when there's something to show. */}
      {recentThumbs.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-wider text-warm-500">
              Recent photos
            </p>
            <Link
              href="/portal/cleaning-log"
              className="text-[11px] font-medium text-ocean-600 hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {recentThumbs.map((t, i) => (
              <Link
                key={i}
                href={`/portal/cleaning-log#review-${t.reviewId}`}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-warm-200 bg-warm-100"
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
        </section>
      )}

      {/* QUIET TOOLS — compact horizontal grid, replaces the old five-tile list. */}
      <section>
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-warm-500">
          More
        </p>
        <div className="grid grid-cols-4 gap-2">
          {!isSelfServe && (
            <ToolTile
              href="/portal/cleaning-log"
              icon={<ClipboardList className="h-4 w-4" />}
              label="Log"
              accent="ocean"
            />
          )}
          <ToolTile
            href="/portal/walkthroughs"
            icon={<ThumbsUp className="h-4 w-4" />}
            label="History"
            accent="lime"
          />
          <ToolTile
            href="/portal/documents"
            icon={<FileText className="h-4 w-4" />}
            label={docCount > 0 ? `Docs · ${docCount}` : 'Docs'}
            accent="warm"
          />
          <ToolTile
            href="/portal/team"
            icon={<Users className="h-4 w-4" />}
            label={teamSize > 0 ? `Team · ${teamSize}` : 'Team'}
            accent="plum"
          />
          {isSelfServe && (
            // Self-serve clients still need the inspection-packet button as a
            // primary tool since they don't have the "Log" surface.
            <ToolTile
              href="/portal/inspection-packet"
              icon={<FileText className="h-4 w-4" />}
              label="Packet"
              accent="ocean"
            />
          )}
        </div>
      </section>

      {/* BACKHAUS PERK — slim, footer-style. UR cleaning customers only. */}
      {!isSelfServe && (
        <Link
          href={`https://backhaus.ai/studio/signup?ref=urban-simple-portal&client=${encodeURIComponent(ctx.client.name)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-plum-200 bg-plum-50 px-4 py-2.5 transition-colors hover:border-plum-300"
        >
          <Sparkles className="h-4 w-4 shrink-0 text-plum-700" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-warm-900">
              Free perk: BackHaus food photography
            </p>
            <p className="truncate text-[11px] text-warm-600">
              Menu-ready images from your phone snaps. Credits on us.
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-plum-700" />
        </Link>
      )}

      {/* Recovery handle for the "0 of everything" brand-new client — gives a
          friendly nudge instead of a silent dashboard. */}
      {!isSelfServe && !lastReview && !lastWalkthrough && (
        <div className="rounded-2xl border border-dashed border-warm-300 bg-white p-5 text-center">
          <Camera className="mx-auto h-7 w-7 text-warm-300" />
          <p className="mt-2 text-sm font-medium text-warm-900">
            Welcome to your portal, {ctx.client.name}.
          </p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-warm-500">
            Photos and notes from every visit will collect here. Walkthroughs
            you capture will too.
          </p>
        </div>
      )}
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

// Compact tool tile — replaces the bulky old five-card list.
function ToolTile({
  href,
  icon,
  label,
  accent,
}: {
  href: string
  icon: React.ReactNode
  label: string
  accent: 'ocean' | 'lime' | 'plum' | 'warm'
}) {
  const accentMap = {
    ocean: 'bg-ocean-50 text-ocean-600',
    lime: 'bg-lime-50 text-lime-700',
    plum: 'bg-plum-50 text-plum-700',
    warm: 'bg-warm-100 text-warm-700',
  }
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-2 py-3 transition-colors hover:border-warm-300"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentMap[accent]}`}
      >
        {icon}
      </div>
      <span className="truncate text-[11px] font-medium text-warm-800">{label}</span>
    </Link>
  )
}
