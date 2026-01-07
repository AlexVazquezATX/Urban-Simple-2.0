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
    <div className="flex flex-col h-full">
      {/* Header - Fixed at top, never scrolls */}
      <div className="flex-shrink-0 flex items-center justify-between flex-wrap gap-4 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-900">Pipeline</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {totalProspects} prospects • ${totalValue.toLocaleString()} potential value
          </p>
        </div>
        <Link href="/growth/prospects/new">
          <Button className="bg-bronze-500 hover:bg-bronze-600 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Button>
        </Link>
      </div>

      {/* Pipeline Board - Only this scrolls horizontally */}
      <div className="flex-1 overflow-x-auto -mx-6 lg:-mx-8 px-6 lg:px-8">
        <PipelineBoard initialProspects={serializedProspects} />
      </div>
    </div>
  )
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col h-full">
          <div className="flex-shrink-0 flex items-center justify-between pb-4">
            <div>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex-1 overflow-x-auto -mx-6 lg:-mx-8 px-6 lg:px-8">
            <div className="flex gap-4 min-w-max">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-64 flex-shrink-0">
                  <Skeleton className="h-10 w-full rounded-t-lg" />
                  <Skeleton className="h-96 w-full rounded-b-lg" />
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
