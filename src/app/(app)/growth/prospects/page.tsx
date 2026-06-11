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
      deletedAt: null,
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
      sourceDetail: true,
      tags: true,
      phone: true,
      website: true,
      address: true,
      aiEnriched: true,
      priceLevel: true,
      agentQueued: true,
      agentQueuedAt: true,
      doNotContact: true,
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
          outreachMessages: true,
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
    agentQueuedAt: prospect.agentQueuedAt ? prospect.agentQueuedAt.toISOString() : null,
    createdAt: prospect.createdAt.toISOString(),
  }))

  return <ProspectsListClient prospects={serializedProspects} />
}

export default function ProspectsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl p-4 md:p-6">
          {/* Header skeleton */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="mt-2 h-4 w-64" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          {/* KPI row skeleton */}
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-[14px]" />
            ))}
          </div>
          {/* Filters skeleton */}
          <Skeleton className="mb-4 h-14 rounded-[14px]" />
          {/* Tabs skeleton */}
          <Skeleton className="mb-4 h-9 w-96" />
          {/* Table skeleton */}
          <Skeleton className="h-[400px] rounded-[14px]" />
        </div>
      }
    >
      <ProspectsList />
    </Suspense>
  )
}
