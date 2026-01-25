import { Suspense } from 'react'
import { Users, Shield, UserCheck, User } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TeamListClient } from '@/components/team/team-list-client'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function TeamList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div className="text-warm-500">Please log in</div>
  }

  // Get all users in the company
  const users = await prisma.user.findMany({
    where: {
      companyId: user.companyId,
    },
    include: {
      branch: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [
      { isActive: 'desc' },
      { firstName: 'asc' },
      { lastName: 'asc' },
    ],
  })

  // Get branches for the form
  const branches = await prisma.branch.findMany({
    where: {
      companyId: user.companyId,
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Serialize the data for the client component
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

  return (
    <TeamListClient
      initialUsers={serializedUsers}
      branches={serializedBranches}
    />
  )
}

function TeamListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="rounded-sm border-warm-200">
            <CardHeader>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamListSkeleton />}>
      <TeamList />
    </Suspense>
  )
}
