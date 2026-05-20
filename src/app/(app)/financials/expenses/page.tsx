import { redirect } from 'next/navigation'
import { Plus, Lock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ExpenseFormDialog } from '@/components/financials/expense-form-dialog'
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  canSeeFinancials,
  expenseCategoryLabel,
  formatCurrency,
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
        <TableRow className="border-warm-200 dark:border-charcoal-700">
          <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Category</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Vendor</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-right">Monthly</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-center">Bill Day</TableHead>
          <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
          <TableHead className="text-xs uppercase tracking-wider text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id} className="border-warm-200 dark:border-charcoal-700">
            <TableCell className="font-medium text-warm-900 dark:text-cream-100">{e.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0">
                {expenseCategoryLabel(e.category)}
              </Badge>
            </TableCell>
            <TableCell className="text-warm-600 dark:text-cream-400">{e.vendor || '—'}</TableCell>
            <TableCell className="text-right font-mono">{formatCurrency(e.monthlyAmount)}</TableCell>
            <TableCell className="text-center text-warm-600 dark:text-cream-400">{e.billingDay}</TableCell>
            <TableCell>
              <Badge
                className={`rounded-sm text-[10px] px-1.5 py-0 ${
                  e.isActive
                    ? 'bg-lime-100 text-lime-700 border-lime-200'
                    : 'bg-warm-100 text-warm-600 border-warm-200'
                }`}
              >
                {e.isActive ? 'Active' : 'Paused'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <ExpenseFormDialog expense={e}>
                  <Button variant="ghost" size="sm" className="rounded-sm text-warm-600 hover:text-ocean-600">
                    Edit
                  </Button>
                </ExpenseFormDialog>
                <ConfirmDeleteButton
                  endpoint={`/api/financials/expenses/${e.id}`}
                  entityLabel={e.name}
                  entityKind="expense"
                />
              </div>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-medium tracking-tight text-warm-900 dark:text-cream-100">
              Recurring Expenses
            </h1>
            <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 text-warm-600">
              <Lock className="mr-1 h-3 w-3" /> Super admin
            </Badge>
          </div>
          <p className="text-sm text-warm-500 dark:text-cream-400">
            Operating costs feed the dashboard&apos;s operating profit. Owner draws are tracked
            separately — they come out of profit, not before it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/financials">
            <Button variant="outline" className="rounded-sm">Back to Dashboard</Button>
          </Link>
          <ExpenseFormDialog>
            <Button variant="lime" className="rounded-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </ExpenseFormDialog>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Operating Expenses</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.operatingTotal)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {formatCurrency(summary.operatingTotal * 12)} annualized · counts against operating profit
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Owner Draws</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.ownerDrawsTotal)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {formatCurrency(summary.ownerDrawsTotal * 12)} annualized · taken from profit
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Total Monthly Outflow</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.total)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {formatCurrency(summary.total * 12)} annualized
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operating expenses */}
      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
            Operating Expenses
          </CardTitle>
          <CardDescription className="text-warm-500 dark:text-cream-400">
            {operatingRows.length} {operatingRows.length === 1 ? 'item' : 'items'} ·{' '}
            {formatCurrency(summary.operatingTotal)}/mo active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {operatingRows.length === 0 ? (
            <div className="py-8 text-center text-warm-500 dark:text-cream-400">
              <p>No operating expenses yet.</p>
              <ExpenseFormDialog>
                <Button variant="outline" className="mt-3 rounded-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first expense
                </Button>
              </ExpenseFormDialog>
            </div>
          ) : (
            <ExpenseTable rows={operatingRows} />
          )}
        </CardContent>
      </Card>

      {/* Owner draws */}
      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">
            Owner Draws
          </CardTitle>
          <CardDescription className="text-warm-500 dark:text-cream-400">
            {ownerDrawRows.length} {ownerDrawRows.length === 1 ? 'item' : 'items'} ·{' '}
            {formatCurrency(summary.ownerDrawsTotal)}/mo active · subtracted after operating profit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ownerDrawRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-warm-500 dark:text-cream-400">
              No owner draws yet. Edit an expense and set its type to &ldquo;Owner draw&rdquo; to track
              it here.
            </p>
          ) : (
            <ExpenseTable rows={ownerDrawRows} />
          )}
        </CardContent>
      </Card>

      {expenses.some(e => !e.isActive) && (
        <p className="text-xs text-warm-500 dark:text-cream-400">
          Paused expenses are not counted in the monthly totals. Re-activate to include.
        </p>
      )}
      <p className="text-[11px] text-warm-400 dark:text-cream-500">
        Available categories: {EXPENSE_CATEGORIES.map(c => c.label).join(' · ')}
      </p>
    </div>
  )
}
