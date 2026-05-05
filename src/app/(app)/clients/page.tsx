import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ClientsListClient } from '@/components/clients/clients-list-client'
import { canSeeFinancials, summarizeAgreements, type FinancialSummary } from '@/lib/financials'

async function ClientsList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const showFinancials = canSeeFinancials(user.role)

  const clients = await prisma.client.findMany({
    where: {
      companyId: user.companyId,
      ...(user.branchId && { branchId: user.branchId }),
    },
    include: {
      branch: true,
      locations: {
        where: {
          isActive: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })

  // Fetch agreements for financial rollup separately, gated to SUPER_ADMIN, so
  // financial data never reaches the client bundle for anyone else.
  const agreementsByClient = new Map<string, Array<{
    monthlyAmount: unknown
    monthlyLaborCost: unknown
    monthlyMaterialCost: unknown
    monthlyOtherCost: unknown
    isActive: boolean
  }>>()

  if (showFinancials && clients.length > 0) {
    const agreements = await prisma.serviceAgreement.findMany({
      where: {
        clientId: { in: clients.map(c => c.id) },
        isActive: true,
      },
      select: {
        clientId: true,
        monthlyAmount: true,
        monthlyLaborCost: true,
        monthlyMaterialCost: true,
        monthlyOtherCost: true,
        isActive: true,
      },
    })
    for (const a of agreements) {
      const list = agreementsByClient.get(a.clientId) ?? []
      list.push(a)
      agreementsByClient.set(a.clientId, list)
    }
  }

  // Convert Decimal fields to plain numbers for client component serialization,
  // and compute the per-client financial summary up here on the server.
  const serializedClients = clients.map((c) => {
    const agreements = agreementsByClient.get(c.id) ?? []
    const financials: FinancialSummary | null = showFinancials
      ? summarizeAgreements(
          agreements.map(a => ({
            monthlyAmount: a.monthlyAmount as unknown as string,
            monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
            monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
            monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
            isActive: a.isActive,
          }))
        )
      : null

    return {
      ...c,
      taxRate: c.taxRate ? Number(c.taxRate) : null,
      financials,
    }
  })

  return <ClientsListClient clients={serializedClients} showFinancials={showFinancials} />
}

function ClientsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsListSkeleton />}>
      <ClientsList />
    </Suspense>
  )
}

