import type { ViewMode } from '@/components/ui/view-toggle'

// Persist the table/card view preference in a cookie (not localStorage) so the
// server component can read it and render the correct view on first paint —
// no hydration flash. One-year expiry.
export function persistViewMode(cookieName: string, mode: ViewMode) {
  if (typeof document === 'undefined') return
  document.cookie = `${cookieName}=${mode}; path=/; max-age=31536000; samesite=lax`
}
