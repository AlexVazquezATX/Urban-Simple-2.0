import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { WorkforceDashboard } from '@/components/workforce/workforce-dashboard'

function WorkforceSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-[14px]" />
        ))}
      </div>
      <Skeleton className="h-[600px] w-full rounded-[14px]" />
    </div>
  )
}

export default function WorkforcePage() {
  return (
    <Suspense fallback={<WorkforceSkeleton />}>
      <WorkforceDashboard />
    </Suspense>
  )
}
