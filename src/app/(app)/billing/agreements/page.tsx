import { Suspense } from 'react'
import { Plus, DollarSign } from 'lucide-react'
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
import { ServiceAgreementForm } from '@/components/forms/service-agreement-form'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function ServiceAgreementsList() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="text-destructive">
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
      <Card className="rounded-sm border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 mb-4 text-warm-400" />
          <p className="text-warm-500 mb-4">No service agreements yet</p>
          <ServiceAgreementForm>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Agreement
            </Button>
          </ServiceAgreementForm>
        </CardContent>
      </Card>
    )
  }

  // Calculate total monthly revenue
  const totalMonthly = agreements.reduce(
    (sum: number, agreement: any) =>
      sum + Number(agreement.monthlyAmount),
    0
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900">Service Agreements</h1>
          <p className="text-sm text-warm-500">
            Manage recurring service agreements and billing
          </p>
        </div>
        <ServiceAgreementForm>
          <Button variant="lime" className="rounded-sm">
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Button>
        </ServiceAgreementForm>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Active Agreements</CardTitle>
            <DollarSign className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">{agreements.length}</div>
            <p className="text-xs text-warm-500">Currently active</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">
              ${totalMonthly.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-warm-500">Recurring monthly</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-warm-700">Annual Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-warm-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-display font-medium text-warm-900">
              ${(totalMonthly * 12).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-warm-500">Projected annual</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-sm border-warm-200">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900">Active Agreements</CardTitle>
          <CardDescription className="text-warm-500">
            {agreements.length} {agreements.length === 1 ? 'agreement' : 'agreements'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-warm-200 hover:bg-transparent">
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Client</TableHead>
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Location</TableHead>
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Description</TableHead>
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Monthly Amount</TableHead>
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Billing Day</TableHead>
                <TableHead className="text-xs font-medium text-warm-500 uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((agreement: any) => (
                <TableRow key={agreement.id} className="border-warm-200 hover:bg-warm-50">
                  <TableCell className="font-medium text-warm-900">
                    {agreement.location.client.name}
                  </TableCell>
                  <TableCell className="text-warm-600">{agreement.location.name}</TableCell>
                  <TableCell className="max-w-xs truncate text-warm-600">
                    {agreement.description}
                  </TableCell>
                  <TableCell className="text-warm-900">
                    ${Number(agreement.monthlyAmount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-warm-600">Day {agreement.billingDay}</TableCell>
                  <TableCell>
                    <Badge
                      className={`rounded-sm text-[10px] px-1.5 py-0 ${
                        agreement.isActive
                          ? 'bg-lime-100 text-lime-700 border-lime-200'
                          : 'bg-warm-100 text-warm-600 border-warm-200'
                      }`}
                    >
                      {agreement.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ServiceAgreementForm agreement={agreement}>
                      <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600 hover:bg-warm-50">
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
  )
}

function ServiceAgreementsListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
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




