import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ClientsListClient } from '@/components/clients/clients-list-client'
import {
  canSeeFinancials,
  summarizeAgreements,
  summarizeBand,
  type FinancialSummary,
  type FinancialsBandData,
} from '@/lib/financials'
import type { ViewMode } from '@/components/ui/view-toggle'

async function ClientsList() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const showFinancials = canSeeFinancials(user.role)

  const clientsWhere = {
    companyId: user.companyId,
    deletedAt: null,
    ...(user.branchId && { branchId: user.branchId }),
  }

  // The clients query and the financials query are independent — run them
  // together instead of sequentially. The agreements query filters through the
  // client relation, so it does not need resolved client ids first. Reading the
  // view-mode cookie is folded into the same await.
  const [clients, agreements, cookieStore] = await Promise.all([
    prisma.client.findMany({
      where: clientsWhere,
      include: {
        branch: true,
        // Only the location count is rendered in the list — fetch ids, not rows.
        locations: {
          where: { isActive: true, deletedAt: null },
          select: { id: true },
        },
        parentClient: { select: { id: true, name: true } },
        _count: {
          select: { childClients: { where: { deletedAt: null } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    showFinancials
      ? prisma.serviceAgreement.findMany({
          where: { isActive: true, client: clientsWhere },
          select: {
            clientId: true,
            locationId: true,
            monthlyAmount: true,
            monthlyLaborCost: true,
            monthlyMaterialCost: true,
            monthlyOtherCost: true,
            isActive: true,
          },
        })
      : Promise.resolve([]),
    cookies(),
  ])

  const initialViewMode: ViewMode =
    cookieStore.get('clients-view-mode')?.value === 'card' ? 'card' : 'table'

  // Group active agreements by client for the per-client summaries.
  const agreementsByClient = new Map<string, typeof agreements>()
  for (const a of agreements) {
    const list = agreementsByClient.get(a.clientId) ?? []
    list.push(a)
    agreementsByClient.set(a.clientId, list)
  }

  const toFinancialsInput = (a: (typeof agreements)[number]) => ({
    monthlyAmount: a.monthlyAmount as unknown as string,
    monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
    monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
    monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
    isActive: a.isActive,
  })

  // Convert Decimal fields to plain numbers for client serialization, and
  // compute the per-client financial summary up here on the server.
  const serializedClients = clients.map((c) => {
    const financials: FinancialSummary | null = showFinancials
      ? summarizeAgreements((agreementsByClient.get(c.id) ?? []).map(toFinancialsInput))
      : null

    return {
      ...c,
      taxRate: c.taxRate ? Number(c.taxRate) : null,
      financials,
    }
  })

  // Portfolio rollup for the financials band. "Locations serviced" means
  // locations with active billing for admins; non-admins see the active
  // location count as an honest proxy (they never see money anyway).
  const totalActiveLocations = clients.reduce((sum, c) => sum + c.locations.length, 0)
  const locationsServiced = showFinancials
    ? new Set(agreements.map((a) => a.locationId)).size
    : totalActiveLocations
  const bandData: FinancialsBandData | null = showFinancials
    ? summarizeBand(agreements.map(toFinancialsInput), locationsServiced)
    : null

  return (
    <ClientsListClient
      clients={serializedClients}
      showFinancials={showFinancials}
      initialViewMode={initialViewMode}
      bandData={bandData}
      locationsServiced={locationsServiced}
    />
  )
}

function ClientsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <Skeleton className="mb-2 h-4 w-36" />
          <Skeleton className="mb-2 h-9 w-32" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-[9px]" />
      </div>
      {/* Financial KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-[14px]" />
        ))}
      </div>
      {/* Search toolbar */}
      <Skeleton className="h-9 w-full max-w-sm rounded-[12px]" />
      <Card>
        <CardHeader>
          <Skeleton className="mb-2 h-6 w-32" />
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
