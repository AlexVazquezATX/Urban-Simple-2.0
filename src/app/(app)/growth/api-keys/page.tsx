import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ApiKeysClient } from '@/components/growth/api-keys-client'
import { redirect } from 'next/navigation'

async function ApiKeysList() {
  const user = await getCurrentUser()
  if (!user) {
    return <div>Please log in</div>
  }

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    redirect('/growth')
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { companyId: user.companyId },
    select: {
      id: true,
      name: true,
      description: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const serializedKeys = apiKeys.map(key => ({
    ...key,
    lastUsedAt: key.lastUsedAt?.toISOString() || null,
    createdAt: key.createdAt.toISOString(),
    expiresAt: key.expiresAt?.toISOString() || null,
    revokedAt: key.revokedAt?.toISOString() || null,
  }))

  return <ApiKeysClient apiKeys={serializedKeys} />
}

export default function ApiKeysPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 md:p-6 max-w-4xl mx-auto bg-warm-50 min-h-screen">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-7 w-32 rounded-sm" />
              <Skeleton className="h-4 w-64 mt-2 rounded-sm" />
            </div>
            <Skeleton className="h-8 w-36 rounded-sm" />
          </div>
          <Skeleton className="h-[300px] rounded-sm" />
        </div>
      }
    >
      <ApiKeysList />
    </Suspense>
  )
}
