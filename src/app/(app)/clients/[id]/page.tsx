import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientForm } from '@/components/forms/client-form'
import { ClientDetailTabs } from '@/components/clients/client-detail-tabs'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function ClientDetail({ id }: { id: string }) {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  const client = await prisma.client.findFirst({
    where: {
      id,
      companyId: user.companyId,
    },
    include: {
      branch: {
        select: {
          name: true,
          code: true,
        },
      },
      locations: {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">{serializedClient.name}</h1>
            <p className="text-sm text-warm-500">
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
        <ClientForm client={serializedClient}>
          <Button variant="outline" className="rounded-sm border-warm-200 text-warm-700 hover:border-ocean-400 hover:bg-warm-50">Edit Client</Button>
        </ClientForm>
      </div>

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
