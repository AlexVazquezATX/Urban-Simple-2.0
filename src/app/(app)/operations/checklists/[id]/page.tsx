import { Suspense } from 'react'
import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ChecklistBuilder } from '@/components/operations/checklist-builder'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function ChecklistDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const template = await prisma.checklistTemplate.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
    include: {
      locations: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          locations: true,
          serviceLogs: true,
        },
      },
    },
  })

  if (!template) {
    return (
      <EmptyState
        icon={SearchX}
        title="Checklist not found"
        description="It may have been removed, or the link is out of date. Head back to your templates and try again."
        action={
          <Button asChild variant="outline">
            <Link href="/operations/checklists">Back to Checklists</Link>
          </Button>
        }
      />
    )
  }

  return <ChecklistBuilder template={template as any} />
}

function ChecklistDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-[9px]" />
          <div>
            <Skeleton className="mb-2 h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-9 w-64 rounded-[9px]" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-[14px]" />
        <Skeleton className="h-64 w-full rounded-[14px]" />
      </div>
    </div>
  )
}

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<ChecklistDetailSkeleton />}>
      <ChecklistDetail id={id} />
    </Suspense>
  )
}
