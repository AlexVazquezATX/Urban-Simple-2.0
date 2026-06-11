/**
 * AR aging ramp — the ONE approved red in the system lives at 90+.
 * Per 02-component-rules: teal (current) → gold-500 (1–2mo) →
 * coral (2–3mo) → danger (3+mo). Days-past-due text uses its bucket
 * color; the 90+ chip is danger-toned.
 */

export type AgingBucket =
  | 'current'
  | 'overdue_31_60'
  | 'overdue_61_90'
  | 'overdue_90_plus'

/** Text color for figures/days-past-due in each bucket. */
export const agingTextClass: Record<AgingBucket, string> = {
  current: 'text-teal-600 dark:text-teal-300',
  overdue_31_60: 'text-gold-500',
  overdue_61_90: 'text-coral-600 dark:text-coral-300',
  overdue_90_plus: 'text-danger',
}

/** Badge tone per bucket — 90+ has no tone; it uses `agingDangerChipClass`. */
export const agingChipVariant: Record<
  Exclude<AgingBucket, 'overdue_90_plus'>,
  'teal' | 'gold' | 'coral'
> = {
  current: 'teal',
  overdue_31_60: 'gold',
  overdue_61_90: 'coral',
}

/** Danger-toned chip classes for the 90+ bucket (the approved red). */
export const agingDangerChipClass =
  'bg-danger/10 text-danger border-danger/30'
