import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Upload, Filter } from 'lucide-react'
import Link from 'next/link'
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

  // Serialize Decimal fields to numbers for client component
  const serializedProspects = prospects.map(prospect => ({
    ...prospect,
    estimatedValue: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
  }))

  return <ProspectsListClient prospects={serializedProspects} />
}

export default function ProspectsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-64 mt-1" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
          {/* Filters skeleton */}
          <Skeleton className="h-16 rounded-lg" />
          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-96" />
          {/* Table skeleton */}
          <Skeleton className="h-[400px] rounded-lg" />
        </div>
      }
    >
      <ProspectsList />
    </Suspense>
  )
}

