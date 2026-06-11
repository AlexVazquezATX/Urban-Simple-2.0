import { redirect } from 'next/navigation'
import { Banknote, HandCoins, Lock, Plus, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExpenseFormDialog } from '@/components/financials/expense-form-dialog'
import { ExpenseRowActions } from '@/components/financials/expense-row-actions'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/format'
import {
  canSeeFinancials,
  expenseCategoryLabel,
  summarizeExpenses,
  EXPENSE_CATEGORIES,
} from '@/lib/financials'

type ExpenseRow = {
  id: string
  name: string
  category: string
  expenseType: string
  monthlyAmount: number
  vendor: string | null
  paymentMethod: string | null
  billingDay: number
  startDate: string
  endDate: string | null
  isActive: boolean
  notes: string | null
}

function ExpenseTable({ rows }: { rows: ExpenseRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead className="text-right">Monthly</TableHead>
          <TableHead className="text-center">Bill day</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="font-medium text-foreground">{e.name}</TableCell>
            <TableCell>
              <Badge variant="neutral">{expenseCategoryLabel(e.category)}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{e.vendor || '—'}</TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {formatMoney(e.monthlyAmount)}
            </TableCell>
            <TableCell className="text-center font-mono tabular-nums text-muted-foreground">
              {e.billingDay}
            </TableCell>
            <TableCell>
              <Badge variant={e.isActive ? 'green' : 'neutral'}>
                {e.isActive ? 'Active' : 'Paused'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <ExpenseRowActions expense={e} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function ExpensesPage() {
  const user = await getCurrentUser()
  if (!user) return <div>Please log in</div>
  if (!canSeeFinancials(user.role)) {
    redirect('/dashboard')
  }

  const expensesRaw = await prisma.recurringExpense.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { name: 'asc' }],
  })

  // Serialize Decimals.
  const expenses: ExpenseRow[] = expensesRaw.map(e => ({
    ...e,
    monthlyAmount: Number(e.monthlyAmount),
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
  }))

  const summary = summarizeExpenses(
    expenses.map(e => ({
      monthlyAmount: e.monthlyAmount,
      isActive: e.isActive,
      category: e.category,
      expenseType: e.expenseType,
    }))
  )

  const operatingRows = expenses.filter(e => e.expenseType !== 'owner_draw')
  const ownerDrawRows = expenses.filter(e => e.expenseType === 'owner_draw')

  return (
    <div>
      <PageHeader
        kicker="MONEY · RECURRING"
        title={
          <span className="inline-flex items-center gap-3">
            Recurring Expenses
            <Badge variant="neutral">
              <Lock /> Super admin
            </Badge>
          </span>
        }
        subtitle="Operating costs feed the dashboard's operating profit. Owner draws are tracked separately — they come out of profit, not before it."
        backHref="/financials"
        actions={
          <ExpenseFormDialog>
            <Button variant="gold">
              <Plus className="size-4" />
              Add Expense
            </Button>
          </ExpenseFormDialog>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Operating expenses"
            icon={Receipt}
            value={formatMoney(summary.operatingTotal)}
            sub={
              <>
                <span className="font-mono tabular-nums">
                  {formatMoney(summary.operatingTotal * 12)}
                </span>{' '}
                annualized · counts against operating profit
              </>
            }
          />
          <StatCard
            label="Owner draws"
            icon={HandCoins}
            value={formatMoney(summary.ownerDrawsTotal)}
            sub={
              <>
                <span className="font-mono tabular-nums">
                  {formatMoney(summary.ownerDrawsTotal * 12)}
                </span>{' '}
                annualized · taken from profit
              </>
            }
          />
          <StatCard
            label="Total monthly outflow"
            icon={Banknote}
            value={formatMoney(summary.total)}
            sub={
              <>
                <span className="font-mono tabular-nums">{formatMoney(summary.total * 12)}</span>{' '}
                annualized
              </>
            }
          />
        </div>

        {/* Operating expenses */}
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Operating Expenses</CardTitle>
            <CardDescription className="text-xs">
              {operatingRows.length} {operatingRows.length === 1 ? 'item' : 'items'} ·{' '}
              <span className="font-mono tabular-nums">{formatMoney(summary.operatingTotal)}</span>
              /mo active
            </CardDescription>
          </CardHeader>
          <CardContent>
            {operatingRows.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No operating expenses yet"
                description="Add rent, software, insurance — anything the business pays monthly — and the Financials dashboard does the rest."
                action={
                  <ExpenseFormDialog>
                    <Button variant="outline">
                      <Plus className="size-4" />
                      Add your first expense
                    </Button>
                  </ExpenseFormDialog>
                }
              />
            ) : (
              <ExpenseTable rows={operatingRows} />
            )}
          </CardContent>
        </Card>

        {/* Owner draws */}
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Owner Draws</CardTitle>
            <CardDescription className="text-xs">
              {ownerDrawRows.length} {ownerDrawRows.length === 1 ? 'item' : 'items'} ·{' '}
              <span className="font-mono tabular-nums">{formatMoney(summary.ownerDrawsTotal)}</span>
              /mo active · subtracted after operating profit
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ownerDrawRows.length === 0 ? (
              <EmptyState
                icon={HandCoins}
                title="No owner draws tracked yet"
                description={
                  <>Edit an expense and set its type to &ldquo;Owner draw&rdquo; to track it here.</>
                }
              />
            ) : (
              <ExpenseTable rows={ownerDrawRows} />
            )}
          </CardContent>
        </Card>

        {expenses.some(e => !e.isActive) && (
          <p className="text-xs text-muted-foreground">
            Paused expenses are not counted in the monthly totals. Re-activate to include.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Available categories: {EXPENSE_CATEGORIES.map(c => c.label).join(' · ')}
        </p>
      </div>
    </div>
  )
}
