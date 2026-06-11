import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { PipelineTabs } from '@/components/pipeline/pipeline-tabs'

async function PipelineData() {
  const user = await getCurrentUser()
  if (!user) return <div>Please log in</div>

  const [allProspects, pipelineProspects] = await Promise.all([
    prisma.prospect.findMany({
      where: { companyId: user.companyId, deletedAt: null },
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
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, title: true },
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: {
          select: { activities: true, outreachMessages: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    }),
    prisma.prospect.findMany({
      where: {
        companyId: user.companyId,
        deletedAt: null,
        status: { not: 'prospect' },
      },
      select: {
        id: true,
        companyName: true,
        status: true,
        priority: true,
        estimatedValue: true,
        contacts: {
          take: 1,
          select: { firstName: true, lastName: true },
        },
      },
    }),
  ])

  const serializedProspects = allProspects.map(p => ({
    ...p,
    estimatedValue: p.estimatedValue ? Number(p.estimatedValue) : null,
    lastContactedAt: p.lastContactedAt ? p.lastContactedAt.toISOString() : null,
    agentQueuedAt: p.agentQueuedAt ? p.agentQueuedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
  }))

  const serializedPipeline = pipelineProspects.map(p => ({
    ...p,
    estimatedValue: p.estimatedValue ? Number(p.estimatedValue) : null,
  }))

  return (
    <PipelineTabs
      prospects={serializedProspects}
      pipelineProspects={serializedPipeline}
    />
  )
}

export default async function PipelinePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="GROWTH · PIPELINE"
        title="Pipeline"
        subtitle="Discover, qualify, and convert prospects"
        className="mb-0"
      />

      <Suspense fallback={<Skeleton className="h-[600px] rounded-[14px]" />}>
        <PipelineData />
      </Suspense>
    </div>
  )
}
