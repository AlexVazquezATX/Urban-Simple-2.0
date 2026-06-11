// Margin tone for client financial figures — negative margin is attention
// (coral), thin margin is gold, healthy margin stays neutral so color only
// appears when the number IS the signal. Never red: red is reserved for
// destructive confirm dialogs and the AR 90+ aging bucket.
export function marginToneClass(marginPct: number | null): string {
  if (marginPct === null) return 'text-muted-foreground'
  if (marginPct < 0) return 'text-coral-600 dark:text-coral-300'
  if (marginPct < 20) return 'text-gold-600 dark:text-gold-400'
  return 'text-foreground'
}
