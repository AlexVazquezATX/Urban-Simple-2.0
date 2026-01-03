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
import { getApiUrl } from '@/lib/api'

async function ServiceAgreementsList() {
  const response = await fetch(getApiUrl('/api/service-agreements?active=true'), {
    cache: 'no-store',
  })

  if (!response.ok) {
    return (
      <div className="text-destructive">
        Failed to load service agreements. Please try again.
      </div>
    )
  }

  const agreements = await response.json()

  if (agreements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <DollarSign className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No service agreements yet</p>
          <ServiceAgreementForm>
            <Button>
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
          <h1 className="text-3xl font-bold">Service Agreements</h1>
          <p className="text-muted-foreground">
            Manage recurring service agreements and billing
          </p>
        </div>
        <ServiceAgreementForm>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Button>
        </ServiceAgreementForm>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agreements</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agreements.length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalMonthly.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">Recurring monthly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalMonthly * 12).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">Projected annual</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Agreements</CardTitle>
          <CardDescription>
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
                <TableHead>Monthly Amount</TableHead>
                <TableHead>Billing Day</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agreements.map((agreement: any) => (
                <TableRow key={agreement.id}>
                  <TableCell className="font-medium">
                    {agreement.client.name}
                  </TableCell>
                  <TableCell>{agreement.location.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {agreement.description}
                  </TableCell>
                  <TableCell>
                    ${Number(agreement.monthlyAmount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell>Day {agreement.billingDay}</TableCell>
                  <TableCell>
                    <Badge variant={agreement.isActive ? 'default' : 'secondary'}>
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

