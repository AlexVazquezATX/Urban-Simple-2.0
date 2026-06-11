import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canSeeFinancials } from '@/lib/financials'

// Heavier detail content — locations, contacts, facility profiles and the
// tabbed interface. Wrapped in its own Suspense boundary so it streams in
// without blocking the header above it.
export async function ClientDetailContent({ id }: { id: string }) {
  const user = await getCurrentUser()
  if (!user) return <div>Please log in</div>

  const [client, childClients] = await Promise.all([
    prisma.client.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
      include: {
        parentClient: { select: { id: true, name: true } },
        branch: { select: { name: true, code: true } },
        locations: {
          where: { deletedAt: null },
          include: {
            branch: { select: { name: true, code: true } },
            checklistTemplate: { select: { id: true, name: true } },
            _count: {
              select: { serviceAgreements: { where: { isActive: true } } },
            },
          },
          orderBy: { name: 'asc' },
        },
        contacts: {
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
        facilityProfiles: {
          include: {
            location: {
              select: { id: true, name: true, address: true, isActive: true },
            },
            seasonalRules: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
            },
            monthlyOverrides: {
              orderBy: [{ year: 'desc' }, { month: 'desc' }],
              take: 3,
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        _count: {
          select: {
            invoices: true,
            payments: true,
            issues: {
              where: { status: { in: ['open', 'in_progress'] } },
            },
          },
        },
      },
    }),
    prisma.client.findMany({
      where: { parentClientId: id, companyId: user.companyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: { locations: { where: { isActive: true, deletedAt: null } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!client) {
    return <div className="text-destructive">Client not found. Please try again.</div>
  }

  // Convert Decimal fields to plain numbers for client component serialization.
  const serializedClient = {
    ...client,
    taxRate: client.taxRate ? Number(client.taxRate) : null,
    facilityProfiles: client.facilityProfiles.map((fp: any) => ({
      ...fp,
      defaultMonthlyRate: Number(fp.defaultMonthlyRate),
      monthlyOverrides: fp.monthlyOverrides.map((mo: any) => ({
        ...mo,
        overrideRate: mo.overrideRate ? Number(mo.overrideRate) : null,
      })),
    })),
  }

  const showFinancials = canSeeFinancials(user.role)

  return (
    <div className="space-y-6">
      {childClients.length > 0 && (
        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle>Child Clients ({childClients.length})</CardTitle>
            <p className="text-xs text-muted-foreground">
              {showFinancials
                ? 'The financials above roll up every child client.'
                : 'Properties owned by this parent organization.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            {childClients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between rounded-[10px] border border-border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-secondary/40"
              >
                <div>
                  <p className="font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c._count.locations} {c._count.locations === 1 ? 'location' : 'locations'} ·{' '}
                    {c.status}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <ClientDetailTabs client={serializedClient} />
    </div>
  )
}
