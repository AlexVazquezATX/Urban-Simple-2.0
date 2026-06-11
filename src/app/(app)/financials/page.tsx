import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, BarChart3, Lock, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCardEq } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { SnapshotNowButton } from '@/components/financials/snapshot-now-button'
import { FinancialsTrendChart } from '@/components/financials/financials-trend-chart'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/format'
import {
  canSeeFinancials,
  expenseCategoryLabel,
  formatMargin,
  summarizeAgreements,
  summarizeExpenses,
} from '@/lib/financials'

// Bar-list row (USBarRow): name + mono value + muted mono share % + 6px track.
// "N others" / "Everything else" rows pass muted to drop the fill emphasis.
function BarRow({
  name,
  value,
  pct,
  fill,
  muted,
  chip,
}: {
  name: React.ReactNode
  value: string
  pct: number
  fill: 'teal' | 'gold'
  muted?: boolean
  chip?: React.ReactNode
}) {
  const fillClass = muted
    ? 'bg-border'
    : fill === 'teal'
      ? 'bg-teal-600 dark:bg-teal-300'
      : 'bg-gold-600 dark:bg-gold-400'
  return (
    <div className="flex flex-col gap-1.5 border-b border-border/60 py-2.5 last:border-0">
      <div className="flex items-baseline gap-2.5">
        <span
          className={
            muted
              ? 'flex min-w-0 flex-1 items-center gap-2 text-[13.5px] font-medium text-muted-foreground'
              : 'flex min-w-0 flex-1 items-center gap-2 text-[13.5px] font-semibold text-foreground'
          }
        >
          <span className="truncate">{name}</span>
          {chip}
        </span>
        <span className="font-mono text-[12.5px] tabular-nums text-foreground">{value}</span>
        <span className="w-11 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  )
}

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
        expenseType: true,
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

  // Split recurring expenses into operating costs and owner draws.
  const overhead = summarizeExpenses(
    expensesRaw.map(e => ({
      monthlyAmount: e.monthlyAmount as unknown as string,
      isActive: e.isActive,
      category: e.category,
      expenseType: e.expenseType,
    }))
  )

  // Waterfall: revenue − client costs − operating expenses = operating profit;
  // operating profit − owner draws = net cash flow.
  const operatingExpenses = overhead.operatingTotal
  const ownerDraws = overhead.ownerDrawsTotal
  const operatingProfit = clientPnl.monthlyProfit - operatingExpenses
  const netCashFlow = operatingProfit - ownerDraws
  const operatingMarginPct =
    clientPnl.monthlyRevenue > 0 ? (operatingProfit / clientPnl.monthlyRevenue) * 100 : null
  const netMarginPct =
    clientPnl.monthlyRevenue > 0 ? (netCashFlow / clientPnl.monthlyRevenue) * 100 : null

  // Per-client revenue rollup (rolls children up into their parent).
  // Each client gets a row with its own revenue + the sum of children's revenue.
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

  // Operating-expense breakdown by category (owner draws excluded).
  const categoriesByTotal = Array.from(overhead.operatingByCategory.entries())
    .sort((a, b) => b[1] - a[1])

  // Bar lists: top rows individually, the long tail as one muted row.
  const TOP_ROWS = 4
  const topClientRows = clientRows.slice(0, TOP_ROWS)
  const otherClientRows = clientRows.slice(TOP_ROWS)
  const othersRevenue = otherClientRows.reduce((sum, r) => sum + r.revenue, 0)
  const topCategories = categoriesByTotal.slice(0, TOP_ROWS)
  const otherCategories = categoriesByTotal.slice(TOP_ROWS)
  const othersOpex = otherCategories.reduce((sum, [, total]) => sum + total, 0)

  // Trend data (chronological) for the chart + insight line.
  const sortedSnapshots = [...snapshots].reverse()
  const monthLabel = (s: typeof sortedSnapshots[number]) => {
    const d = new Date(s.periodYear, s.periodMonth - 1, 1)
    return d.toLocaleString('en-US', { month: 'short', year: '2-digit' })
  }
  const trendData = sortedSnapshots.map(s => ({
    label: monthLabel(s),
    revenue: Number(s.monthlyRevenue),
    cost: Number(s.monthlyClientCost) + Number(s.monthlyOverhead),
    net: Number(s.netCashFlow),
  }))
  const firstPoint = trendData[0]
  const lastPoint = trendData[trendData.length - 1]
  const revenueChangePct =
    trendData.length >= 2 && firstPoint.revenue > 0
      ? ((lastPoint.revenue - firstPoint.revenue) / firstPoint.revenue) * 100
      : null

  const monthYear = new Date()
    .toLocaleString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase()

  return (
    <div>
      <PageHeader
        kicker={`MONEY · ${monthYear}`}
        title={
          <span className="inline-flex items-center gap-3">
            Financials
            <Badge variant="neutral">
              <Lock /> Super admin
            </Badge>
          </span>
        }
        actions={
          <>
            <SnapshotNowButton />
            <Button asChild variant="outline">
              <Link href="/financials/expenses">
                Recurring expenses
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-4">
        {/* The money equation: revenue − client costs − operating expenses
            = operating profit; operating profit − owner draws = net cash flow. */}
        <p className="px-0.5 text-[12.5px] text-muted-foreground">
          Operating profit is the business&apos;s earning power. Net cash flow is what&apos;s left
          after owner draws.
        </p>
        {/* Single non-wrapping row (like the mockup) so the −/= operators
            always land in the gutters between cards; scrolls horizontally
            on narrow screens rather than wrapping (which would push a
            leading card's operator off the left edge). pl/-ml gives the
            first operator breathing room; pb leaves space for card shadows. */}
        <div className="-ml-[22px] flex gap-x-[22px] overflow-x-auto pb-1 pl-[22px]">
          <StatCardEq
            label="Monthly revenue"
            value={formatMoney(clientPnl.monthlyRevenue)}
            sub={`${formatMoney(clientPnl.monthlyRevenue * 12)} annualized`}
          />
          <StatCardEq
            op="−"
            label="Client costs"
            value={formatMoney(clientPnl.monthlyCost)}
            sub="labor + materials + other"
          />
          <StatCardEq
            op="−"
            label="Operating expenses"
            value={formatMoney(operatingExpenses)}
            sub={
              <Link href="/financials/expenses" className="hover:underline">
                rent, software, insurance, payroll…
              </Link>
            }
          />
          <StatCardEq
            op="="
            label="Operating profit"
            value={formatMoney(operatingProfit)}
            tone={operatingProfit < 0 ? 'coral' : 'teal'}
            sub={`${formatMargin(operatingMarginPct)} operating margin`}
          />
          <StatCardEq
            op="−"
            label="Owner draws"
            value={formatMoney(ownerDraws)}
            sub="taken from profit"
          />
          <StatCardEq
            op="="
            label="Net cash flow"
            value={formatMoney(netCashFlow)}
            tone={netCashFlow < 0 ? 'coral' : 'gold'}
            highlight
            sub={`${formatMargin(netMarginPct)} net margin`}
          />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          {/* Trend */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle>
                Trend · last {trendData.length} {trendData.length === 1 ? 'month' : 'months'}
              </CardTitle>
              <CardAction className="text-xs text-muted-foreground">Captured monthly</CardAction>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No trend yet"
                  description="Capture your first snapshot with the button above and the monthly story starts here."
                />
              ) : (
                <>
                  <FinancialsTrendChart data={trendData} />
                  {revenueChangePct !== null && (
                    <div className="mt-4 flex items-center gap-2.5 rounded-[10px] border border-teal-600/30 bg-teal-600/10 px-3.5 py-3 dark:border-teal-300/25 dark:bg-teal-300/12">
                      {revenueChangePct >= 0 ? (
                        <TrendingUp className="size-[15px] shrink-0 text-teal-600 dark:text-teal-300" />
                      ) : (
                        <TrendingDown className="size-[15px] shrink-0 text-teal-600 dark:text-teal-300" />
                      )}
                      <span className="text-[12.5px] text-foreground/80">
                        Revenue is {revenueChangePct >= 0 ? 'up' : 'down'}{' '}
                        <span className="font-semibold text-teal-600 dark:text-teal-300">
                          {Math.abs(revenueChangePct).toFixed(0)}%
                        </span>{' '}
                        since {firstPoint.label}.
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Revenue by client */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Revenue by client</CardTitle>
              <CardDescription className="text-xs">
                Top-level clients · children rolled up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clientRows.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No revenue to break down yet"
                  description="Activate a service agreement and each client's share shows up here."
                />
              ) : (
                <>
                  {topClientRows.map(row => {
                    const sharePct =
                      clientPnl.monthlyRevenue > 0
                        ? (row.revenue / clientPnl.monthlyRevenue) * 100
                        : 0
                    return (
                      <Link key={row.id} href={`/clients/${row.id}`} className="group block">
                        <BarRow
                          name={row.name}
                          value={formatMoney(row.revenue)}
                          pct={sharePct}
                          fill="teal"
                          chip={
                            row.childCount > 0 ? (
                              <Badge variant="neutral" className="text-[10px]">
                                {row.childCount} child{row.childCount === 1 ? '' : 'ren'}
                              </Badge>
                            ) : undefined
                          }
                        />
                      </Link>
                    )
                  })}
                  {otherClientRows.length > 0 && (
                    <BarRow
                      name={`${otherClientRows.length} other${otherClientRows.length === 1 ? '' : 's'}`}
                      value={formatMoney(othersRevenue)}
                      pct={
                        clientPnl.monthlyRevenue > 0
                          ? (othersRevenue / clientPnl.monthlyRevenue) * 100
                          : 0
                      }
                      fill="teal"
                      muted
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Expenses by category */}
          <Card className="gap-3">
            <CardHeader>
              <CardTitle>Operating expenses</CardTitle>
              <CardDescription className="text-xs">Owner draws excluded</CardDescription>
            </CardHeader>
            <CardContent>
              {categoriesByTotal.length === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="No recurring expenses yet"
                  description="Add rent, software, insurance and the breakdown builds itself."
                  action={
                    <Button asChild variant="outline" size="sm">
                      <Link href="/financials/expenses">Add an expense</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  {topCategories.map(([cat, total]) => (
                    <BarRow
                      key={cat}
                      name={expenseCategoryLabel(cat)}
                      value={formatMoney(total)}
                      pct={operatingExpenses > 0 ? (total / operatingExpenses) * 100 : 0}
                      fill="gold"
                    />
                  ))}
                  {otherCategories.length > 0 && (
                    <BarRow
                      name="Everything else"
                      value={formatMoney(othersOpex)}
                      pct={operatingExpenses > 0 ? (othersOpex / operatingExpenses) * 100 : 0}
                      fill="gold"
                      muted
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Watchlist: negative-margin locations */}
        {negativeMarginLocations.length > 0 && (
          <Card className="gap-3 border-coral-600/30 bg-coral-600/10 dark:border-coral-300/25 dark:bg-coral-300/12">
            <CardHeader>
              <CardTitle>Watchlist · negative-margin locations</CardTitle>
              <CardDescription className="text-xs">
                Locations where current monthly costs exceed revenue. Click through to investigate
                or adjust.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {negativeMarginLocations.map(loc => (
                <Link
                  key={loc.agreementId}
                  href={`/locations/${loc.locationId}`}
                  className="flex items-center justify-between rounded-[10px] border border-coral-600/30 bg-card px-3.5 py-2.5 text-sm transition-colors hover:bg-secondary/50 dark:border-coral-300/25"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {loc.clientName} — {loc.locationName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Revenue{' '}
                      <span className="font-mono tabular-nums">{formatMoney(loc.revenue)}</span> ·
                      Cost <span className="font-mono tabular-nums">{formatMoney(loc.cost)}</span>
                    </p>
                  </div>
                  <span className="font-mono text-sm font-medium tabular-nums text-coral-600 dark:text-coral-300">
                    {formatMargin(loc.margin)}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
