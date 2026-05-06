import Link from 'next/link'
import { ClipboardList, AlertCircle, FileText, Sparkles, ArrowRight, Camera } from 'lucide-react'
import { format } from 'date-fns'
import { requirePortalContext } from '@/lib/portal-auth'
import { prisma } from '@/lib/db'

export default async function PortalHomePage() {
  const ctx = await requirePortalContext()

  const locationIds = ctx.locations.map(l => l.id)

  // Last service review (with photos) per the user's locations.
  const lastReview = locationIds.length > 0
    ? await prisma.serviceReview.findFirst({
        where: {
          locationId: { in: locationIds },
          photos: { isEmpty: false },
        },
        orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          reviewDate: true,
          overallRating: true,
          photos: true,
          location: { select: { id: true, name: true } },
        },
      })
    : null

  // Open issues count.
  const openIssueCount = locationIds.length > 0
    ? await prisma.issue.count({
        where: {
          locationId: { in: locationIds },
          status: { in: ['open', 'in_progress'] },
        },
      })
    : 0

  // Recent visits (manager shifts).
  const recentVisitCount = locationIds.length > 0
    ? await prisma.shift.count({
        where: {
          OR: [
            { locationId: { in: locationIds } },
            { shiftLocations: { some: { locationId: { in: locationIds } } } },
          ],
          date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          status: { in: ['scheduled', 'in_progress', 'completed'] },
        },
      })
    : 0

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-display font-medium text-warm-900">Hi, {ctx.firstName}.</h1>
        <p className="text-sm text-warm-500 mt-1">
          Here&apos;s the latest from your service team at Urban Simple.
        </p>
      </div>

      {/* Last cleaning hero */}
      {lastReview ? (
        <Link href={`/portal/cleaning-log#review-${lastReview.id}`}>
          <div className="rounded-sm overflow-hidden border border-warm-200 bg-white hover:border-ocean-400 transition-colors">
            <div className="relative h-48 bg-warm-100">
              {lastReview.photos[0] && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={lastReview.photos[0]}
                  alt={`${lastReview.location.name} review`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <p className="text-[10px] uppercase tracking-wider opacity-80">Most recent visit</p>
                <p className="text-base font-medium">{lastReview.location.name}</p>
                <p className="text-xs opacity-90">{format(lastReview.reviewDate, 'EEEE, MMM d')} • {lastReview.photos.length} photos</p>
              </div>
            </div>
          </div>
        </Link>
      ) : (
        <div className="rounded-sm border border-dashed border-warm-300 bg-white p-6 text-center">
          <Camera className="mx-auto h-8 w-8 text-warm-300" />
          <p className="mt-2 text-sm text-warm-600">No service photos yet.</p>
          <p className="text-xs text-warm-500">When your account manager visits, photos will appear here.</p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-sm border border-warm-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider text-warm-500">Open Issues</p>
          <p className={`mt-1 text-2xl font-bold ${openIssueCount > 0 ? 'text-amber-600' : 'text-lime-700'}`}>
            {openIssueCount}
          </p>
          <Link href="/portal/issues" className="mt-2 inline-flex items-center gap-1 text-xs text-ocean-600 hover:underline">
            {openIssueCount > 0 ? 'View status' : 'Report something'}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="rounded-sm border border-warm-200 bg-white p-4">
          <p className="text-[10px] uppercase tracking-wider text-warm-500">Visits This Month</p>
          <p className="mt-1 text-2xl font-bold text-warm-900">{recentVisitCount}</p>
          <Link href="/portal/cleaning-log" className="mt-2 inline-flex items-center gap-1 text-xs text-ocean-600 hover:underline">
            See cleaning log
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Tools */}
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-warm-500">Tools</p>
        <Link href="/portal/issues/new" className="flex items-center justify-between rounded-sm border border-warm-200 bg-white p-3 hover:border-ocean-400 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-amber-50 text-amber-600">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-900">Report an issue</p>
              <p className="text-xs text-warm-500">Flag something that needs attention</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-warm-400" />
        </Link>
        <Link href="/portal/cleaning-log" className="flex items-center justify-between rounded-sm border border-warm-200 bg-white p-3 hover:border-ocean-400 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-ocean-50 text-ocean-600">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-900">Cleaning log</p>
              <p className="text-xs text-warm-500">Photos and notes from every visit</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-warm-400" />
        </Link>
        <Link href="/portal/documents" className="flex items-center justify-between rounded-sm border border-warm-200 bg-white p-3 hover:border-ocean-400 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-warm-100 text-warm-600">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-900">Documents</p>
              <p className="text-xs text-warm-500">Coming soon — your contracts, COIs, inspection prep</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-warm-400" />
        </Link>
      </div>

      {/* Backhaus teaser */}
      <div className="rounded-sm border border-plum-200 bg-gradient-to-br from-plum-50 to-cream-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-plum-100 text-plum-700">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-warm-900">BackHaus food photography</p>
            <p className="mt-1 text-xs text-warm-600">
              You get free credits as a portal member. Turn your phone-snapped dish photos into menu-ready images.
            </p>
            <a
              href="https://backhaus.ai"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-plum-700 hover:underline"
            >
              Open BackHaus
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
