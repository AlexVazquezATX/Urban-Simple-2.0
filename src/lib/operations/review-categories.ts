// Client-safe: the nightly review form and the review submit route both map
// pain-point categories onto the canonical ISSUE_CATEGORIES ids.
import { ISSUE_CATEGORIES } from '@/lib/ops/constants'

const CANONICAL = new Set<string>(ISSUE_CATEGORIES.map((c) => c.id))

const ALIASES: Record<string, string> = {
  supply_shortage: 'supplies',
  supply: 'supplies',
  cleaning_quality: 'quality',
  client_feedback: 'communication',
  keys: 'access',
}

export function toIssueCategory(category: string | null | undefined): string {
  const key = (category || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (CANONICAL.has(key)) return key
  return ALIASES[key] ?? 'other'
}
