import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GrowthAgentDashboard } from '@/components/growth/agent/growth-agent-dashboard'

export default async function GrowthAgentPage() {
  const user = await getCurrentUser()
  if (!user) {
    return <div>Please log in</div>
  }

  if (user.role !== 'SUPER_ADMIN') {
    redirect('/growth')
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto bg-warm-50 min-h-screen">
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        }
      >
        <GrowthAgentDashboard />
      </Suspense>
    </div>
  )
}
