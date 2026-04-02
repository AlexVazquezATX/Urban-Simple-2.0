import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { MoneyTabs } from '@/components/money/money-tabs'

async function MoneyData() {
  const user = await getCurrentUser()
  if (!user) return <div>Please log in</div>

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const companyFilter = {
    companyId: user.companyId,
    ...(user.branchId && { branchId: user.branchId }),
  }

  const [outstandingInvoices, allInvoices, agreements] = await Promise.all([
    // AR aging data
    prisma.invoice.findMany({
      where: {
        client: companyFilter,
        status: { in: ['draft', 'sent', 'partial'] },
        balanceDue: { gt: 0 },
      },
      include: {
        client: { select: { id: true, name: true, billingEmail: true, phone: true } },
      },
      orderBy: { dueDate: 'asc' },
    }),
    // All invoices
    prisma.invoice.findMany({
      where: { client: companyFilter },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { issueDate: 'desc' },
    }),
    // Service agreements
    prisma.serviceAgreement.findMany({
      where: {
        location: {
          client: companyFilter,
        },
        isActive: true,
      },
      include: {
        location: {
          select: { id: true, name: true, client: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Calculate AR aging
  const invoicesWithAging = outstandingInvoices.map((invoice) => {
    const dueDate = new Date(invoice.dueDate)
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    let agingBucket = 'current'
    if (daysPastDue > 90) agingBucket = 'overdue_90_plus'
    else if (daysPastDue > 60) agingBucket = 'overdue_61_90'
    else if (daysPastDue > 30) agingBucket = 'overdue_31_60'
    return { ...invoice, daysPastDue, agingBucket }
  })

  const totals = { current: 0, overdue_31_60: 0, overdue_61_90: 0, overdue_90_plus: 0, total: 0 }
  const counts = { current: 0, overdue_31_60: 0, overdue_61_90: 0, overdue_90_plus: 0, total: invoicesWithAging.length }

  invoicesWithAging.forEach((inv) => {
    const amount = Number(inv.balanceDue)
    totals[inv.agingBucket as keyof typeof totals] += amount
    totals.total += amount
    counts[inv.agingBucket as keyof typeof counts]++
  })

  // Invoice summary
  const totalOutstanding = allInvoices
    .filter(inv => ['draft', 'sent', 'partial'].includes(inv.status) && Number(inv.balanceDue) > 0)
    .reduce((sum, inv) => sum + Number(inv.balanceDue), 0)

  const overdueInvs = allInvoices.filter(inv => {
    if (!['sent', 'partial'].includes(inv.status)) return false
    return new Date(inv.dueDate) < today && Number(inv.balanceDue) > 0
  })

  const totalOverdue = overdueInvs.reduce((sum, inv) => sum + Number(inv.balanceDue), 0)

  // Serialize for client
  const serializedInvoices = allInvoices.map(inv => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.client.name,
    issueDate: inv.issueDate.toISOString(),
    dueDate: inv.dueDate.toISOString(),
    totalAmount: Number(inv.totalAmount),
    balanceDue: Number(inv.balanceDue),
    status: inv.status,
  }))

  const serializedAgreements = agreements.map(sa => ({
    id: sa.id,
    clientName: sa.location.client.name,
    locationName: sa.location.name,
    monthlyAmount: Number(sa.monthlyAmount),
    paymentTerms: sa.paymentTerms,
    isActive: sa.isActive,
  }))

  return (
    <MoneyTabs
      arData={{ invoices: invoicesWithAging, totals, counts }}
      allInvoices={serializedInvoices}
      agreements={serializedAgreements}
      invoiceSummary={{ totalOutstanding, totalOverdue, overdueCount: overdueInvs.length }}
    />
  )
}

export default async function MoneyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-medium tracking-tight font-display text-warm-900 dark:text-cream-100">
          Money
        </h1>
        <p className="text-warm-500 dark:text-cream-400">
          Invoices, payments, and service agreements
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-150 rounded-sm" />}>
        <MoneyData />
      </Suspense>
    </div>
  )
}
