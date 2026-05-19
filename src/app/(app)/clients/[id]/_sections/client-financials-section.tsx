import { ClientFinancialsBlock } from '@/components/clients/client-financials-block'
import { FinancialsSummaryBand } from '@/components/financials/financials-summary-band'
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
      <FinancialsSummaryBand
        variant="admin"
        locationsServiced={locationsServiced}
        data={bandData}
        scopeLabel="This client + child accounts"
      />
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
