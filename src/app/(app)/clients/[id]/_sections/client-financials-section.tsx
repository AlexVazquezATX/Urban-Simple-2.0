import { Lock } from 'lucide-react'
import { ClientFinancialsBlock } from '@/components/clients/client-financials-block'
import { FinancialKPIRow } from '@/components/shared/financial-kpi-row'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canSeeFinancials, summarizeAgreements, summarizeBand } from '@/lib/financials'

// SUPER_ADMIN-only financials section. Streams independently of the heavier
// detail content, so the money headline appears as soon as it resolves.
export async function ClientFinancialsSection({ id }: { id: string }) {
  const user = await getCurrentUser()
  if (!user || !canSeeFinancials(user.role)) return null

  // Agreements for this client AND its child clients, rolled up in one query.
  const agreements = await prisma.serviceAgreement.findMany({
    where: {
      isActive: true,
      client: {
        companyId: user.companyId,
        deletedAt: null,
        OR: [{ id }, { parentClientId: id }],
      },
    },
    select: {
      id: true,
      description: true,
      locationId: true,
      monthlyAmount: true,
      monthlyLaborCost: true,
      monthlyMaterialCost: true,
      monthlyOtherCost: true,
      isActive: true,
      location: { select: { name: true } },
    },
    orderBy: [{ location: { name: 'asc' } }],
  })

  const toInput = (a: (typeof agreements)[number]) => ({
    monthlyAmount: a.monthlyAmount as unknown as string,
    monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
    monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
    monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
    isActive: a.isActive,
  })

  const summary = summarizeAgreements(agreements.map(toInput))
  const locationsServiced = new Set(agreements.map((a) => a.locationId)).size
  const bandData = summarizeBand(agreements.map(toInput), locationsServiced)

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <FinancialKPIRow
          locationsServiced={locationsServiced}
          mrr={bandData.mrr}
          arr={bandData.arr}
          monthlyProfit={bandData.monthlyProfit}
          blendedMarginPct={bandData.blendedMarginPct}
        />
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          Gross P&amp;L from service agreements · This client + child accounts.
          Overhead-inclusive net lives on the Financials dashboard.
        </p>
      </div>
      <ClientFinancialsBlock
        summary={summary}
        agreements={agreements.map((a) => ({
          id: a.id,
          description: a.description,
          locationName: a.location.name,
          monthlyAmount: Number(a.monthlyAmount),
          monthlyLaborCost: a.monthlyLaborCost === null ? null : Number(a.monthlyLaborCost),
          monthlyMaterialCost:
            a.monthlyMaterialCost === null ? null : Number(a.monthlyMaterialCost),
          monthlyOtherCost: a.monthlyOtherCost === null ? null : Number(a.monthlyOtherCost),
        }))}
      />
    </div>
  )
}
