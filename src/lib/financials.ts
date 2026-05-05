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
