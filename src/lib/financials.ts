// Financial aggregation helpers for clients/locations.
//
// Pure functions over already-fetched ServiceAgreement rows. Profit and margin
// are derived from monthlyAmount minus the sum of cost fields, never stored,
// so we never have to worry about computed values drifting from source data.
//
// Visibility note: financial figures should ONLY be shown to SUPER_ADMIN
// (and possibly ADMIN later). Use canSeeFinancials() to gate UI.

type Decimalish = { toString: () => string } | string | number | null | undefined

function toNumber(v: Decimalish): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const n = Number(typeof v === 'string' ? v : v.toString())
  return Number.isFinite(n) ? n : 0
}

export interface AgreementForFinancials {
  monthlyAmount: Decimalish
  monthlyLaborCost?: Decimalish
  monthlyMaterialCost?: Decimalish
  monthlyOtherCost?: Decimalish
  isActive: boolean
}

export interface FinancialSummary {
  monthlyRevenue: number
  monthlyCost: number
  monthlyProfit: number
  marginPct: number | null // null when revenue is 0
  agreementCount: number
}

export function summarizeAgreements(agreements: AgreementForFinancials[]): FinancialSummary {
  let revenue = 0
  let cost = 0
  let count = 0

  for (const a of agreements) {
    if (!a.isActive) continue
    revenue += toNumber(a.monthlyAmount)
    cost += toNumber(a.monthlyLaborCost) + toNumber(a.monthlyMaterialCost) + toNumber(a.monthlyOtherCost)
    count++
  }

  const profit = revenue - cost
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : null

  return {
    monthlyRevenue: revenue,
    monthlyCost: cost,
    monthlyProfit: profit,
    marginPct,
    agreementCount: count,
  }
}

export function formatCurrency(value: number): string {
  if (value === 0) return '$0'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

export function formatMargin(marginPct: number | null): string {
  if (marginPct === null) return '—'
  const sign = marginPct < 0 ? '' : ''
  return `${sign}${marginPct.toFixed(1)}%`
}

// Tailwind class for a margin value: green if healthy, amber if thin,
// red if negative. Tweak thresholds as the business matures.
export function marginToneClass(marginPct: number | null): string {
  if (marginPct === null) return 'text-warm-500 dark:text-cream-400'
  if (marginPct < 0) return 'text-red-600 dark:text-red-400 font-medium'
  if (marginPct < 20) return 'text-amber-600 dark:text-amber-400'
  return 'text-lime-700 dark:text-lime-400'
}

// Visibility gate. SUPER_ADMIN sees financials. Anyone else sees nothing.
// Easy to expand later (e.g., ADMIN with a feature flag).
export function canSeeFinancials(role: string | null | undefined): boolean {
  return role === 'SUPER_ADMIN'
}

// Recurring expense categories used by the dashboard for grouping. Keep the
// list short and meaningful — too many buckets dilutes the breakdown chart.
// Free-form strings are still accepted at the DB level; this just provides
// a curated list for the form picker and predictable grouping.
export const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'vehicles', label: 'Vehicles' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'payroll', label: 'Payroll & Benefits' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'other', label: 'Other' },
] as const

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label ?? value
}

// Aggregate monthly amounts on a list of recurring expenses (active ones only).
export interface RecurringExpenseLike {
  monthlyAmount: Decimalish
  isActive: boolean
  category: string
}

export function summarizeRecurringExpenses(rows: RecurringExpenseLike[]) {
  let total = 0
  const byCategory = new Map<string, number>()
  for (const r of rows) {
    if (!r.isActive) continue
    const v = toNumber(r.monthlyAmount)
    total += v
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + v)
  }
  return { total, byCategory }
}
