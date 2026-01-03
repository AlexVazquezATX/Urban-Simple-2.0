import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Users, DollarSign, FileText, AlertTriangle, TrendingUp, Calendar, Clock } from 'lucide-react'
import Link from 'next/link'

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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Clients */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <div className="rounded-full bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{clients.length}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Active accounts
            </p>
          </CardContent>
        </Card>

        {/* AR Outstanding */}
        <Card className="border-l-4 border-l-accent">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AR Outstanding</CardTitle>
            <div className="rounded-full bg-accent/10 p-2">
              <DollarSign className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              ${arTotal.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/billing" className="hover:text-accent transition-colors flex items-center gap-1">
                View aging report →
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* This Month Revenue */}
        <Card className="border-l-4 border-l-chart-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <div className="rounded-full bg-chart-3/10 p-2">
              <Calendar className="h-5 w-5 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              ${thisMonthRevenue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Revenue invoiced
            </p>
          </CardContent>
        </Card>

        {/* Overdue Invoices */}
        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            <div className="rounded-full bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/billing" className="hover:text-destructive transition-colors flex items-center gap-1">
                Review past due →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Information Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-8">
              No recent activity to display
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/clients"
              className="block p-3 rounded-lg border hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="font-medium">Add a Client</div>
              <div className="text-xs text-muted-foreground">Create your first client account</div>
            </Link>
            <Link
              href="/invoices"
              className="block p-3 rounded-lg border hover:bg-accent/5 hover:border-accent transition-colors"
            >
              <div className="font-medium">Generate Invoice</div>
              <div className="text-xs text-muted-foreground">Create and send an invoice</div>
            </Link>
          </CardContent>
        </Card>
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

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const currentHour = new Date().getHours()
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-bold tracking-tight font-display">
          {greeting}, {user?.firstName}
        </h1>
        <p className="text-lg text-muted-foreground">
          Here's what's happening with your business today
        </p>
      </div>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}



