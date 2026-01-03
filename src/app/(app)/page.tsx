import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, DollarSign, FileText, AlertTriangle } from 'lucide-react'
import { getApiUrl } from '@/lib/api'
import Link from 'next/link'

async function DashboardStats() {
  const user = await getCurrentUser()

  // Fetch clients count
  const clientsResponse = await fetch(getApiUrl('/api/clients'), {
    cache: 'no-store',
  })
  const clients = clientsResponse.ok ? await clientsResponse.json() : []

  // Fetch AR aging data
  const arResponse = await fetch(getApiUrl('/api/billing/ar-aging'), {
    cache: 'no-store',
  })
  const arData = arResponse.ok ? await arResponse.json() : { totals: { total: 0 }, counts: { overdue_90_plus: 0, overdue_61_90: 0, overdue_31_60: 0 } }

  // Calculate overdue count
  const overdueCount =
    arData.counts?.overdue_31_60 +
    arData.counts?.overdue_61_90 +
    arData.counts?.overdue_90_plus || 0

  // Calculate this month's revenue (from invoices issued this month)
  const invoicesResponse = await fetch(getApiUrl('/api/invoices'), {
    cache: 'no-store',
  })
  const invoices = invoicesResponse.ok ? await invoicesResponse.json() : []
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const thisMonthRevenue = invoices
    .filter((inv: any) => {
      const issueDate = new Date(inv.issueDate)
      return (
        issueDate.getMonth() === thisMonth &&
        issueDate.getFullYear() === thisYear
      )
    })
    .reduce((sum: number, inv: any) => sum + Number(inv.totalAmount), 0)

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clients.length}</div>
          <p className="text-xs text-muted-foreground">Active clients</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">AR Outstanding</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(arData.totals?.total || 0).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            <Link href="/billing" className="hover:underline">
              Total receivables
            </Link>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${thisMonthRevenue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <p className="text-xs text-muted-foreground">Revenue invoiced</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {overdueCount}
          </div>
          <p className="text-xs text-muted-foreground">
            <Link href="/billing" className="hover:underline">
              Invoices past due
            </Link>
          </p>
        </CardContent>
      </Card>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.firstName} {user?.lastName}
        </p>
      </div>

      <Suspense fallback={<DashboardStatsSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  )
}



