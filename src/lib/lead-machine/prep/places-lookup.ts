// One Google Places (New) text search per account: website, phone, rating and
// a few recent reviews. The result is only trusted when it is plausibly the
// same business (shared name word or same street address).

import { nameTokens, streetKey } from '../match'
import { fetchJson, type FetchLike } from '../sources/types'
import { parseFormattedAddress } from '../sources/places-hotels'

const SEARCH = 'https://places.googleapis.com/v1/places:searchText'
const FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.primaryTypeDisplayName',
  'places.editorialSummary',
  'places.reviews.rating',
  'places.reviews.text',
  'places.reviews.publishTime',
].join(',')

type NewPlace = {
  id: string
  displayName?: { text?: string }
  formattedAddress?: string
  websiteUri?: string
  nationalPhoneNumber?: string
  businessStatus?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  primaryTypeDisplayName?: { text?: string }
  editorialSummary?: { text?: string }
  reviews?: Array<{ rating?: number; text?: { text?: string }; publishTime?: string }>
}

export type PlaceFacts = {
  placeId: string
  name: string
  address: string | null
  website: string | null
  phone: string | null
  status: string | null
  rating: number | null
  reviewCount: number | null
  priceLevel: string | null
  type: string | null
  summary: string | null
  reviews: Array<{ rating: number | null; text: string; when: string | null }>
}

// Words that describe what a place is, not which place it is: "Joe's Bar"
// and "Black Cat Bar" share "bar" and nothing else.
const CATEGORY_WORDS = new Set([
  'bar', 'bars', 'pub', 'tavern', 'saloon', 'lounge', 'club', 'cantina', 'icehouse', 'brewery', 'brewing', 'taproom', 'winery',
  'wine', 'beer', 'cocktail', 'cocktails', 'garden', 'hall', 'room', 'house', 'kitchen', 'grill', 'cafe', 'coffee', 'bistro',
  'diner', 'eatery', 'restaurant', 'restaurants', 'cocina', 'taqueria', 'taco', 'tacos', 'pizza', 'pizzeria', 'sushi', 'bbq',
  'barbecue', 'burger', 'burgers', 'bakery', 'deli', 'market', 'steakhouse', 'seafood', 'oyster', 'ramen', 'noodle', 'noodles',
  'mexican', 'japanese', 'italian', 'thai', 'chinese', 'indian', 'vietnamese', 'korean', 'french', 'tex', 'mex', 'texmex',
  'inn', 'suites', 'lodge', 'motel', 'by', 'new', 'old', 'east', 'west', 'north', 'south', 'sixth', '6th', 'street', 'st',
])

function distinctive(name: string): string[] {
  return nameTokens(name).filter((t) => t.length > 2 && !CATEGORY_WORDS.has(t))
}

/**
 * Same street address: same place. Otherwise every distinctive word of our
 * name must appear in Google's ("Maiko Japanese Restaurant" -> "Maiko Sushi
 * Lounge" passes, "Taco Joint" -> "Taco Bell" doesn't). A name with nothing
 * distinctive needs the street.
 */
export function samePlace(want: { name: string; street?: string | null }, got: { name: string; address?: string | null }): boolean {
  const wantStreet = streetKey(want.street)
  const gotStreet = streetKey(parseFormattedAddress(got.address ?? undefined).street)
  if (wantStreet && gotStreet && wantStreet === gotStreet) return true
  const ours = distinctive(want.name)
  if (ours.length === 0) return false
  const theirs = new Set(distinctive(got.name))
  return ours.every((t) => theirs.has(t))
}

export async function lookupPlace(opts: {
  apiKey: string
  name: string
  street?: string | null
  city?: string | null
  fetchImpl?: FetchLike
}): Promise<PlaceFacts | null> {
  const textQuery = [opts.name, opts.street, opts.city || 'Austin', 'TX'].filter(Boolean).join(', ')
  const fetchImpl: FetchLike = (url, init) =>
    (opts.fetchImpl ?? fetch)(url, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': opts.apiKey, 'X-Goog-FieldMask': FIELDS },
      body: JSON.stringify({ textQuery, maxResultCount: 1 }),
    })
  const res = await fetchJson<{ places?: NewPlace[] }>(fetchImpl, SEARCH)
  const p = res.places?.[0]
  if (!p?.id) return null
  const name = p.displayName?.text ?? ''
  if (!samePlace({ name: opts.name, street: opts.street }, { name, address: p.formattedAddress })) return null
  return {
    placeId: p.id,
    name,
    address: p.formattedAddress ?? null,
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    status: p.businessStatus ?? null,
    rating: p.rating ?? null,
    reviewCount: p.userRatingCount ?? null,
    priceLevel: p.priceLevel ?? null,
    type: p.primaryTypeDisplayName?.text ?? null,
    summary: p.editorialSummary?.text ?? null,
    reviews: (p.reviews ?? [])
      .map((r) => ({ rating: r.rating ?? null, text: (r.text?.text ?? '').slice(0, 600), when: r.publishTime?.slice(0, 10) ?? null }))
      .filter((r) => r.text),
  }
}
