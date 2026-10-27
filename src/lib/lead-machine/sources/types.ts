import type { SourceKey } from '../settings'

export type Segment = 'hotel' | 'resort' | 'bar' | 'restaurant'

export type SignalDraft = {
  kind: 'tabc_new_license' | 'alcohol_sales' | 'google_places'
  sourceKey: string
  observedAt: Date
  data: Record<string, unknown>
}

/** An account a source thinks is worth having in the CRM. */
export type Candidate = {
  source: SourceKey
  name: string
  legalName?: string | null
  segment: Segment
  address: { street?: string; city?: string; state?: string; zip?: string }
  /** Higher sorts first when the daily cap is short. */
  priority: number
  /** One line for the prospect note and the morning brief. */
  reason: string
  signals: SignalDraft[]
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

export const AREA_CITIES = ['AUSTIN', 'WEST LAKE HILLS', 'ROLLINGWOOD', 'LAKEWAY', 'BEE CAVE', 'SUNSET VALLEY']

/**
 * Brand and keyword hints for classifying a business by name. Words that are
 * also common in bar names ("inn", "proper") only count as part of a brand.
 */
const HOTEL_WORDS = /\b(hotel|hotels|suites|lodge|marriott|hilton|hyatt|omni|fairmont|westin|sheraton|kimpton|hampton inn|holiday inn|courtyard|four seasons|ritz|thompson|canopy|aloft|embassy suites|doubletree|renaissance|intercontinental|driskill)\b/i
const BAR_WORDS = /\b(bar|pub|saloon|tavern|lounge|icehouse|ice house|beer garden|biergarten|taproom|cantina|club|brewery|brewing|distillery|winery)\b/i

/**
 * Bar words win over hotel words: "Hotel Vegas" and "Foxy's Proper Pub" are
 * bars. Google's lodging results are classified by the Places source itself.
 */
export function classifyByName(name: string): Segment {
  if (/\bresort\b/i.test(name)) return 'resort'
  if (BAR_WORDS.test(name)) return 'bar'
  if (HOTEL_WORDS.test(name)) return 'hotel'
  return 'restaurant'
}

/** Places that sell a lot of alcohol but aren't cleaning buyers for us. */
export const EXCLUDE_NAMES = /\b(church|stadium|arena|center at university|university|airport|festival|concession|catering|liquor store|wine and spirits|spec'?s|total wine|grocery|h-?e-?b|whole foods|costco|walmart|target|cvs|walgreens|7-eleven|circle k|temporary|event)\b/i

export async function fetchJson<T>(fetchImpl: FetchLike, url: string, timeoutMs = 20_000): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`${new URL(url).host} returned HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export function soql(base: string, params: Record<string, string | number>): string {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
  return `${base}?${qs}`
}
