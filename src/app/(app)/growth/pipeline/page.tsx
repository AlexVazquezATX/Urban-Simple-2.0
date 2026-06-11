import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/format'
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
      deletedAt: null,
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
    <div className="mx-auto max-w-full p-4 md:p-6">
      <PageHeader
        kicker="GROWTH · PIPELINE"
        title="Pipeline"
        subtitle={
          <>
            <span className="font-mono tabular-nums">{totalProspects}</span> prospects ·{' '}
            <span className="font-mono tabular-nums">{formatMoney(totalValue)}</span> potential value
          </>
        }
        actions={
          <Button asChild variant="gold" size="sm">
            <Link href="/growth/prospects/new">
              <Plus className="size-4" />
              Add Prospect
            </Link>
          </Button>
        }
      />

      {/* Pipeline Board */}
      <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
        <PipelineBoard initialProspects={serializedProspects} />
      </div>
    </div>
  )
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-full p-4 md:p-6">
          {/* Header skeleton */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <Skeleton className="h-3.5 w-40 rounded-md" />
              <Skeleton className="mt-3 h-8 w-36 rounded-md" />
              <Skeleton className="mt-2 h-4 w-64 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32 rounded-[9px]" />
          </div>
          {/* Board skeleton */}
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
            <div className="flex min-w-max gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="w-60 flex-shrink-0">
                  <Skeleton className="mb-2 h-5 w-full rounded-md" />
                  <Skeleton className="h-80 w-full rounded-[12px]" />
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
