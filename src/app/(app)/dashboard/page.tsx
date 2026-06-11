import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, DollarSign, AlertTriangle, Calendar, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { formatMoney } from '@/lib/format'
import { canSeeFinancials } from '@/lib/financials'
import { FocusWidget } from '@/components/dashboard/focus-widget'
import { TonightsOperations } from '@/components/dashboard/tonights-operations'
import { NeedsAttention } from '@/components/dashboard/needs-attention'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { NetCashFlowCard } from '@/components/dashboard/net-cash-flow-card'
import { BriefingBanner } from '@/components/dashboard/briefing-banner'
import { SnapshotButton } from '@/components/dashboard/snapshot-button'
import { MyNightView } from '@/components/command/my-night-view'

async function DashboardStats() {
  const user = await getCurrentUser()

  if (!user) {
    return <div>Please log in</div>
  }

  // Query database directly instead of API calls
  const clients = await prisma.client.findMany({
    where: {
      companyId: user.companyId,
      deletedAt: null,
      ...(user.branchId && { branchId: user.branchId }),
    },
  })

  // Get all invoices
  const invoices = await prisma.invoice.findMany({
    where: {
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
    },
  })

  // Calculate AR aging
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const outstandingInvoices = invoices.filter(inv =>
    ['draft', 'sent', 'partial'].includes(inv.status) && Number(inv.balanceDue) > 0
  )

  const arTotal = outstandingInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue), 0)

  // Calculate overdue count
  const overdueCount = outstandingInvoices.filter(inv => {
    const dueDate = new Date(inv.dueDate)
    const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysPastDue > 0
  }).length

  // Calculate this month's revenue
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const thisMonthRevenue = invoices
    .filter((inv) => {
      const issueDate = new Date(inv.issueDate)
      return (
        issueDate.getMonth() === thisMonth &&
        issueDate.getFullYear() === thisYear
      )
    })
    .reduce((sum, inv) => sum + Number(inv.totalAmount), 0)

  // Clients added this month (delta chip on Active clients)
  const newClientsThisMonth = clients.filter(client => {
    const createdAt = new Date(client.createdAt)
    return createdAt.getMonth() === thisMonth && createdAt.getFullYear() === thisYear
  }).length

  const monthName = new Date().toLocaleString('en-US', { month: 'long' })

  // Net cash flow mini strip — last 6 monthly snapshots (financials-gated)
  const snapshots = canSeeFinancials(user.role)
    ? await prisma.monthlyFinancialSnapshot.findMany({
        where: { companyId: user.companyId },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        take: 6,
      })
    : []
  const cashFlowMonths = [...snapshots].reverse().map(snapshot => ({
    label: new Date(snapshot.periodYear, snapshot.periodMonth - 1, 1)
      .toLocaleString('en-US', { month: 'short' }),
    value: Number(snapshot.netCashFlow),
  }))

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active clients"
          value={clients.length}
          sub={newClientsThisMonth > 0 ? `${newClientsThisMonth} new this month` : 'Active accounts'}
          icon={Users}
          delta={newClientsThisMonth > 0 ? { text: `+${newClientsThisMonth}`, tone: 'green' } : undefined}
        />
        <StatCard
          label="AR outstanding"
          value={formatMoney(arTotal)}
          icon={DollarSign}
          sub={
            <Link href="/billing" className="transition-colors hover:text-foreground">
              View aging report →
            </Link>
          }
        />
        <StatCard
          label={`Invoiced · ${monthName}`}
          value={formatMoney(thisMonthRevenue)}
          sub="Revenue invoiced so far"
          icon={Calendar}
          tone="teal"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon={AlertTriangle}
          tone="coral"
          sub={
            <Link href="/billing" className="transition-colors hover:text-foreground">
              Review past due →
            </Link>
          }
        />
      </div>

      {/* Main grid — work cards left, attention rail right */}
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <FocusWidget />
          <TonightsOperations />
        </div>
        <div className="flex flex-col gap-4">
          <NeedsAttention />
          <QuickActions />
          {cashFlowMonths.length > 0 && <NetCashFlowCard months={cashFlowMonths} />}
        </div>
      </div>
    </div>
  )
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-[14px] border border-border bg-card p-[18px] shadow-soft dark:shadow-none">
          <Skeleton className="mb-3 h-3.5 w-28" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  )
}

async function BriefingData() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'SUPER_ADMIN') return null

  const briefingDate = new Date()
  briefingDate.setUTCHours(0, 0, 0, 0)

  const [briefing, topicsCount] = await Promise.all([
    prisma.pulseBriefing.findUnique({
      where: {
        userId_date: { userId: user.id, date: briefingDate },
      },
      include: {
        items: {
          include: { topic: { select: { id: true, name: true, category: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    }),
    prisma.pulseTopic.count({
      where: { userId: user.id, isActive: true },
    }),
  ])

  const serializedBriefing = briefing ? {
    id: briefing.id,
    summary: briefing.summary,
    items: briefing.items.map(item => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
      category: item.category,
      topic: item.topic,
    })),
  } : null

  return (
    <BriefingBanner
      briefing={serializedBriefing}
      topicsCount={topicsCount}
      userName={user.firstName}
    />
  )
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const now = new Date()
  const currentHour = now.getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  // Associates get the simplified "My Night" view
  if (user?.role === 'ASSOCIATE') {
    return <MyNightView userName={user.firstName} />
  }

  const kicker = `${now.toLocaleDateString('en-US', { weekday: 'long' })} · ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`

  return (
    <div>
      <PageHeader
        kicker={kicker}
        title={`${greeting}, ${user?.firstName ?? ''}`}
        actions={
          <>
            {canSeeFinancials(user?.role) && <SnapshotButton />}
            <Button variant="gold" asChild>
              <Link href="/tasks?new=true">
                <Plus className="size-4" />
                New task
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {/* AI Morning Briefing (SUPER_ADMIN only) */}
        <Suspense fallback={null}>
          <BriefingData />
        </Suspense>

        <Suspense fallback={<DashboardStatsSkeleton />}>
          <DashboardStats />
        </Suspense>
      </div>
    </div>
  )
}
