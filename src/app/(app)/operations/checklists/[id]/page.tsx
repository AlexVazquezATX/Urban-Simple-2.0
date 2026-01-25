import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
      <div className="text-red-600">
        Checklist template not found. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/operations/checklists">
          <Button variant="ghost" size="icon" className="rounded-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">{template.name}</h1>
          {template.nameEs && (
            <p className="text-sm text-warm-500">{template.nameEs}</p>
          )}
          {template.description && (
            <p className="text-sm text-warm-500 mt-1">{template.description}</p>
          )}
        </div>
      </div>

      <ChecklistBuilder template={template as any} />
    </div>
  )
}

function ChecklistDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-sm" />
        <div>
          <Skeleton className="h-8 w-64 mb-2 rounded-sm" />
          <Skeleton className="h-4 w-48 rounded-sm" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-sm" />
        <Skeleton className="h-64 w-full rounded-sm" />
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

