/**
 * Money formatting — Intl.NumberFormat everywhere.
 * Dashboards/tables: no cents for whole dollars. Invoices/billing: cents.
 * Always render inside `font-mono tabular-nums`. Negative/overdue values
 * color coral, never red.
 */

const wholeUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const exactUsd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Dashboard/table money — "$12,480", no cents. */
export function formatMoney(value: number): string {
  return wholeUsd.format(value)
}

/** Invoice/billing money — "$477,586.46", always cents. */
export function formatMoneyExact(value: number): string {
  return exactUsd.format(value)
}

/** Classes every money figure should carry. */
export const moneyClass = 'font-mono tabular-nums'
