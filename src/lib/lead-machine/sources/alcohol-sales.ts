// Monthly alcohol sales per location (Texas Comptroller, Mixed Beverage
// Gross Receipts). Sales are the best public size signal for bars,
// restaurants and hotel F&B: a place selling $150k of drinks a month has a
// kitchen, a bar and a cleaning problem worth solving.

import { displayName } from '../match'
import {
  AREA_CITIES, classifyByName, EXCLUDE_NAMES, fetchJson, soql,
  type Candidate, type FetchLike,
} from './types'

const DATASET = 'https://data.texas.gov/resource/naix-2893.json'

type MonthRow = { obligation_end_date_yyyymmdd: string; count: string }
type Row = {
  taxpayer_name?: string
  location_name?: string
  location_address?: string
  location_city?: string
  location_state?: string
  location_zip?: string
  tabc_permit_number?: string
  obligation_end_date_yyyymmdd: string
  liquor_receipts?: string
  wine_receipts?: string
  beer_receipts?: string
  total_receipts?: string
}

/**
 * Filers report late, so the newest month is always thin. Use the latest
 * month whose row count is at least 80% of the recent maximum.
 */
export function pickCompleteMonth(months: MonthRow[]): string | null {
  const sorted = [...months].sort((a, b) => b.obligation_end_date_yyyymmdd.localeCompare(a.obligation_end_date_yyyymmdd))
  const recent = sorted.slice(0, 4)
  const max = Math.max(0, ...recent.map((m) => Number(m.count) || 0))
  if (max === 0) return null
  return recent.find((m) => (Number(m.count) || 0) >= max * 0.8)?.obligation_end_date_yyyymmdd ?? null
}

const money = (v: string | undefined) => Math.round(Number(v) || 0)

export async function fetchAlcoholSalesCandidates(opts: {
  fetchImpl?: FetchLike
  minMonthlyReceipts?: number
  limit?: number
}): Promise<{ candidates: Candidate[]; stats: Record<string, unknown> }> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const minReceipts = opts.minMonthlyReceipts ?? 60_000
  const cities = AREA_CITIES.map((c) => `'${c}'`).join(',')

  const months = await fetchJson<MonthRow[]>(fetchImpl, soql(DATASET, {
    $select: 'obligation_end_date_yyyymmdd,count(*) as count',
    $where: `upper(location_city) in (${cities})`,
    $group: 'obligation_end_date_yyyymmdd',
    $order: 'obligation_end_date_yyyymmdd DESC',
    $limit: 6,
  }))
  const month = pickCompleteMonth(months)
  if (!month) return { candidates: [], stats: { month: null, rows: 0, candidates: 0 } }

  const rows = await fetchJson<Row[]>(fetchImpl, soql(DATASET, {
    $where: `upper(location_city) in (${cities}) AND obligation_end_date_yyyymmdd = '${month}' AND total_receipts >= ${minReceipts}`,
    $order: 'total_receipts DESC',
    $limit: opts.limit ?? 400,
  }))

  const monthLabel = month.slice(0, 7)
  const candidates: Candidate[] = []
  for (const r of rows) {
    const rawName = r.location_name?.trim() || r.taxpayer_name?.trim()
    if (!rawName || EXCLUDE_NAMES.test(rawName)) continue
    const name = displayName(rawName)
    const total = money(r.total_receipts)
    const segment = classifyByName(name)
    candidates.push({
      source: 'alcohol_sales',
      name,
      legalName: r.taxpayer_name ? displayName(r.taxpayer_name) : null,
      segment,
      address: {
        street: r.location_address ? displayName(r.location_address) : undefined,
        city: r.location_city ? displayName(r.location_city) : undefined,
        state: r.location_state || 'TX',
        zip: r.location_zip?.slice(0, 5),
      },
      // Hotels and resorts first (best margin), then by sales volume.
      priority: (segment === 'hotel' || segment === 'resort' ? 3 : 2) + Math.min(1, total / 1_000_000),
      reason: `Sold $${total.toLocaleString('en-US')} in alcohol in ${monthLabel} (Texas Comptroller)`,
      signals: [{
        kind: 'alcohol_sales',
        sourceKey: `mixbev:${r.tabc_permit_number || name}:${monthLabel}`,
        observedAt: new Date(month),
        data: {
          month: monthLabel,
          totalReceipts: total,
          liquorReceipts: money(r.liquor_receipts),
          wineReceipts: money(r.wine_receipts),
          beerReceipts: money(r.beer_receipts),
          permit: r.tabc_permit_number ?? null,
          taxpayer: r.taxpayer_name ?? null,
        },
      }],
    })
  }

  return { candidates, stats: { month: monthLabel, rows: rows.length, candidates: candidates.length, minMonthlyReceipts: minReceipts } }
}
