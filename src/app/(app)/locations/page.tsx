import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LocationsListClient } from '@/components/locations/locations-list-client'

async function LocationsList() {
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

  return <LocationsListClient locations={locations} />
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


