// Name and address matching, so an account found by two sources (or already
// in the CRM under a slightly different name) becomes one prospect.

// Legal suffixes, place words and property-type words: "Fairmont Austin
// Hotel" and "Fairmont Austin" are the same account.
const NOISE_WORDS = new Set([
  'the', 'llc', 'inc', 'co', 'corp', 'corporation', 'ltd', 'lp', 'llp', 'company',
  'austin', 'atx', 'tx', 'texas', 'and', 'at', 'of',
  'hotel', 'hotels', 'resort', 'spa', 'downtown', 'dt',
])

const DIRECTIONS = new Set(['n', 's', 'e', 'w', 'north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'])
const UNIT_WORDS = /\b(ste|suite|unit|bldg|building|apt|room|rm|space|#)\b.*$/

export function nameTokens(name: string | null | undefined): string[] {
  if (!name) return []
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((t) => t && !NOISE_WORDS.has(t))
}

export function normName(name: string | null | undefined): string {
  return nameTokens(name).join(' ')
}

/** "110 E 2nd St, Ste 4" -> "110 2nd". Number plus first real street word. */
export function streetKey(street: string | null | undefined): string | null {
  if (!street) return null
  const cleaned = street.toLowerCase().replace(/[.,]/g, ' ').replace(UNIT_WORDS, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const num = parts.find((p) => /^\d+[a-z]?$/.test(p))
  if (!num) return null
  const after = parts.slice(parts.indexOf(num) + 1).filter((p) => !DIRECTIONS.has(p))
  return after[0] ? `${num} ${after[0]}` : null
}

export type Matchable = { id: string; companyName: string; street?: string | null }

/** A stable per-business key: survives renames of the CRM record. */
export function seenKey(name: string, street?: string | null): string {
  return `seen:${normName(name)}|${streetKey(street) ?? ''}`
}

/** In-memory index over existing prospects (and clients) for one company. */
export class ProspectIndex {
  private byName = new Map<string, Array<{ id: string; sk: string | null }>>()
  private byStreet = new Map<string, Array<{ id: string; tokens: Set<string> }>>()

  constructor(rows: Matchable[] = []) {
    for (const r of rows) this.add(r)
  }

  add(r: Matchable) {
    const n = normName(r.companyName)
    const sk = streetKey(r.street)
    if (n) this.byName.set(n, [...(this.byName.get(n) ?? []), { id: r.id, sk }])
    if (sk) {
      const list = this.byStreet.get(sk) ?? []
      list.push({ id: r.id, tokens: new Set(nameTokens(r.companyName)) })
      this.byStreet.set(sk, list)
    }
  }

  /**
   * Same normalized name (unless both addresses are known and differ: that's
   * another location of a chain), or same street address sharing at least
   * one name word. Address alone isn't enough: a hotel and the restaurant
   * inside it share an address but are different buyers.
   */
  find(name: string, street?: string | null): string | null {
    const n = normName(name)
    const sk = streetKey(street)
    for (const entry of (n && this.byName.get(n)) || []) {
      if (!sk || !entry.sk || entry.sk === sk) return entry.id
    }
    if (!sk) return null
    const tokens = nameTokens(name)
    for (const cand of this.byStreet.get(sk) ?? []) {
      if (tokens.some((t) => t.length > 2 && cand.tokens.has(t))) return cand.id
    }
    return null
  }
}

const KEEP_UPPER = new Set(['jw', 'atx', 'bbq', 'usa', 'ii', 'iii', 'iv', 'llc', 'tx', 'ut', 'acl', 'w'])

/** Public datasets shout in ALL CAPS; make names readable. */
export function displayName(raw: string): string {
  const s = raw.trim().replace(/\s+/g, ' ')
  if (s !== s.toUpperCase()) return s
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (KEEP_UPPER.has(w.replace(/[^a-z]/g, '')) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}
