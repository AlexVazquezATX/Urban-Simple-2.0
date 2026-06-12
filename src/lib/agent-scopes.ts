// Scope model for programmatic (API-key) access — e.g. the Mercury agent.
//
// IMPORTANT: this module must stay dependency-free (no Prisma, no next/*) so it
// can be imported from BOTH the Edge middleware and the Node auth layer.
//
// An API key carries a `scopes: string[]`. The wildcard `'*'` grants every
// STANDARD scope, but NOT the opt-in sensitive scopes listed in
// `OPT_IN_SCOPES` — those must be granted explicitly by name. This lets a
// "full access" key still be fenced out of a cross-product surface (BackHaus)
// without enumerating every other scope.

export const WILDCARD_SCOPE = '*'

// Sensitive scopes that '*' does NOT cover — must be granted explicitly.
export const OPT_IN_SCOPES = ['backhaus'] as const

// Standard scope catalog (documentation + future per-route enforcement).
// Today only `backhaus` is actively enforced (see BACKHAUS_API_PREFIXES); the
// rest are forward-looking so a key can be dialed back later without code changes.
export const SCOPE_CATALOG = {
  ops: 'Schedules, shifts, dispatch, clients, locations, checklists',
  workforce: 'Time entries, hours, compliance data',
  financials: 'Invoices, billing, financial snapshots, QBO sync',
  users: 'User accounts, roles, admin analytics',
  growth: 'CRM, prospects, leads, outreach, discovery',
  backhaus: 'BackHaus (backhaus.ai) studio-client data — OPT-IN, not covered by *',
} as const

// BackHaus / studio API subtree. Any of these prefixes requires the `backhaus`
// scope. Prefix-based so the whole subtree (including future routes) is covered.
// NOTE: `/api/creative-studio` and `/api/creative-hub` are Urban Simple's OWN
// internal creative tools and are intentionally NOT listed here.
export const BACKHAUS_API_PREFIXES = [
  '/api/admin/studio-clients',
  '/api/studio',
] as const

/**
 * Does a key with the given scopes satisfy `required`?
 * The wildcard grants everything EXCEPT the opt-in sensitive scopes, which
 * must be present by name.
 */
export function keyAllowsScope(scopes: string[], required: string): boolean {
  if (scopes.includes(required)) return true
  if (scopes.includes(WILDCARD_SCOPE) && !OPT_IN_SCOPES.includes(required as (typeof OPT_IN_SCOPES)[number])) {
    return true
  }
  return false
}

/**
 * If `pathname` falls under the BackHaus subtree, return the scope it requires
 * (`'backhaus'`). Otherwise null. Used by middleware to fence off BackHaus.
 */
export function backhausScopeForPath(pathname: string): string | null {
  return BACKHAUS_API_PREFIXES.some((p) => pathname.startsWith(p)) ? 'backhaus' : null
}
