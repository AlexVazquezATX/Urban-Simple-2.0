import type { ReviewFreshness } from '@/lib/operations/review-freshness'

// Margin/profit tone — negative is attention (coral), thin is gold,
// healthy is green. Never red: red is reserved for destructive confirm
// dialogs and the AR 90+ aging bucket.
export function marginTone(marginPct: number | null): string {
  if (marginPct === null) return 'text-muted-foreground'
  if (marginPct < 0) return 'text-coral-600 dark:text-coral-300'
  if (marginPct < 20) return 'text-gold-600 dark:text-gold-400'
  return 'text-green-600 dark:text-green-300'
}

// Review freshness chip tone — "Never reviewed" is attention (coral),
// stale reviews need a manager pass (gold), fresh reviews are healthy
// (green).
export function reviewBadgeVariant(
  freshness: Pick<ReviewFreshness, 'hasQualifyingReview' | 'isStale'>
): 'coral' | 'gold' | 'green' {
  if (!freshness.hasQualifyingReview) return 'coral'
  return freshness.isStale ? 'gold' : 'green'
}
