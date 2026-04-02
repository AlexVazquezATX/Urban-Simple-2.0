import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamTabs } from '@/components/team-hub/team-tabs'

async function TeamHubData() {
  const user = await getCurrentUser()
  if (!user) return <div>Please log in</div>

  const [users, branches] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: user.companyId },
      include: {
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }, { lastName: 'asc' }],
    }),
    prisma.branch.findMany({
      where: { companyId: user.companyId, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const serializedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    displayName: u.displayName,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    branchId: u.branchId,
    branch: u.branch,
    createdAt: u.createdAt.toISOString(),
  }))

  const serializedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
    code: b.code,
  }))

  const stats = {
    totalMembers: users.length,
    activeMembers: users.filter(u => u.isActive).length,
    associates: users.filter(u => u.role === 'ASSOCIATE').length,
    managers: users.filter(u => ['MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(u.role)).length,
  }

  return (
    <TeamTabs
      users={serializedUsers}
      branches={serializedBranches}
      stats={stats}
    />
  )
}

export default async function TeamHubPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-medium tracking-tight font-display text-warm-900 dark:text-cream-100">
          Team
        </h1>
        <p className="text-warm-500 dark:text-cream-400">
          Your people, schedules, and assignments
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-150 rounded-sm" />}>
        <TeamHubData />
      </Suspense>
    </div>
  )
}
