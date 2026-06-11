import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { EditableLocationInfo } from '@/components/locations/editable-location-info'
import { EditableDispatchProfile } from '@/components/locations/editable-dispatch-profile'
import { EditableEquipment } from '@/components/locations/editable-equipment'
import { EditableServiceAgreement } from '@/components/locations/editable-service-agreement'
import { LocationRowActions } from '@/components/locations/location-row-actions'
import { reviewBadgeVariant } from '@/components/locations/tones'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getReviewFreshness } from '@/lib/operations/review-freshness'
import { canSeeFinancials } from '@/lib/financials'
import { cn } from '@/lib/utils'

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
            endDate: true,
            paymentTerms: true,
            billingDay: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (!location) {
    return (
      <div className="text-sm text-muted-foreground">
        Location not found. Please try again.
      </div>
    )
  }

  const reviewFreshness = getReviewFreshness(location.reviews[0])

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`CLIENTS · ${location.client.name.toUpperCase()}`}
        title={location.name}
        subtitle={`${location.client.name} • ${location.branch.name}`}
        backHref={`/clients/${location.client.id}`}
        actions={
          <LocationRowActions
            locationId={location.id}
            entityLabel={`${location.client.name} - ${location.name}`}
            redirectTo={`/clients/${location.client.id}`}
          />
        }
      />

      {showFinancials && (
        <EditableServiceAgreement
          locationId={location.id}
          clientId={location.client.id}
          agreement={
            agreement
              ? {
                  id: agreement.id,
                  description: agreement.description,
                  monthlyAmount: Number(agreement.monthlyAmount),
                  monthlyLaborCost:
                    agreement.monthlyLaborCost === null ? null : Number(agreement.monthlyLaborCost),
                  monthlyMaterialCost:
                    agreement.monthlyMaterialCost === null ? null : Number(agreement.monthlyMaterialCost),
                  monthlyOtherCost:
                    agreement.monthlyOtherCost === null ? null : Number(agreement.monthlyOtherCost),
                  billingDay: agreement.billingDay,
                  paymentTerms: agreement.paymentTerms,
                  startDate: agreement.startDate.toISOString(),
                  endDate: agreement.endDate ? agreement.endDate.toISOString() : null,
                }
              : null
          }
        />
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <EditableLocationInfo location={location} />

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Service Logs</span>
                <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                  {location._count.serviceLogs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Open Issues</span>
                <span
                  className={cn(
                    'font-mono text-sm tabular-nums',
                    location._count.issues > 0
                      ? 'font-medium text-coral-600 dark:text-coral-300'
                      : 'text-muted-foreground'
                  )}
                >
                  {location._count.issues}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Agreements</span>
                <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                  {location._count.serviceAgreements}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Reviewed</span>
                <div className="text-right">
                  <Badge variant={reviewBadgeVariant(reviewFreshness)}>
                    {reviewFreshness.shortLabel}
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reviewFreshness.reviewedOnLabel || 'Manager review with photos required'}
                  </p>
                </div>
              </div>
              {location.assignments.length > 0 && (
                <div className="border-t border-border pt-3">
                  <p className="mb-2 text-sm text-muted-foreground">Assigned Associates</p>
                  <div className="space-y-1">
                    {location.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {assignment.user.firstName} {assignment.user.lastName}
                        </span>
                        <Badge variant="neutral" className="font-mono tabular-nums">
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
