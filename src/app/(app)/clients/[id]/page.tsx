import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientForm } from '@/components/forms/client-form'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { ClientFinancialsBlock } from '@/components/clients/client-financials-block'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canSeeFinancials, summarizeAgreements } from '@/lib/financials'

async function ClientDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const showFinancials = canSeeFinancials(user.role)

  const client = await prisma.client.findFirst({
    where: {
      id,
      companyId: user.companyId,
      deletedAt: null,
    },
    include: {
      branch: {
        select: {
          name: true,
          code: true,
        },
      },
      locations: {
        where: { deletedAt: null },
        include: {
          branch: {
            select: {
              name: true,
              code: true,
            },
          },
          checklistTemplate: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              serviceAgreements: {
                where: {
                  isActive: true,
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
      contacts: {
        orderBy: [
          { role: 'asc' },
          { createdAt: 'asc' },
        ],
      },
      facilityProfiles: {
        include: {
          location: {
            select: {
              id: true,
              name: true,
              address: true,
              isActive: true,
            },
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
            where: {
              status: {
                in: ['open', 'in_progress'],
              },
            },
          },
        },
      },
    },
  })

  if (!client) {
    return (
      <div className="text-destructive">
        Client not found. Please try again.
      </div>
    )
  }

  // Convert Decimal fields to plain numbers for client component serialization
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

  // Per-location financials are fetched separately and only when the user is
  // a SUPER_ADMIN, so the data never reaches the client bundle for anyone else.
  const agreementsForFinancials = showFinancials
    ? await prisma.serviceAgreement.findMany({
        where: { clientId: id, isActive: true },
        select: {
          id: true,
          description: true,
          monthlyAmount: true,
          monthlyLaborCost: true,
          monthlyMaterialCost: true,
          monthlyOtherCost: true,
          isActive: true,
          location: { select: { id: true, name: true } },
        },
        orderBy: { location: { name: 'asc' } },
      })
    : []

  const overallSummary = showFinancials
    ? summarizeAgreements(
        agreementsForFinancials.map(a => ({
          monthlyAmount: a.monthlyAmount as unknown as string,
          monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
          monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
          monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
          isActive: a.isActive,
        }))
      )
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="rounded-sm text-warm-600 dark:text-cream-400 hover:text-ocean-600 hover:bg-warm-50 dark:hover:bg-charcoal-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">{serializedClient.name}</h1>
            <p className="text-sm text-warm-500 dark:text-cream-400">
              {serializedClient.legalName && `${serializedClient.legalName} • `}
              {serializedClient.branch.name}
              {serializedClient.locations.length > 0 && (
                <span className="ml-2">
                  • {serializedClient.locations.length}{' '}
                  {serializedClient.locations.length === 1 ? 'location' : 'locations'}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClientForm client={serializedClient}>
            <Button variant="outline" className="rounded-sm border-warm-200 dark:border-charcoal-700 text-warm-700 dark:text-cream-300 hover:border-ocean-400 hover:bg-warm-50 dark:hover:bg-charcoal-800">Edit Client</Button>
          </ClientForm>
          <ConfirmDeleteButton
            endpoint={`/api/clients/${id}`}
            entityLabel={serializedClient.name}
            entityKind="client"
            redirectTo="/clients"
            buttonLabel="Delete"
            variant="outline"
            size="default"
            className="rounded-sm border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
          />
        </div>
      </div>

      {showFinancials && overallSummary && (
        <ClientFinancialsBlock
          summary={overallSummary}
          agreements={agreementsForFinancials.map(a => ({
            id: a.id,
            description: a.description,
            locationName: a.location.name,
            monthlyAmount: Number(a.monthlyAmount),
            monthlyLaborCost: a.monthlyLaborCost === null ? null : Number(a.monthlyLaborCost),
            monthlyMaterialCost: a.monthlyMaterialCost === null ? null : Number(a.monthlyMaterialCost),
            monthlyOtherCost: a.monthlyOtherCost === null ? null : Number(a.monthlyOtherCost),
          }))}
        />
      )}

      <ClientDetailTabs client={serializedClient} />
    </div>
  )
}

function ClientDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<ClientDetailSkeleton />}>
      <ClientDetail id={id} />
    </Suspense>
  )
}
