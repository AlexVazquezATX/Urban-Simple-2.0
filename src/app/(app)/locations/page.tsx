import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LocationsListClient } from '@/components/locations/locations-list-client'
import { canSeeFinancials, summarizeAgreements, type FinancialSummary } from '@/lib/financials'

async function LocationsList() {
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
          logoUrl: true,
        },
      },
      branch: {
        select: {
          name: true,
          code: true,
        },
      },
      checklistTemplate: {
        select: {
          id: true,
          name: true,
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
      _count: {
        select: {
          serviceLogs: true,
          issues: {
            where: {
              status: {
                in: ['open', 'in_progress'],
              },
            },
          },
        },
      },
    },
    orderBy: [
      { client: { name: 'asc' } },
      { name: 'asc' },
    ],
  })

  // Per-location financials, gated to SUPER_ADMIN. One active agreement per
  // location is the canonical case (see Phase A); we still summarize a list
  // so future multi-agreement-per-location works without changes.
  const showFinancials = canSeeFinancials(user.role)
  const financialsByLocation = new Map<string, FinancialSummary>()

  if (showFinancials && locations.length > 0) {
    const agreements = await prisma.serviceAgreement.findMany({
      where: {
        locationId: { in: locations.map(l => l.id) },
        isActive: true,
      },
      select: {
        locationId: true,
        monthlyAmount: true,
        monthlyLaborCost: true,
        monthlyMaterialCost: true,
        monthlyOtherCost: true,
        isActive: true,
      },
    })
    const grouped = new Map<string, typeof agreements>()
    for (const a of agreements) {
      const list = grouped.get(a.locationId) ?? []
      list.push(a)
      grouped.set(a.locationId, list)
    }
    for (const [locationId, rows] of grouped.entries()) {
      financialsByLocation.set(
        locationId,
        summarizeAgreements(
          rows.map(a => ({
            monthlyAmount: a.monthlyAmount as unknown as string,
            monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
            monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
            monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
            isActive: a.isActive,
          }))
        )
      )
    }
  }

  // Attach financials to each location for the card/table renderer.
  const locationsWithFinancials = locations.map(l => ({
    ...l,
    financials: showFinancials ? financialsByLocation.get(l.id) ?? null : null,
  }))

  return <LocationsListClient locations={locationsWithFinancials} showFinancials={showFinancials} />
}

function LocationsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LocationsPage() {
  return (
    <Suspense fallback={<LocationsListSkeleton />}>
      <LocationsList />
    </Suspense>
  )
}

