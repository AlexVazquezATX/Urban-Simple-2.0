import Link from 'next/link'
import { Camera, Clock, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getReviewFreshness, STALE_REVIEW_DAYS } from '@/lib/operations/review-freshness'

type AddressLike = {
  street?: string
  city?: string
  state?: string
  zip?: string
}

function formatAddress(address: unknown) {
  if (!address || typeof address !== 'object') {
    return 'Address unavailable'
  }

  const value = address as AddressLike
  return `${value.street || ''} ${value.city || ''} ${value.state || ''} ${value.zip || ''}`.trim() || 'Address unavailable'
}

export default async function ReviewFlagsPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const locations = await prisma.location.findMany({
    where: {
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
      isActive: true,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      serviceProfile: {
        include: {
          defaultManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      },
      reviews: {
        where: {
          reviewer: {
            role: {
              in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'],
            },
          },
          photos: {
            isEmpty: false,
          },
        },
        orderBy: [
          { reviewDate: 'desc' },
          { createdAt: 'desc' },
        ],
        take: 1,
        select: {
          id: true,
          reviewDate: true,
          createdAt: true,
          photos: true,
        },
      },
    },
    orderBy: [
      { client: { name: 'asc' } },
      { name: 'asc' },
    ],
  })

  const flaggedLocations = locations
    .map((location) => ({
      location,
      reviewFreshness: getReviewFreshness(location.reviews[0]),
    }))
    .filter((entry) => entry.reviewFreshness.isStale)
    .sort((left, right) => {
      const leftDays = left.reviewFreshness.daysSinceReview ?? Number.MAX_SAFE_INTEGER
      const rightDays = right.reviewFreshness.daysSinceReview ?? Number.MAX_SAFE_INTEGER
      return rightDays - leftDays
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
          Review Flags
        </h1>
        <p className="mt-1 text-sm text-warm-500 dark:text-cream-400">
          Accounts with no qualifying manager review photos in the last {STALE_REVIEW_DAYS} days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Flagged Accounts</p>
            <p className="mt-1 text-3xl font-bold text-red-600">{flaggedLocations.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Never Reviewed</p>
            <p className="mt-1 text-3xl font-bold text-warm-900 dark:text-cream-100">
              {flaggedLocations.filter((entry) => !entry.reviewFreshness.hasQualifyingReview).length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400">Need Photos</p>
            <p className="mt-1 text-sm text-warm-700 dark:text-cream-300">
              Reviews only count when the manager submits photo-backed evidence.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader className="p-4">
          <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
            Stale Review Queue
          </CardTitle>
          <CardDescription className="text-warm-500 dark:text-cream-400">
            Sorted from oldest qualifying review to newest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          {flaggedLocations.length === 0 ? (
            <div className="rounded-sm border border-lime-200 bg-lime-50/70 p-6 text-center text-sm text-lime-700">
              No flagged accounts right now.
            </div>
          ) : (
            flaggedLocations.map(({ location, reviewFreshness }) => (
              <div
                key={location.id}
                className="rounded-sm border border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/20"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-medium text-warm-900 dark:text-cream-100">
                        {location.client.name} - {location.name}
                      </h3>
                      <Badge className="rounded-sm bg-red-100 text-red-700 border-red-200">
                        {reviewFreshness.shortLabel}
                      </Badge>
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
                        {location.branch.code}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-warm-500 dark:text-cream-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{formatAddress(location.address)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {reviewFreshness.reviewedOnLabel
                            ? `Last qualifying review: ${reviewFreshness.reviewedOnLabel}`
                            : 'No qualifying review on file'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5" />
                        <span>
                          {reviewFreshness.hasQualifyingReview
                            ? `${reviewFreshness.daysSinceReview} day${reviewFreshness.daysSinceReview === 1 ? '' : 's'} since photo review`
                            : 'Manager photo review required before this account is considered reviewed'}
                        </span>
                      </div>
                      <div>
                        Default manager:{' '}
                        {location.serviceProfile?.defaultManager
                          ? location.serviceProfile.defaultManager.displayName ||
                            `${location.serviceProfile.defaultManager.firstName} ${location.serviceProfile.defaultManager.lastName}`
                          : 'Unassigned'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/locations/${location.id}`}>
                      <Button variant="outline" className="rounded-sm">
                        View Account
                      </Button>
                    </Link>
                    <Link href="/operations/nightly-reviews">
                      <Button variant="outline" className="rounded-sm">
                        Nightly Reviews
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
