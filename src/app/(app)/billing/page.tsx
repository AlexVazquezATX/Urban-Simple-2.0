import { Suspense } from 'react'
import Link from 'next/link'
import { DollarSign, AlertTriangle, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ARagingTable } from '@/components/billing/ar-aging-table'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function ARDashboard() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="text-destructive">
        Please log in to view AR aging report.
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all outstanding invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
      status: {
        in: ['draft', 'sent', 'partial'],
      },
      balanceDue: {
        gt: 0,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          billingEmail: true,
          phone: true,
        },
      },
    },
    orderBy: {
      dueDate: 'asc',
    },
  })

  // Calculate aging for each invoice
  const invoicesWithAging = invoices.map((invoice) => {
    const dueDate = new Date(invoice.dueDate)
    const daysPastDue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    let agingBucket = 'current'
    if (daysPastDue > 90) {
      agingBucket = 'overdue_90_plus'
    } else if (daysPastDue > 60) {
      agingBucket = 'overdue_61_90'
    } else if (daysPastDue > 30) {
      agingBucket = 'overdue_31_60'
    } else if (daysPastDue >= 0) {
      agingBucket = 'current'
    }

    return {
      ...invoice,
      daysPastDue,
      agingBucket,
    }
  })

  // Calculate totals by bucket
  const totals = {
    current: 0,
    overdue_31_60: 0,
    overdue_61_90: 0,
    overdue_90_plus: 0,
    total: 0,
  }

  const counts = {
    current: 0,
    overdue_31_60: 0,
    overdue_61_90: 0,
    overdue_90_plus: 0,
    total: invoicesWithAging.length,
  }

  invoicesWithAging.forEach((invoice) => {
    const amount = Number(invoice.balanceDue)
    totals[invoice.agingBucket as keyof typeof totals] += amount
    totals.total += amount
    counts[invoice.agingBucket as keyof typeof counts]++
  })

  const data = {
    invoices: invoicesWithAging,
    totals,
    counts,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Accounts Receivable</h1>
        <p className="text-muted-foreground">
          Track outstanding invoices and payment status
        </p>
      </div>

      {/* AR Aging Buckets */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current (0-30)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.current.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {counts.current} {counts.current === 1 ? 'invoice' : 'invoices'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">31-60 Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${totals.overdue_31_60.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {counts.overdue_31_60}{' '}
              {counts.overdue_31_60 === 1 ? 'invoice' : 'invoices'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">61-90 Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              ${totals.overdue_61_90.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {counts.overdue_61_90}{' '}
              {counts.overdue_61_90 === 1 ? 'invoice' : 'invoices'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">90+ Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              ${totals.overdue_90_plus.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {counts.overdue_90_plus}{' '}
              {counts.overdue_90_plus === 1 ? 'invoice' : 'invoices'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Total Outstanding */}
      <Card>
        <CardHeader>
          <CardTitle>Total Outstanding</CardTitle>
          <CardDescription>
            All unpaid invoices across all aging buckets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            ${totals.total.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {counts.total} {counts.total === 1 ? 'invoice' : 'invoices'} outstanding
          </p>
        </CardContent>
      </Card>

      {/* AR Aging Table */}
      <ARagingTable initialData={data} />
    </div>
  )
}

function ARDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-48" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<ARDashboardSkeleton />}>
      <ARDashboard />
    </Suspense>
  )
}


