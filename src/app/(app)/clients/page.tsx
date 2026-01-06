import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ClientsListClient } from '@/components/clients/clients-list-client'

async function ClientsList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const clients = await prisma.client.findMany({
    where: {
      companyId: user.companyId,
      ...(user.branchId && { branchId: user.branchId }),
    },
    include: {
      branch: true,
      locations: {
        where: {
          isActive: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  return <ClientsListClient clients={clients} />
}

function ClientsListSkeleton() {
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

export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsListSkeleton />}>
      <ClientsList />
    </Suspense>
  )
}

