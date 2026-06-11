import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LocationsListClient } from '@/components/locations/locations-list-client'
import {
  canSeeFinancials,
  summarizeAgreements,
  summarizeBand,
  type FinancialSummary,
  type FinancialsBandData,
} from '@/lib/financials'
import type { ViewMode } from '@/components/ui/view-toggle'

async function LocationsList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const showFinancials = canSeeFinancials(user.role)

  const clientScope = {
    companyId: user.companyId,
    deletedAt: null,
    ...(user.branchId && { branchId: user.branchId }),
  }

  // Locations query and the per-location financials query are independent —
  // run them together. The agreements query filters through the location ->
  // client relation, so it needs no resolved location ids first.
  const [locations, agreements, cookieStore] = await Promise.all([
    prisma.location.findMany({
      where: {
        client: clientScope,
        isActive: true,
        deletedAt: null,
      },
      include: {
        client: {
          select: { id: true, name: true, logoUrl: true },
        },
        // Only the branch code is rendered in the list.
        branch: {
          select: { code: true },
        },
        checklistTemplate: {
          select: { id: true, name: true },
        },
        // Scalar profile fields only — the defaultManager join is unused here.
        serviceProfile: true,
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
            issues: {
              where: { status: { in: ['open', 'in_progress'] } },
            },
          },
        },
      },
      orderBy: [{ client: { name: 'asc' } }, { name: 'asc' }],
    }),
    showFinancials
      ? prisma.serviceAgreement.findMany({
          where: {
            isActive: true,
            location: { client: clientScope, isActive: true, deletedAt: null },
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
      : Promise.resolve([]),
    cookies(),
  ])

  const initialViewMode: ViewMode =
    cookieStore.get('locations-view-mode')?.value === 'card' ? 'card' : 'table'

  const toFinancialsInput = (a: (typeof agreements)[number]) => ({
    monthlyAmount: a.monthlyAmount as unknown as string,
    monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
    monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
    monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
    isActive: a.isActive,
  })

  // Per-location financials. One active agreement per location is the canonical
  // case; we still summarize a list so multi-agreement support needs no change.
  const financialsByLocation = new Map<string, FinancialSummary>()
  if (showFinancials) {
    const grouped = new Map<string, typeof agreements>()
    for (const a of agreements) {
      const list = grouped.get(a.locationId) ?? []
      list.push(a)
      grouped.set(a.locationId, list)
    }
    for (const [locationId, rows] of grouped.entries()) {
      financialsByLocation.set(locationId, summarizeAgreements(rows.map(toFinancialsInput)))
    }
  }

  const locationsWithFinancials = locations.map((l) => ({
    ...l,
    financials: showFinancials ? financialsByLocation.get(l.id) ?? null : null,
  }))

  // Portfolio rollup for the financials band.
  const locationsServiced = showFinancials
    ? new Set(agreements.map((a) => a.locationId)).size
    : locations.length
  const bandData: FinancialsBandData | null = showFinancials
    ? summarizeBand(agreements.map(toFinancialsInput), locationsServiced)
    : null

  return (
    <LocationsListClient
      locations={locationsWithFinancials}
      showFinancials={showFinancials}
      initialViewMode={initialViewMode}
      bandData={bandData}
      locationsServiced={locationsServiced}
    />
  )
}

function LocationsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-9 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Financial KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-[14px]" />
        ))}
      </div>
      {/* Search toolbar */}
      <Skeleton className="h-9 w-full max-w-md" />
      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-32" />
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
