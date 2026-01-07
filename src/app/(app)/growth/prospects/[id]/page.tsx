import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, Phone, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ProspectDetailClient } from '@/components/growth/prospect-detail-client'

async function ProspectDetail({ id }: { id: string }) {
  const user = await getCurrentUser()
  if (!user) {
    return <div>Please log in</div>
  }

  const prospect = await prisma.prospect.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
    include: {
      contacts: true,
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      activities: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!prospect) {
    notFound()
  }

  // Serialize Decimal fields to numbers for client component
  const serializedProspect = {
    ...prospect,
    estimatedValue: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
    annualRevenue: prospect.annualRevenue ? Number(prospect.annualRevenue) : null,
  }

  return <ProspectDetailClient prospect={serializedProspect} />
}

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-32" />
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32 mt-1" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
          {/* Badges skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-64" />
          {/* Cards skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      }
    >
      <ProspectDetail id={id} />
    </Suspense>
  )
}

