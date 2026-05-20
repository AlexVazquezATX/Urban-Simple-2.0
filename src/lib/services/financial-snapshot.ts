// Compute and persist a MonthlyFinancialSnapshot for a given company + month.
// Used by the monthly cron and by an on-demand "Snapshot Now" admin action.
//
// The snapshot reflects state-as-of-now — there's no time-travel; it captures
// what's currently active in the database. Call this on the 1st of each month
// (via cron) to record the prior month's totals as a frozen point-in-time.

import { prisma } from '@/lib/db'
import {
  summarizeAgreements,
  summarizeExpenses,
} from '@/lib/financials'

interface SnapshotResult {
  companyId: string
  periodYear: number
  periodMonth: number
  monthlyRevenue: number
  monthlyClientCost: number
  monthlyOverhead: number
  ownerDraws: number
  netCashFlow: number
  activeAgreementCount: number
  activeExpenseCount: number
  action: 'created' | 'updated'
}

export async function captureMonthlySnapshot(args: {
  companyId: string
  periodYear: number
  periodMonth: number
}): Promise<SnapshotResult> {
  const { companyId, periodYear, periodMonth } = args

  const [agreements, expenses] = await Promise.all([
    prisma.serviceAgreement.findMany({
      where: {
        client: { companyId, deletedAt: null },
        isActive: true,
      },
      select: {
        monthlyAmount: true,
        monthlyLaborCost: true,
        monthlyMaterialCost: true,
        monthlyOtherCost: true,
        isActive: true,
      },
    }),
    prisma.recurringExpense.findMany({
      where: { companyId, isActive: true },
      select: { monthlyAmount: true, isActive: true, category: true, expenseType: true },
    }),
  ])

  const clientPnl = summarizeAgreements(
    agreements.map(a => ({
      monthlyAmount: a.monthlyAmount as unknown as string,
      monthlyLaborCost: a.monthlyLaborCost as unknown as string | null,
      monthlyMaterialCost: a.monthlyMaterialCost as unknown as string | null,
      monthlyOtherCost: a.monthlyOtherCost as unknown as string | null,
      isActive: a.isActive,
    }))
  )
  const overhead = summarizeExpenses(
    expenses.map(e => ({
      monthlyAmount: e.monthlyAmount as unknown as string,
      isActive: e.isActive,
      category: e.category,
      expenseType: e.expenseType,
    }))
  )

  const monthlyRevenue = clientPnl.monthlyRevenue
  const monthlyClientCost = clientPnl.monthlyCost
  // monthlyOverhead stays the all-in total; ownerDraws is its owner-draw slice.
  const monthlyOverhead = overhead.total
  const ownerDraws = overhead.ownerDrawsTotal
  const netCashFlow = monthlyRevenue - monthlyClientCost - monthlyOverhead

  const result = await prisma.monthlyFinancialSnapshot.upsert({
    where: {
      companyId_periodYear_periodMonth: { companyId, periodYear, periodMonth },
    },
    update: {
      monthlyRevenue,
      monthlyClientCost,
      monthlyOverhead,
      ownerDraws,
      netCashFlow,
      activeAgreementCount: agreements.length,
      activeExpenseCount: expenses.length,
      capturedAt: new Date(),
    },
    create: {
      companyId,
      periodYear,
      periodMonth,
      monthlyRevenue,
      monthlyClientCost,
      monthlyOverhead,
      ownerDraws,
      netCashFlow,
      activeAgreementCount: agreements.length,
      activeExpenseCount: expenses.length,
    },
  })

  return {
    companyId,
    periodYear,
    periodMonth,
    monthlyRevenue,
    monthlyClientCost,
    monthlyOverhead,
    ownerDraws,
    netCashFlow,
    activeAgreementCount: agreements.length,
    activeExpenseCount: expenses.length,
    action: result.capturedAt.getTime() === result.capturedAt.getTime() ? 'updated' : 'created',
  }
}

// Returns the prior month's (year, month) for cron scheduling. The cron runs
// on the 1st, so "previous month" = today - 1 day with day=1.
export function priorMonth(now: Date = new Date()): { year: number; month: number } {
  const d = new Date(now.getFullYear(), now.getMonth(), 1)
  d.setMonth(d.getMonth() - 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}
