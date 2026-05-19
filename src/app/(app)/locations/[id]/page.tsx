import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { LocationFinancialsBlock } from '@/components/locations/location-financials-block'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { EditableLocationInfo } from '@/components/locations/editable-location-info'
import { EditableDispatchProfile } from '@/components/locations/editable-dispatch-profile'
import { EditableEquipment } from '@/components/locations/editable-equipment'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getReviewFreshness } from '@/lib/operations/review-freshness'
import { canSeeFinancials, summarizeAgreements } from '@/lib/financials'

async function LocationDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const showFinancials = canSeeFinancials(user.role)

  // The location query and the per-location agreement query are independent —
  // the agreement query keys off the route param, so it runs concurrently.
  const [location, agreement] = await Promise.all([
    prisma.location.findFirst({
      where: {
        id,
        deletedAt: null,
        client: {
          companyId: user.companyId,
          deletedAt: null,
        },
      },
      include: {
        client: {
          select: { id: true, name: true },
        },
        branch: {
          select: { name: true, code: true },
        },
        checklistTemplate: {
          select: { id: true, name: true },
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
        assignments: {
          where: { isActive: true },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        reviews: {
          where: {
            reviewer: {
              role: { in: ['MANAGER', 'ADMIN', 'SUPER_ADMIN'] },
            },
            photos: { isEmpty: false },
          },
          orderBy: [{ reviewDate: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: {
            id: true,
            reviewDate: true,
            createdAt: true,
            photos: true,
          },
        },
        _count: {
          select: {
            serviceLogs: true,
            issues: {
              where: { status: { in: ['open', 'in_progress'] } },
            },
            serviceAgreements: {
              where: { isActive: true },
            },
          },
        },
      },
    }),
    showFinancials
      ? prisma.serviceAgreement.findFirst({
          where: { locationId: id, isActive: true },
          select: {
            id: true,
            description: true,
            monthlyAmount: true,
            monthlyLaborCost: true,
            monthlyMaterialCost: true,
            monthlyOtherCost: true,
            isActive: true,
            startDate: true,
            paymentTerms: true,
            billingDay: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (!location) {
    return (
      <div className="text-destructive">
        Location not found. Please try again.
      </div>
    )
  }

  const reviewFreshness = getReviewFreshness(location.reviews[0])

  const locationSummary = agreement
    ? summarizeAgreements([
        {
          monthlyAmount: agreement.monthlyAmount as unknown as string,
          monthlyLaborCost: agreement.monthlyLaborCost as unknown as string | null,
          monthlyMaterialCost: agreement.monthlyMaterialCost as unknown as string | null,
          monthlyOtherCost: agreement.monthlyOtherCost as unknown as string | null,
          isActive: agreement.isActive,
        },
      ])
    : null

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb
          items={[
            { label: 'Clients', href: '/clients' },
            { label: location.client.name, href: `/clients/${location.client.id}` },
            { label: location.name },
          ]}
        />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
              {location.name}
            </h1>
            <p className="text-sm text-warm-500 dark:text-cream-400">
              {location.client.name} • {location.branch.name}
            </p>
          </div>
          <ConfirmDeleteButton
            endpoint={`/api/locations/${location.id}`}
            entityLabel={`${location.client.name} - ${location.name}`}
            entityKind="location"
            redirectTo={`/clients/${location.client.id}`}
            buttonLabel="Delete"
            variant="outline"
            size="default"
            className="rounded-sm border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
          />
        </div>
      </div>

      {showFinancials && agreement && locationSummary && (
        <LocationFinancialsBlock
          summary={locationSummary}
          agreement={{
            id: agreement.id,
            description: agreement.description,
            monthlyAmount: Number(agreement.monthlyAmount),
            monthlyLaborCost: agreement.monthlyLaborCost === null ? null : Number(agreement.monthlyLaborCost),
            monthlyMaterialCost: agreement.monthlyMaterialCost === null ? null : Number(agreement.monthlyMaterialCost),
            monthlyOtherCost: agreement.monthlyOtherCost === null ? null : Number(agreement.monthlyOtherCost),
            startDate: agreement.startDate.toISOString(),
            paymentTerms: agreement.paymentTerms,
            billingDay: agreement.billingDay,
          }}
          locationName={location.name}
        />
      )}

      {showFinancials && !agreement && (
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4 text-sm text-warm-500 dark:text-cream-400">
            No active service agreement on this location yet. Create one from the client&apos;s detail page or directly from the Service Agreements area.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <EditableLocationInfo location={location} />

        <div className="space-y-6">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardHeader>
              <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-500 dark:text-cream-400">Service Logs</span>
                <span className="font-medium text-warm-900 dark:text-cream-100">
                  {location._count.serviceLogs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-500 dark:text-cream-400">Open Issues</span>
                <Badge
                  className={`rounded-sm text-[10px] px-1.5 py-0 ${
                    location._count.issues > 0
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-warm-100 text-warm-600 border-warm-200'
                  }`}
                >
                  {location._count.issues}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-500 dark:text-cream-400">Active Agreements</span>
                <span className="font-medium text-warm-900 dark:text-cream-100">
                  {location._count.serviceAgreements}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-warm-500 dark:text-cream-400">Last Reviewed</span>
                <div className="text-right">
                  <Badge
                    className={`rounded-sm text-[10px] px-1.5 py-0 ${
                      reviewFreshness.isStale
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-lime-100 text-lime-700 border-lime-200'
                    }`}
                  >
                    {reviewFreshness.shortLabel}
                  </Badge>
                  <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
                    {reviewFreshness.reviewedOnLabel || 'Manager review with photos required'}
                  </p>
                </div>
              </div>
              {location.assignments.length > 0 && (
                <div className="pt-3 border-t border-warm-200 dark:border-charcoal-700">
                  <p className="text-sm text-warm-500 mb-2">Assigned Associates</p>
                  <div className="space-y-1">
                    {location.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="text-sm flex items-center justify-between"
                      >
                        <span className="text-warm-700 dark:text-cream-300">
                          {assignment.user.firstName} {assignment.user.lastName}
                        </span>
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
                          ${Number(assignment.monthlyPay).toFixed(2)}/mo
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <EditableDispatchProfile location={location} />
        </div>
      </div>

      <EditableEquipment location={location} />
    </div>
  )
}

function LocationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-56" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <Skeleton className="mb-2 h-9 w-48" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-4 w-24" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<LocationDetailSkeleton />}>
      <LocationDetail id={id} />
    </Suspense>
  )
}
