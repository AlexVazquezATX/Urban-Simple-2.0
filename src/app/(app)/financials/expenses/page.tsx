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
  summarizeRecurringExpenses,
  EXPENSE_CATEGORIES,
} from '@/lib/financials'

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
  const expenses = expensesRaw.map(e => ({
    ...e,
    monthlyAmount: Number(e.monthlyAmount),
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
  }))

  const summary = summarizeRecurringExpenses(
    expenses.map(e => ({ monthlyAmount: e.monthlyAmount, isActive: e.isActive, category: e.category }))
  )

  // Sort categories by spend descending for the breakdown tiles.
  const categoriesByTotal = Array.from(summary.byCategory.entries())
    .sort((a, b) => b[1] - a[1])

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
            Rent, software, insurance, vehicles, payroll. Feeds the financials dashboard cash-flow view.
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

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
          <CardContent className="p-4">
            <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">Monthly Overhead</p>
            <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
              {formatCurrency(summary.total)}
            </p>
            <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
              {formatCurrency(summary.total * 12)} annualized
            </p>
          </CardContent>
        </Card>
        {categoriesByTotal.slice(0, 3).map(([cat, total]) => (
          <Card key={cat} className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              <p className="text-xs text-warm-500 dark:text-cream-400 uppercase tracking-wider">
                {expenseCategoryLabel(cat)}
              </p>
              <p className="mt-1 text-2xl font-bold text-warm-900 dark:text-cream-100">
                {formatCurrency(total)}
              </p>
              <p className="mt-1 text-xs text-warm-500 dark:text-cream-400">
                {summary.total > 0 ? `${((total / summary.total) * 100).toFixed(1)}% of overhead` : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
        <CardHeader>
          <CardTitle className="font-display font-medium text-warm-900 dark:text-cream-100">All Expenses</CardTitle>
          <CardDescription className="text-warm-500 dark:text-cream-400">
            {expenses.length} {expenses.length === 1 ? 'item' : 'items'}, {expenses.filter(e => e.isActive).length} active
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-warm-500 dark:text-cream-400">
              <p>No recurring expenses yet.</p>
              <ExpenseFormDialog>
                <Button variant="outline" className="mt-3 rounded-sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first expense
                </Button>
              </ExpenseFormDialog>
            </div>
          ) : (
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
                {expenses.map((e) => (
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
          )}
        </CardContent>
      </Card>

      {/* Show small note when there are paused/inactive items so user understands why a known expense isn't summing. */}
      {expenses.some(e => !e.isActive) && (
        <p className="text-xs text-warm-500 dark:text-cream-400">
          Paused expenses are not counted in the monthly overhead total. Re-activate to include.
        </p>
      )}
      {/* Reference to the full categories list, in case user wants to see what's available. */}
      <p className="text-[11px] text-warm-400 dark:text-cream-500">
        Available categories: {EXPENSE_CATEGORIES.map(c => c.label).join(' · ')}
      </p>
    </div>
  )
}
