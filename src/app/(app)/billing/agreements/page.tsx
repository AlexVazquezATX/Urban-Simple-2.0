import { Suspense } from 'react'
import { Banknote, DollarSign, FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { ServiceAgreementForm } from '@/components/forms/service-agreement-form'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { formatMoneyExact } from '@/lib/format'

async function ServiceAgreementsList() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="text-muted-foreground">
        Please log in to view service agreements.
      </div>
    )
  }

  const agreements = await prisma.serviceAgreement.findMany({
    where: {
      location: {
        branchId: user.branchId || undefined,
        client: {
          companyId: user.companyId,
        },
      },
      isActive: true,
    },
    include: {
      location: {
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      contract: {
        select: {
          id: true,
          contractNumber: true,
          status: true,
        },
      },
      _count: {
        select: {
          invoiceLineItems: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (agreements.length === 0) {
    return (
      <div>
        <PageHeader
          kicker="MONEY · AGREEMENTS"
          title="Service Agreements"
          subtitle="Manage recurring service agreements and billing"
        />
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No agreements yet — recurring revenue starts here"
              description="Set up a service agreement for a location and its monthly billing takes care of itself."
              action={
                <ServiceAgreementForm>
                  <Button variant="gold">
                    <Plus className="size-4" />
                    Create Your First Agreement
                  </Button>
                </ServiceAgreementForm>
              }
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate total monthly revenue
  const totalMonthly = agreements.reduce(
    (sum: number, agreement: any) =>
      sum + Number(agreement.monthlyAmount),
    0
  )

  return (
    <div>
      <PageHeader
        kicker="MONEY · AGREEMENTS"
        title="Service Agreements"
        subtitle="Manage recurring service agreements and billing"
        actions={
          <ServiceAgreementForm>
            <Button variant="gold">
              <Plus className="size-4" />
              New Agreement
            </Button>
          </ServiceAgreementForm>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Active agreements"
            icon={FileText}
            value={agreements.length}
            sub="Currently active"
          />
          <StatCard
            label="Monthly revenue"
            icon={DollarSign}
            value={formatMoneyExact(totalMonthly)}
            sub="Recurring monthly"
          />
          <StatCard
            label="Annual revenue"
            icon={Banknote}
            value={formatMoneyExact(totalMonthly * 12)}
            sub="Projected annual"
          />
        </div>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Active Agreements</CardTitle>
            <CardDescription className="text-xs">
              {agreements.length} {agreements.length === 1 ? 'agreement' : 'agreements'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Monthly Amount</TableHead>
                  <TableHead>Billing Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((agreement: any) => (
                  <TableRow key={agreement.id}>
                    <TableCell className="font-medium text-foreground">
                      {agreement.location.client.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{agreement.location.name}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {agreement.description}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-foreground">
                      {formatMoneyExact(Number(agreement.monthlyAmount))}
                    </TableCell>
                    <TableCell className="font-mono tabular-nums text-muted-foreground">
                      Day {agreement.billingDay}
                    </TableCell>
                    <TableCell>
                      <Badge variant={agreement.isActive ? 'green' : 'neutral'}>
                        {agreement.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <ServiceAgreementForm agreement={agreement}>
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                      </ServiceAgreementForm>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ServiceAgreementsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardHeader>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-32" />
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

export default function ServiceAgreementsPage() {
  return (
    <Suspense fallback={<ServiceAgreementsListSkeleton />}>
      <ServiceAgreementsList />
    </Suspense>
  )
}
