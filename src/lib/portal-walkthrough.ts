// Default zone preset for walkthrough capture. Each location can override
// later, but most restaurants/hotels use roughly this set.
export const DEFAULT_WALKTHROUGH_ZONES = [
  'Kitchen Line',
  'Dish Pit',
  'Walk-in / Reach-in',
  'Dining Room',
  'Restrooms',
  'Bar / Beverage',
  'Back of House',
  'Storage / Dry Goods',
] as const

export type WalkthroughZone = {
  zone: string
  photos: string[]
  notes?: string
  rating?: 'ok' | 'issue' | null
}

// Validate a single zone entry from a client-submitted walkthrough.
export function normalizeZone(input: unknown): WalkthroughZone | null {
  if (!input || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const zone = typeof o.zone === 'string' ? o.zone.trim() : ''
  if (!zone) return null

  const photosRaw = Array.isArray(o.photos) ? o.photos : []
  const photos = photosRaw.filter((p): p is string => typeof p === 'string' && p.length > 0)

  const notes = typeof o.notes === 'string' ? o.notes.trim() : undefined
  const rating = o.rating === 'ok' || o.rating === 'issue' ? o.rating : null

  return {
    zone,
    photos,
    notes: notes || undefined,
    rating,
  }
}

export function summarizeWalkthrough(zones: WalkthroughZone[]): {
  photoCount: number
  overallRating: 'ok' | 'issue' | null
} {
  let photoCount = 0
  let anyIssue = false
  let anyOk = false
  for (const z of zones) {
    photoCount += z.photos.length
    if (z.rating === 'issue') anyIssue = true
    if (z.rating === 'ok') anyOk = true
  }
  const overallRating: 'ok' | 'issue' | null = anyIssue ? 'issue' : anyOk ? 'ok' : null
  return { photoCount, overallRating }
}
