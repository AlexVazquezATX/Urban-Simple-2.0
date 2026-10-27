// New on-premise liquor license applications (TABC, refreshed nightly).
// A filing means a bar or restaurant is opening or changing hands soon,
// usually weeks before the doors open: the best time to be their first call.

import { displayName, normName } from '../match'
import {
  AREA_CITIES, classifyByName, EXCLUDE_NAMES, fetchJson, soql,
  type Candidate, type FetchLike,
} from './types'

const DATASET = 'https://data.texas.gov/resource/mxm5-tdpj.json'

// On-premise types: mixed beverage, wine & beer retailer (on-premise),
// food & beverage certificate (restaurants), beer retailer on-premise.
// Package stores, wholesalers and temporary event permits are left out.
export const ON_PREMISE_TYPES = ['MB', 'BG', 'FB', 'BE']

type Row = {
  application_id: string
  license_type: string
  applicationstatus?: string
  primary_license_id?: string
  submission_date?: string
  trade_name?: string
  owner?: string
  address?: string
  address_2?: string
  city?: string
  state?: string
  zip?: string
}

export async function fetchTabcCandidates(opts: {
  fetchImpl?: FetchLike
  now?: Date
  sinceDays?: number
}): Promise<{ candidates: Candidate[]; stats: Record<string, unknown> }> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const now = opts.now ?? new Date()
  const since = new Date(now.getTime() - (opts.sinceDays ?? 60) * 86_400_000).toISOString().slice(0, 19)
  const cities = AREA_CITIES.map((c) => `'${c}'`).join(',')
  const types = ON_PREMISE_TYPES.map((t) => `'${t}'`).join(',')

  const rows = await fetchJson<Row[]>(fetchImpl, soql(DATASET, {
    $where: `upper(city) in (${cities}) AND license_type in (${types}) AND submission_date > '${since}'`,
    $order: 'submission_date DESC',
    $limit: 500,
  }))

  // A restaurant files an MB plus an FB certificate under one primary license:
  // one business, one candidate, every application kept as a signal.
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const name = r.trade_name?.trim() || r.owner?.trim()
    if (!name || EXCLUDE_NAMES.test(name)) continue
    const key = r.primary_license_id || `${normName(name)}|${(r.zip ?? '').slice(0, 5)}`
    groups.set(key, [...(groups.get(key) ?? []), r])
  }

  const candidates: Candidate[] = []
  for (const group of groups.values()) {
    const first = group[0]
    const name = displayName((first.trade_name?.trim() || first.owner!.trim()))
    const types = [...new Set(group.map((g) => g.license_type))]
    const submitted = first.submission_date ? new Date(first.submission_date) : now
    const street = [first.address, first.address_2].filter(Boolean).join(' ').trim()
    const segment = classifyByName(name)
    candidates.push({
      source: 'tabc',
      name,
      legalName: first.owner?.trim() || null,
      segment,
      address: {
        street: street ? displayName(street.toUpperCase()) : undefined,
        city: first.city ? displayName(first.city.toUpperCase()) : undefined,
        state: first.state || 'TX',
        zip: first.zip ? first.zip.slice(0, 5) : undefined,
      },
      // Newer filings first; full-bar (MB) applicants are bigger operations.
      priority: 2 + (types.includes('MB') ? 0.5 : 0) + Math.max(0, 1 - (now.getTime() - submitted.getTime()) / (60 * 86_400_000)),
      reason: `Filed for a ${types.includes('MB') ? 'mixed beverage' : 'beer/wine'} license on ${submitted.toISOString().slice(0, 10)} (${first.applicationstatus ?? 'pending'}): likely opening or changing hands soon`,
      signals: group.map((g) => ({
        kind: 'tabc_new_license' as const,
        sourceKey: `tabc:${g.application_id}`,
        observedAt: g.submission_date ? new Date(g.submission_date) : now,
        data: {
          applicationId: g.application_id,
          licenseType: g.license_type,
          status: g.applicationstatus ?? null,
          owner: g.owner ?? null,
          tradeName: g.trade_name?.trim() ?? null,
          primaryLicenseId: g.primary_license_id ?? null,
        },
      })),
    })
  }

  return { candidates, stats: { rows: rows.length, candidates: candidates.length } }
}
