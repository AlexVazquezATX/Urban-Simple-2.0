import Link from 'next/link'
import { ClipboardList, Calendar, Users, ArrowRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getReviewFreshness } from '@/lib/operations/review-freshness'

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
      <div>
        <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">Operations</h1>
        <p className="text-sm text-warm-500 dark:text-cream-400 mt-1">
          Manage service operations, schedules, and checklists
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-ocean-100 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-ocean-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">Checklists</CardTitle>
                <CardDescription className="text-xs text-warm-500 dark:text-cream-400">Manage checklist templates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-warm-900 dark:text-cream-100 mb-4">{templatesCount}</div>
            <Link href="/operations/checklists">
              <Button variant="outline" className="w-full rounded-sm">
                View Checklists
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-plum-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-plum-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">Assignments</CardTitle>
                <CardDescription className="text-xs text-warm-500 dark:text-cream-400">Manage location assignments</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-warm-900 dark:text-cream-100 mb-4">{assignmentsCount}</div>
            <Link href="/operations/assignments">
              <Button variant="outline" className="w-full rounded-sm">
                View Assignments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-warm-100 dark:bg-charcoal-800 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-warm-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">Schedule</CardTitle>
                <CardDescription className="text-xs text-warm-500 dark:text-cream-400">View and manage shifts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-warm-900 dark:text-cream-100 mb-4">{shiftsCount}</div>
            <Link href="/operations/schedule">
              <Button variant="outline" className="w-full rounded-sm">
                View Schedule
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 hover:border-red-300 transition-colors">
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-base font-display font-medium text-warm-900 dark:text-cream-100">Review Flags</CardTitle>
                <CardDescription className="text-xs text-warm-500 dark:text-cream-400">Accounts over 7 days since photo review</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-3xl font-bold text-red-600 mb-4">{staleReviewCount}</div>
            <Link href="/operations/review-flags">
              <Button variant="outline" className="w-full rounded-sm">
                Open Queue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {flaggedPreview.length > 0 && (
        <Card className="rounded-sm border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
                  Stale Review Queue
                </CardTitle>
                <CardDescription className="text-warm-500 dark:text-cream-400">
                  Accounts with no qualifying manager photo review in over 7 days.
                </CardDescription>
              </div>
              <Link href="/operations/review-flags">
                <Button variant="outline" className="rounded-sm">
                  Open Full Queue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 p-4 pt-0">
            {flaggedPreview.map((entry) => (
              <Link
                key={entry.id}
                href={`/locations/${entry.id}`}
                className="flex items-center justify-between rounded-sm border border-red-200 bg-white/80 px-3 py-2 text-sm transition-colors hover:border-red-300 dark:border-red-950 dark:bg-charcoal-900"
              >
                <div>
                  <p className="font-medium text-warm-900 dark:text-cream-100">
                    {entry.clientName} - {entry.locationName}
                  </p>
                  <p className="text-xs text-warm-500 dark:text-cream-400">
                    {entry.reviewFreshness.reviewedOnLabel || 'No qualifying review on file'}
                  </p>
                </div>
                <span className="text-xs font-medium text-red-700">
                  {entry.reviewFreshness.shortLabel}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default OperationsDashboard

