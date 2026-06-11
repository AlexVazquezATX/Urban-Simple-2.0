import Link from 'next/link'
import {
  ClipboardList,
  Calendar,
  Users,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getReviewFreshness, STALE_REVIEW_DAYS } from '@/lib/operations/review-freshness'
import { cn } from '@/lib/utils'

function NavCard({
  href,
  icon: Icon,
  title,
  sub,
  count,
  countTone = 'neutral',
}: {
  href: string
  icon: LucideIcon
  title: string
  sub: string
  count: number
  countTone?: 'neutral' | 'coral'
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[14px] border border-border bg-card p-4 shadow-soft transition-colors hover:border-gold-600/30 dark:shadow-none dark:hover:border-gold-400/25"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
        <Icon className="size-4 text-gold-600 dark:text-gold-400" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
          {title}
        </h2>
        <p className="truncate text-[13px] text-muted-foreground">{sub}</p>
      </div>
      <div
        className={cn(
          'font-display text-2xl font-bold tabular-nums tracking-[-0.5px]',
          countTone === 'coral'
            ? 'text-coral-600 dark:text-coral-300'
            : 'text-foreground'
        )}
      >
        {count}
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </Link>
  )
}

async function OperationsDashboard() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const [templatesCount, assignmentsCount, shiftsCount, activeLocations] = await Promise.all([
    prisma.checklistTemplate.count({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
    }),
    prisma.locationAssignment.count({
      where: {
        location: {
          client: {
            branch: {
              companyId: user.companyId,
              ...(user.branchId && { id: user.branchId }),
            },
          },
        },
        isActive: true,
      },
    }),
    prisma.shift.count({
      where: {
        branch: {
          companyId: user.companyId,
          ...(user.branchId && { id: user.branchId }),
        },
        date: {
          gte: new Date(),
        },
        status: 'scheduled',
      },
    }),
    prisma.location.findMany({
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
    }),
  ])

  const staleReviewCount = activeLocations.filter((location) =>
    getReviewFreshness(location.reviews[0]).isStale
  ).length
  const flaggedPreview = activeLocations
    .map((location) => ({
      id: location.id,
      clientName: location.client?.name || 'Unknown Client',
      locationName: location.name,
      reviewFreshness: getReviewFreshness(location.reviews[0]),
    }))
    .filter((entry) => entry.reviewFreshness.isStale)
    .sort((left, right) => {
      const leftDays = left.reviewFreshness.daysSinceReview ?? Number.MAX_SAFE_INTEGER
      const rightDays = right.reviewFreshness.daysSinceReview ?? Number.MAX_SAFE_INTEGER
      return rightDays - leftDays
    })
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="OPERATIONS · OVERVIEW"
        title="Operations"
        subtitle="Manage service operations, schedules, and checklists"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NavCard
          href="/operations/checklists"
          icon={ClipboardList}
          title="Checklists"
          sub="Manage checklist templates"
          count={templatesCount}
        />
        <NavCard
          href="/operations/assignments"
          icon={Users}
          title="Assignments"
          sub="Manage location assignments"
          count={assignmentsCount}
        />
        <NavCard
          href="/operations/schedule"
          icon={Calendar}
          title="Schedule"
          sub="View and manage shifts"
          count={shiftsCount}
        />
        <NavCard
          href="/operations/review-flags"
          icon={AlertTriangle}
          title="Review Flags"
          sub={`Accounts ${STALE_REVIEW_DAYS}+ days since photo review`}
          count={staleReviewCount}
          countTone={staleReviewCount > 0 ? 'coral' : 'neutral'}
        />
      </div>

      {flaggedPreview.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-coral-600/30 bg-coral-600/10 p-4 dark:border-coral-300/25 dark:bg-coral-300/12">
            <AlertTriangle className="size-4 shrink-0 text-coral-600 dark:text-coral-300" />
            <p className="min-w-0 flex-1 text-sm text-foreground">
              <span className="font-semibold tabular-nums">{staleReviewCount}</span>{' '}
              {staleReviewCount === 1 ? 'account has' : 'accounts have'} gone more than{' '}
              {STALE_REVIEW_DAYS} days without a photo-backed manager review.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/operations/review-flags">Open Full Queue</Link>
            </Button>
          </div>

          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle>Stale Review Queue</CardTitle>
              <CardDescription>
                Accounts with no qualifying manager photo review in over {STALE_REVIEW_DAYS} days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 px-5 pb-5">
              {flaggedPreview.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/locations/${entry.id}`}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-secondary/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {entry.clientName} - {entry.locationName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.reviewFreshness.reviewedOnLabel || 'No qualifying review on file'}
                    </p>
                  </div>
                  <Badge
                    variant="coral"
                    className={cn(
                      entry.reviewFreshness.hasQualifyingReview && 'font-mono tabular-nums'
                    )}
                  >
                    {entry.reviewFreshness.shortLabel}
                  </Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default OperationsDashboard
