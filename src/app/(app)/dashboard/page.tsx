import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, FileText, AlertTriangle, TrendingUp, Calendar, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FocusWidget } from '@/components/dashboard/focus-widget'
import { LiveOpsView } from '@/components/command/live-ops-view'
import { NeedsAttentionQueue } from '@/components/command/needs-attention-queue'
import { MorningBriefing } from '@/components/command/morning-briefing'
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

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Clients */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-lime-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-lime-600" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-semibold tracking-tight text-warm-900 dark:text-cream-100">{clients.length}</div>
            <p className="text-xs text-warm-500 dark:text-cream-400 mt-0.5">Active accounts</p>
          </CardContent>
        </Card>

        {/* AR Outstanding */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-lime-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide">AR Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-lime-600" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-semibold tracking-tight text-warm-900 dark:text-cream-100">
              ${arTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-warm-500 dark:text-cream-400 mt-0.5">
              <Link href="/billing" className="hover:text-ocean-600 transition-colors">
                View aging report →
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* This Month Revenue */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-ocean-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-ocean-600" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-semibold tracking-tight text-warm-900 dark:text-cream-100">
              ${thisMonthRevenue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-warm-500 dark:text-cream-400 mt-0.5">Revenue invoiced</p>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="text-2xl font-semibold tracking-tight text-destructive">
              {overdueCount}
            </div>
            <p className="text-xs text-warm-500 dark:text-cream-400 mt-0.5">
              <Link href="/billing" className="hover:text-destructive transition-colors">
                Review past due →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Ops + Focus (left) | Needs Attention + Quick Actions (right) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <LiveOpsView />
          <FocusWidget />
        </div>
        <div className="space-y-4">
          <NeedsAttentionQueue />
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warm-900 dark:text-cream-100 text-lg font-display font-medium tracking-tight">
                <TrendingUp className="h-4 w-4 text-lime-600" />
                Quick Actions
              </CardTitle>
              <CardDescription className="text-warm-500 dark:text-cream-400 text-sm">Common tasks to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href="/tasks"
                className="block p-3 rounded-sm border border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 transition-colors"
              >
                <div className="font-medium text-warm-800 dark:text-cream-200">Manage Tasks</div>
                <div className="text-xs text-warm-500 dark:text-cream-400">View and organize your tasks</div>
              </Link>
              <Link
                href="/clients"
                className="block p-3 rounded-sm border border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 transition-colors"
              >
                <div className="font-medium text-warm-800 dark:text-cream-200">Add a Client</div>
                <div className="text-xs text-warm-500 dark:text-cream-400">Create your first client account</div>
              </Link>
              <Link
                href="/invoices"
                className="block p-3 rounded-sm border border-warm-200 dark:border-charcoal-700 hover:border-ocean-400 transition-colors"
              >
                <div className="font-medium text-warm-800 dark:text-cream-200">Generate Invoice</div>
                <div className="text-xs text-warm-500 dark:text-cream-400">Create and send an invoice</div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DashboardStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-8 w-24" />
          </CardHeader>
        </Card>
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
    <MorningBriefing
      briefing={serializedBriefing}
      topicsCount={topicsCount}
      userName={user.firstName}
    />
  )
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  // Associates get the simplified "My Night" view
  if (user?.role === 'ASSOCIATE') {
    return <MyNightView userName={user.firstName} />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-medium tracking-tight font-display text-warm-900 dark:text-cream-100">
            {greeting}, {user?.firstName}
          </h1>
          <p className="text-lg text-warm-500 dark:text-cream-400">
            Here's what's happening with your business today
          </p>
        </div>
        <Link href="/landing" target="_blank">
          <Button variant="outline" className="gap-2 border-warm-300 text-warm-700 hover:bg-warm-100 hover:border-warm-400">
            <ExternalLink className="w-4 h-4" />
            View Homepage
          </Button>
        </Link>
      </div>

      {/* AI Morning Briefing (SUPER_ADMIN only) */}
      <Suspense fallback={null}>
        <BriefingData />
      </Suspense>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}
