import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProspectsListClient } from '@/components/growth/prospects-list-client'

async function ProspectsList() {
  const user = await getCurrentUser()
  if (!user) {
    return <div>Please log in</div>
  }

  const prospects = await prisma.prospect.findMany({
    where: {
      companyId: user.companyId,
    },
    select: {
      id: true,
      companyName: true,
      legalName: true,
      industry: true,
      businessType: true,
      status: true,
      priority: true,
      estimatedValue: true,
      source: true,
      phone: true,
      website: true,
      address: true,
      aiEnriched: true,
      priceLevel: true,
      lastContactedAt: true,
      createdAt: true,
      contacts: {
        take: 1,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          title: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          activities: true,
        },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
  })

  // Serialize Decimal fields to numbers and Date fields to strings for client component
  const serializedProspects = prospects.map(prospect => ({
    ...prospect,
    estimatedValue: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
    lastContactedAt: prospect.lastContactedAt ? prospect.lastContactedAt.toISOString() : null,
    createdAt: prospect.createdAt.toISOString(),
  }))

  return <ProspectsListClient prospects={serializedProspects} />
}

export default function ProspectsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-7 w-32 rounded-sm" />
              <Skeleton className="h-4 w-64 mt-2 rounded-sm" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-24 rounded-sm" />
              <Skeleton className="h-8 w-28 rounded-sm" />
            </div>
          </div>
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-sm" />
            ))}
          </div>
          {/* Filters skeleton */}
          <Skeleton className="h-14 rounded-sm mb-4" />
          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-96 rounded-sm mb-4" />
          {/* Table skeleton */}
          <Skeleton className="h-[400px] rounded-sm" />
        </div>
      }
    >
      <ProspectsList />
    </Suspense>
  )
}
