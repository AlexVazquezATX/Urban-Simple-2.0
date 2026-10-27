// Hotels and resorts in the Austin area from Google Places text search.
// Paid per call, so it runs weekly and stops at the monthly call cap.

import { fetchJson, type Candidate, type FetchLike } from './types'

const TEXT_SEARCH = 'https://maps.googleapis.com/maps/api/place/textsearch/json'

export const HOTEL_QUERIES = [
  'hotels in Austin TX',
  'luxury hotels in Austin TX',
  'boutique hotels in Austin TX',
  'resorts near Austin TX',
]

// Economy chains rarely buy outside nightly cleaning; skip them.
const ECONOMY = /\b(motel 6|super 8|red roof|days inn|econo lodge|extended stay|la quinta|studio 6|quality inn|rodeway|americas best|budget|hostel|rv park|apartments?)\b/i

type PlaceResult = {
  place_id: string
  name: string
  formatted_address?: string
  business_status?: string
  types?: string[]
  rating?: number
  user_ratings_total?: number
  price_level?: number
}
type TextSearchResponse = {
  status: string
  results?: PlaceResult[]
  next_page_token?: string
  error_message?: string
}

/** "110 E 2nd St, Austin, TX 78701, United States" -> parts. */
export function parseFormattedAddress(addr: string | undefined) {
  if (!addr) return {}
  const parts = addr.split(',').map((p) => p.trim())
  const stateZip = parts.find((p) => /^[A-Z]{2}\s+\d{5}/.test(p))
  const idx = stateZip ? parts.indexOf(stateZip) : -1
  return {
    street: parts[0],
    city: idx > 0 ? parts[idx - 1] : undefined,
    state: stateZip?.slice(0, 2),
    zip: stateZip?.match(/\d{5}/)?.[0],
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchPlacesHotelCandidates(opts: {
  apiKey: string | undefined
  callBudget: number
  fetchImpl?: FetchLike
  minReviews?: number
  pageDelayMs?: number
}): Promise<{ candidates: Candidate[]; stats: Record<string, unknown> }> {
  if (!opts.apiKey) throw new Error('GOOGLE_PLACES_API_KEY is not set')
  const fetchImpl = opts.fetchImpl ?? fetch
  const minReviews = opts.minReviews ?? 150
  let calls = 0
  const seen = new Map<string, { place: PlaceResult; query: string }>()

  try {
    for (const query of HOTEL_QUERIES) {
      let pageToken: string | undefined
      for (let page = 0; page < 3 && calls < opts.callBudget; page++) {
        // Google needs a moment before a next_page_token becomes valid.
        if (pageToken) await sleep(opts.pageDelayMs ?? 3000)
        const url = `${TEXT_SEARCH}?${new URLSearchParams(
          pageToken ? { pagetoken: pageToken, key: opts.apiKey } : { query, type: 'lodging', key: opts.apiKey },
        )}`
        calls++
        let res = await fetchJson<TextSearchResponse>(fetchImpl, url)
        // A page token can still be warming up after the first wait; give it
        // one more try, then settle for the pages we have.
        if (pageToken && res.status === 'INVALID_REQUEST' && calls < opts.callBudget) {
          await sleep(opts.pageDelayMs ?? 2000)
          calls++
          res = await fetchJson<TextSearchResponse>(fetchImpl, url)
        }
        if (pageToken && res.status === 'INVALID_REQUEST') break
        if (res.status !== 'OK' && res.status !== 'ZERO_RESULTS') {
          throw new Error(`Google Places ${res.status}${res.error_message ? `: ${res.error_message}` : ''}`)
        }
        for (const p of res.results ?? []) if (!seen.has(p.place_id)) seen.set(p.place_id, { place: p, query })
        pageToken = res.next_page_token
        if (!pageToken) break
      }
    }
  } catch (err) {
    // Calls already made are billed even when the run fails; the run log
    // must count them against the monthly cap.
    throw Object.assign(err instanceof Error ? err : new Error(String(err)), { stats: { placesCalls: calls } })
  }

  const candidates: Candidate[] = []
  for (const { place: p, query } of seen.values()) {
    if (p.business_status && p.business_status !== 'OPERATIONAL') continue
    if ((p.user_ratings_total ?? 0) < minReviews) continue
    if (ECONOMY.test(p.name)) continue
    const addr = parseFormattedAddress(p.formatted_address)
    if (addr.state && addr.state !== 'TX') continue
    const isResort = /\bresort\b/i.test(p.name) || /resort/.test(query)
    const reviews = p.user_ratings_total ?? 0
    candidates.push({
      source: 'places_hotels',
      name: p.name,
      segment: isResort ? 'resort' : 'hotel',
      address: addr,
      priority: 3 + Math.min(1, reviews / 5000) + ((p.rating ?? 0) >= 4.4 ? 0.2 : 0),
      reason: `${isResort ? 'Resort' : 'Hotel'} on Google, ${p.rating ?? '?'} stars from ${reviews.toLocaleString('en-US')} reviews`,
      signals: [{
        kind: 'google_places',
        sourceKey: `places:${p.place_id}`,
        observedAt: new Date(),
        data: {
          placeId: p.place_id,
          rating: p.rating ?? null,
          reviews,
          priceLevel: p.price_level ?? null,
          types: p.types ?? [],
          query,
        },
      }],
    })
  }

  return { candidates, stats: { placesCalls: calls, results: seen.size, candidates: candidates.length } }
}
