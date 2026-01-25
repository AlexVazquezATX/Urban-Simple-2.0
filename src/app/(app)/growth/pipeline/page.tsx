import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PipelineBoard } from '@/components/growth/pipeline-board'

async function PipelineContent() {
  const user = await getCurrentUser()
  if (!user) {
    return <div>Please log in</div>
  }

  // Get all prospects grouped by status (excluding 'prospect' status which is not in active pipeline)
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId: user.companyId,
      status: {
        not: 'prospect', // Filter out prospects that haven't been moved to pipeline yet
      },
    },
    include: {
      contacts: {
        take: 1,
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
  })

  // Serialize Decimal fields to numbers for client component
  const serializedProspects = prospects.map(prospect => ({
    id: prospect.id,
    companyName: prospect.companyName,
    status: prospect.status,
    priority: prospect.priority,
    estimatedValue: prospect.estimatedValue ? Number(prospect.estimatedValue) : null,
    contacts: prospect.contacts,
  }))

  // Calculate totals
  const totalProspects = serializedProspects.length
  const totalValue = serializedProspects.reduce((sum, p) => sum + (p.estimatedValue || 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto bg-warm-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-medium tracking-tight text-warm-900">Pipeline</h1>
          <p className="text-sm text-warm-500 mt-0.5">
            {totalProspects} prospects · ${totalValue.toLocaleString()} potential value
          </p>
        </div>
        <Link href="/growth/prospects/new">
          <Button variant="lime" size="sm" className="rounded-sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Prospect
          </Button>
        </Link>
      </div>

      {/* Pipeline Board */}
      <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
        <PipelineBoard initialProspects={serializedProspects} />
      </div>
    </div>
  )
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-full mx-auto bg-warm-50 min-h-screen">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-7 w-32 rounded-sm" />
              <Skeleton className="h-4 w-48 mt-2 rounded-sm" />
            </div>
            <Skeleton className="h-8 w-32 rounded-sm" />
          </div>
          {/* Board skeleton */}
          <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
            <div className="flex gap-3 min-w-max">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="w-64 flex-shrink-0">
                  <Skeleton className="h-10 w-full rounded-t-sm" />
                  <Skeleton className="h-80 w-full rounded-b-sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <PipelineContent />
    </Suspense>
  )
}
