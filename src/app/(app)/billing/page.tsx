import { Suspense } from 'react'
import { AlertTriangle, Clock, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/layout/page-header'
import { ARagingTable } from '@/components/billing/ar-aging-table'
import { QboConnectionCard } from '@/components/billing/qbo-connection-card'
import { agingTextClass } from '@/components/billing/aging'
import { formatMoneyExact } from '@/lib/format'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function ARDashboard() {
  const user = await getCurrentUser()
  if (!user) {
    return (
      <div className="text-muted-foreground">
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

  const serializedInvoices = invoicesWithAging.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    subtotal: Number(inv.subtotal),
    taxAmount: Number(inv.taxAmount),
    totalAmount: Number(inv.totalAmount),
    amountPaid: Number(inv.amountPaid),
    balanceDue: Number(inv.balanceDue),
    client: inv.client,
    daysPastDue: inv.daysPastDue,
    agingBucket: inv.agingBucket,
  }))

  const data = {
    invoices: serializedInvoices,
    totals,
    counts,
  }

  const invoiceWord = (n: number) => (n === 1 ? 'invoice' : 'invoices')

  return (
    <div>
      <PageHeader
        kicker="MONEY · ACCOUNTS RECEIVABLE"
        title="Billing & AR"
        subtitle="Track unpaid invoices and how long they've been waiting"
      />

      <div className="flex flex-col gap-4">
        {/* QuickBooks connection + sync */}
        <QboConnectionCard />

        {/* Total Outstanding — hero */}
        <StatCard
          label="Total outstanding"
          icon={Wallet}
          value={
            <span className="text-[40px] tracking-[-1.5px]">
              {formatMoneyExact(totals.total)}
            </span>
          }
          sub={`${counts.total} ${invoiceWord(counts.total)} outstanding across all aging buckets`}
        />

        {/* Aging ramp — teal → gold → coral → danger (the one approved red) */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="On time (0-30 days)"
            icon={Clock}
            value={
              <span className={agingTextClass.current}>
                {formatMoneyExact(totals.current)}
              </span>
            }
            sub={`${counts.current} ${invoiceWord(counts.current)}`}
          />
          <StatCard
            label="1-2 months late"
            icon={AlertTriangle}
            value={
              <span className={agingTextClass.overdue_31_60}>
                {formatMoneyExact(totals.overdue_31_60)}
              </span>
            }
            sub={`${counts.overdue_31_60} ${invoiceWord(counts.overdue_31_60)}`}
          />
          <StatCard
            label="2-3 months late"
            icon={AlertTriangle}
            value={
              <span className={agingTextClass.overdue_61_90}>
                {formatMoneyExact(totals.overdue_61_90)}
              </span>
            }
            sub={`${counts.overdue_61_90} ${invoiceWord(counts.overdue_61_90)}`}
          />
          <StatCard
            label="3+ months late"
            icon={AlertTriangle}
            value={
              <span className={agingTextClass.overdue_90_plus}>
                {formatMoneyExact(totals.overdue_90_plus)}
              </span>
            }
            sub={`${counts.overdue_90_plus} ${invoiceWord(counts.overdue_90_plus)}`}
          />
        </div>

        {/* AR Aging Table */}
        <ARagingTable initialData={data} />
      </div>
    </div>
  )
}

function ARDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-48 mb-3" />
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-4 w-40 mb-2" />
          <Skeleton className="h-12 w-56" />
        </CardHeader>
      </Card>
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
