import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Lock, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SnapshotNowButton } from '@/components/financials/snapshot-now-button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  canSeeFinancials,
  expenseCategoryLabel,
  formatCurrency,
  formatMargin,
  marginToneClass,
  summarizeAgreements,
  summarizeRecurringExpenses,
} from '@/lib/financials'

export default async function FinancialsDashboardPage() {
  const user = await getCurrentUser()
  if (!user) return <div>Please log in</div>
  if (!canSeeFinancials(user.role)) {
    redirect('/dashboard')
  }

  // Fetch everything we need to render the dashboard.
  const [agreementsRaw, expensesRaw, clients, snapshots] = await Promise.all([
    prisma.serviceAgreement.findMany({
      where: {
        client: { companyId: user.companyId, deletedAt: null },
        isActive: true,
      },
      select: {
        id: true,
        monthlyAmount: true,
        monthlyLaborCost: true,
        monthlyMaterialCost: true,
        monthlyOtherCost: true,
        isActive: true,
        client: { select: { id: true, name: true, parentClientId: true } },
        location: { select: { id: true, name: true } },
      },
    }),
    prisma.recurringExpense.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        category: true,
        monthlyAmount: true,
        isActive: true,
        vendor: true,
      },
    }),
    prisma.client.findMany({
      where: {
        companyId: user.companyId,
        deletedAt: null,
        ...(user.branchId && { branchId: user.branchId }),
      },
      select: {
        id: true,
        name: true,
        parentClientId: true,
        parentClient: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    }),
    // Last 12 months of snapshots for the trend chart.
    prisma.monthlyFinancialSnapshot.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 12,
    }),
  ])

  // Aggregate revenue/cost across all active agreements (the client-side P&L).
  const clientPnl = summarizeAgreements(
    agreementsRaw.map(a => ({
      monthlyAmount: a.monthlyAmount as unknown as string,
      monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
      monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
      monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
      isActive: a.isActive,
    }))
  )

  // Aggregate recurring overhead.
  const overhead = summarizeRecurringExpenses(
    expensesRaw.map(e => ({
      monthlyAmount: e.monthlyAmount as unknown as string,
      isActive: e.isActive,
      category: e.category,
    }))
  )

  // Net cash flow = client revenue - client costs - overhead.
  const netCashFlow = clientPnl.monthlyProfit - overhead.total
  const netMarginPct =
    clientPnl.monthlyRevenue > 0 ? (netCashFlow / clientPnl.monthlyRevenue) * 100 : null

  // Per-client revenue rollup (rolls children up into their parent).
  // Each client gets a row with its own revenue + the sum of children's revenue.
  const clientById = new Map(clients.map(c => [c.id, c]))
  const directRevenueByClient = new Map<string, number>()
  const directCostByClient = new Map<string, number>()
  for (const a of agreementsRaw) {
    const cid = a.client.id
    const rev = Number(a.monthlyAmount)
    const cost =
      Number(a.monthlyLaborCost ?? 0) +
      Number(a.monthlyMaterialCost ?? 0) +
      Number(a.monthlyOtherCost ?? 0)
    directRevenueByClient.set(cid, (directRevenueByClient.get(cid) ?? 0) + rev)
    directCostByClient.set(cid, (directCostByClient.get(cid) ?? 0) + cost)
  }

  // Roll children up into parents for display purposes; show only top-level
  // rows (children appear nested under parent in this view).
  type ClientRow = {
    id: string
    name: string
    revenue: number
    cost: number
    profit: number
    marginPct: number | null
    childCount: number
  }

  // Build per-client direct rows including children's contributions
  // for any client that's a parent.
  const childrenByParent = new Map<string, string[]>()
  for (const c of clients) {
    if (c.parentClientId) {
      const list = childrenByParent.get(c.parentClientId) ?? []
      list.push(c.id)
      childrenByParent.set(c.parentClientId, list)
    }
  }

  function rollupRevenue(clientId: string): { revenue: number; cost: number } {
    let rev = directRevenueByClient.get(clientId) ?? 0
    let cost = directCostByClient.get(clientId) ?? 0
    for (const childId of childrenByParent.get(clientId) ?? []) {
      const child = rollupRevenue(childId)
      rev += child.revenue
      cost += child.cost
    }
    return { revenue: rev, cost }
  }

  const topLevelClients = clients.filter(c => !c.parentClientId)
  const clientRows: ClientRow[] = topLevelClients
    .map(c => {
      const { revenue, cost } = rollupRevenue(c.id)
      const profit = revenue - cost
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : null
      return {
        id: c.id,
        name: c.name,
        revenue,
        cost,
        profit,
        marginPct,
        childCount: childrenByParent.get(c.id)?.length ?? 0,
      }
    })
    .filter(r => r.revenue > 0 || r.cost > 0)
    .sort((a, b) => b.revenue - a.revenue)

  // Watchlist: locations with negative margin.
  const negativeMarginLocations = agreementsRaw
    .map(a => {
      const rev = Number(a.monthlyAmount)
      const cost = Number(a.monthlyLaborCost ?? 0) + Number(a.monthlyMaterialCost ?? 0) + Number(a.monthlyOtherCost ?? 0)
      const profit = rev - cost
      const margin = rev > 0 ? (profit / rev) * 100 : null
      return {
        agreementId: a.id,
        clientId: a.client.id,
        clientName: a.client.name,
        locationId: a.location.id,
        locationName: a.location.name,
        revenue: rev,
        cost,
        profit,
        margin,
      }
    })
    .filter(l => l.margin !== null && l.margin < 0)
    .sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))

  // Overhead breakdown for the bar chart (or list).
  const categoriesByTotal = Array.from(overhead.byCategory.entries())
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
              Financials
            </h1>
            <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
              <Lock className="mr-1 h-3 w-3" /> Super admin
            </Badge>
          </div>
          <p className="text-sm text-warm-500 dark:text-cream-400">
            Cash flow at a glance. Client P&amp;L on the revenue side, recurring overhead on the cost side.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SnapshotNowButton />
          <Link href="/financials/expenses">
            <Button variant="outline" className="rounded-sm">
              Manage Recurring Expenses
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Top KPI tiles */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Monthly Revenue</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(clientPnl.monthlyRevenue)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {formatCurrency(clientPnl.monthlyRevenue * 12)} annualized
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Client Costs</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(clientPnl.monthlyCost)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">labor + materials + other</p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Recurring Overhead</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(overhead.total)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              <Link href="/financials/expenses" className="hover:underline">
                {expensesRaw.filter(e => e.isActive).length} active
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card className={`rounded-sm border-2 ${netCashFlow < 0 ? 'border-red-300 bg-red-50/40 dark:bg-red-950/20' : 'border-lime-300 bg-lime-50/40 dark:bg-lime-950/20'}`}>
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Net Cash Flow</p>
            <div className="mt-1 flex items-center gap-2">
              {netCashFlow >= 0
                ? <TrendingUp className="h-5 w-5 text-lime-600" />
                : <TrendingDown className="h-5 w-5 text-red-600" />}
              <p className={`text-2xl font-bold ${marginToneClass(netMarginPct)}`}>
                {formatCurrency(netCashFlow)}
              </p>
            </div>
            <p className={`mt-1 text-xs ${marginToneClass(netMarginPct)}`}>
              {formatMargin(netMarginPct)} net margin
            </p>
          </CardContent>
        </Card>
      </div>

      {snapshots.length > 0 && (() => {
        // Reverse to chronological order for the chart.
        const sorted = [...snapshots].reverse()
        const maxRev = Math.max(...sorted.map(s => Number(s.monthlyRevenue)))
        const maxAbs = Math.max(maxRev, ...sorted.map(s => Math.abs(Number(s.netCashFlow))))
        const monthLabel = (s: typeof sorted[number]) => {
          const d = new Date(s.periodYear, s.periodMonth - 1, 1)
          return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
        }
        return (
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
                Trend (last {sorted.length} {sorted.length === 1 ? 'month' : 'months'})
              </CardTitle>
              <CardDescription className="text-xs text-warm-500 dark:text-cream-400">
                Captured monthly. Use the Snapshot now button to record the current month at any time.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="grid grid-cols-12 gap-1.5">
                {sorted.map(s => {
                  const rev = Number(s.monthlyRevenue)
                  const cost = Number(s.monthlyClientCost) + Number(s.monthlyOverhead)
                  const net = Number(s.netCashFlow)
                  const revH = maxAbs > 0 ? (rev / maxAbs) * 80 : 0
                  const costH = maxAbs > 0 ? (cost / maxAbs) * 80 : 0
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-1">
                      <div className="relative flex h-24 w-full items-end justify-center gap-0.5">
                        <div
                          title={`Revenue ${formatCurrency(rev)}`}
                          className="w-2 rounded-sm bg-ocean-400 dark:bg-ocean-500 transition-all"
                          style={{ height: `${revH}%` }}
                        />
                        <div
                          title={`All costs ${formatCurrency(cost)}`}
                          className="w-2 rounded-sm bg-plum-400 dark:bg-plum-500 transition-all"
                          style={{ height: `${costH}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-warm-500 dark:text-cream-400">{monthLabel(s)}</p>
                      <p className={`text-[10px] font-mono ${net < 0 ? 'text-red-600' : 'text-lime-700'}`}>
                        {formatCurrency(net)}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-warm-500 dark:text-cream-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-ocean-400" /> Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-plum-400" /> All costs
                </span>
                <span className="text-warm-400">Bottom line below = net cash flow</span>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue by client */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
              Revenue by Client
            </CardTitle>
            <CardDescription className="text-warm-500 dark:text-cream-400 text-xs">
              Top-level clients only. Children rolled up into their parent.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {clientRows.length === 0 && (
              <p className="text-sm text-warm-500 dark:text-cream-400">No active service agreements yet.</p>
            )}
            {clientRows.map(row => {
              const sharePct = clientPnl.monthlyRevenue > 0 ? (row.revenue / clientPnl.monthlyRevenue) * 100 : 0
              return (
                <Link key={row.id} href={`/clients/${row.id}`} className="block group">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-warm-900 dark:text-cream-100 group-hover:text-ocean-600">{row.name}</span>
                      {row.childCount > 0 && (
                        <Badge variant="outline" className="rounded-sm text-[9px] px-1 py-0 border-plum-200 text-plum-600">
                          {row.childCount} child{row.childCount === 1 ? '' : 'ren'}
                        </Badge>
                      )}
                    </div>
                    <span className="font-mono text-warm-700 dark:text-cream-300">{formatCurrency(row.revenue)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-sm bg-warm-100 dark:bg-charcoal-800 overflow-hidden">
                      <div
                        className="h-full bg-ocean-400 dark:bg-ocean-500"
                        style={{ width: `${Math.min(100, sharePct)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono w-14 text-right ${marginToneClass(row.marginPct)}`}>
                      {formatMargin(row.marginPct)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </CardContent>
        </Card>

        {/* Overhead by category */}
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
              Overhead by Category
            </CardTitle>
            <CardDescription className="text-warm-500 dark:text-cream-400 text-xs">
              Recurring monthly expenses, grouped.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {categoriesByTotal.length === 0 && (
              <p className="text-sm text-warm-500 dark:text-cream-400">
                No recurring expenses yet.{' '}
                <Link href="/financials/expenses" className="text-ocean-600 hover:underline">Add one →</Link>
              </p>
            )}
            {categoriesByTotal.map(([cat, total]) => {
              const sharePct = overhead.total > 0 ? (total / overhead.total) * 100 : 0
              return (
                <div key={cat} className="block">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-warm-900 dark:text-cream-100">
                      {expenseCategoryLabel(cat)}
                    </span>
                    <span className="font-mono text-warm-700 dark:text-cream-300">{formatCurrency(total)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-sm bg-warm-100 dark:bg-charcoal-800 overflow-hidden">
                      <div
                        className="h-full bg-plum-400 dark:bg-plum-500"
                        style={{ width: `${Math.min(100, sharePct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono w-12 text-right text-warm-500">{sharePct.toFixed(0)}%</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Watchlist: negative-margin locations */}
      {negativeMarginLocations.length > 0 && (
        <Card className="rounded-sm border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
              Watchlist: Negative-Margin Locations
            </CardTitle>
            <CardDescription className="text-warm-500 dark:text-cream-400 text-xs">
              Locations where current monthly costs exceed revenue. Click through to investigate or adjust.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-2">
            {negativeMarginLocations.map(loc => (
              <Link
                key={loc.agreementId}
                href={`/locations/${loc.locationId}`}
                className="flex items-center justify-between rounded-sm border border-red-200 bg-white/80 px-3 py-2 text-sm hover:border-red-300 dark:border-red-950 dark:bg-charcoal-900"
              >
                <div>
                  <p className="font-medium text-warm-900 dark:text-cream-100">
                    {loc.clientName} — {loc.locationName}
                  </p>
                  <p className="text-xs text-warm-500 dark:text-cream-400">
                    Revenue {formatCurrency(loc.revenue)} · Cost {formatCurrency(loc.cost)}
                  </p>
                </div>
                <span className={`text-sm font-mono font-medium ${marginToneClass(loc.margin)}`}>
                  {formatMargin(loc.margin)}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
