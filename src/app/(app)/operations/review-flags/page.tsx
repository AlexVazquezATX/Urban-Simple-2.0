import Link from 'next/link'
import { Camera, CheckCircle2, Clock, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getReviewFreshness, STALE_REVIEW_DAYS } from '@/lib/operations/review-freshness'
import { cn } from '@/lib/utils'

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
        deletedAt: null,
        ...(user.branchId && { branchId: user.branchId }),
      },
      isActive: true,
      deletedAt: null,
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

  const neverReviewedCount = flaggedLocations.filter(
    (entry) => !entry.reviewFreshness.hasQualifyingReview
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="OPERATIONS · REVIEW QUEUE"
        title="Review Flags"
        subtitle={`Accounts with no qualifying manager review photos in the last ${STALE_REVIEW_DAYS} days.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Flagged Accounts"
          value={flaggedLocations.length}
          icon={Clock}
          tone={flaggedLocations.length > 0 ? 'coral' : 'neutral'}
          sub={`past the ${STALE_REVIEW_DAYS}-day review window`}
        />
        <StatCard
          label="Never Reviewed"
          value={neverReviewedCount}
          icon={Camera}
          sub="no photo-backed review on file"
        />
        <div className="flex items-start gap-3 rounded-[14px] border border-teal-600/30 bg-teal-600/10 p-[18px] dark:border-teal-300/25 dark:bg-teal-300/12">
          <Camera className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-300" />
          <p className="text-[13px] leading-relaxed text-foreground">
            Reviews only count when the manager submits photo-backed evidence.
          </p>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="px-5 pb-3 pt-5">
          <CardTitle>Stale Review Queue</CardTitle>
          <CardDescription>
            Sorted from oldest qualifying review to newest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-5">
          {flaggedLocations.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Every account is freshly reviewed"
              description={`No locations have gone more than ${STALE_REVIEW_DAYS} days without a photo-backed manager review.`}
            />
          ) : (
            flaggedLocations.map(({ location, reviewFreshness }) => (
              <div
                key={location.id}
                className="rounded-[10px] border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
                        {location.client.name} - {location.name}
                      </h3>
                      <Badge
                        variant="coral"
                        className={cn(
                          reviewFreshness.hasQualifyingReview && 'font-mono tabular-nums'
                        )}
                      >
                        {reviewFreshness.shortLabel}
                      </Badge>
                      <Badge variant="neutral" className="font-mono">
                        {location.branch.code}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
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
                    <Button asChild variant="outline">
                      <Link href={`/locations/${location.id}`}>View Account</Link>
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/operations/nightly-reviews">Nightly Reviews</Link>
                    </Button>
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
