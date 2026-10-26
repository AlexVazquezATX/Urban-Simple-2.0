// Staff API role matrix, enforced in middleware for browser sessions.
// Pure and edge-safe so it can be unit tested (scripts/tests/api-access.test.ts).
// Route handlers historically checked only "signed in + same company", so an
// ASSOCIATE could edit pay, shifts, checklists or invoices by calling the API
// directly. This matrix is the enforcement layer for browser sessions (agent
// bearer keys have their own scopes). First matching rule wins; anything
// unmatched is open to any signed-in staff user.

const ADMINS = ['SUPER_ADMIN', 'ADMIN']
const MANAGERS = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const WRITES = ['POST', 'PUT', 'PATCH', 'DELETE']

interface ApiRule {
  match: RegExp
  allow: string[]
  methods?: string[] // default: all methods
}

const API_RULES: ApiRule[] = [
  // Open to every staff role (associates included)
  { match: /^\/api\/users\/me(\/|$)/, allow: [...MANAGERS, 'ASSOCIATE'] },
  { match: /^\/api\/checklists\/[^/]+\/complete$/, allow: [...MANAGERS, 'ASSOCIATE'] },
  { match: /^\/api\/operations\/clock$/, allow: [...MANAGERS, 'ASSOCIATE'] },

  // Money and growth: admins only
  { match: /^\/api\/clients\/[^/]+\/(billing-preview|service-items|facilities|changelog)(\/|$)/, allow: ADMINS },
  { match: /^\/api\/(invoices|payments|billing|service-agreements|qbo|financials|growth|communications|command|money)(\/|$)/, allow: ADMINS },

  // Ops management: managers and up
  { match: /^\/api\/(clients|locations|shifts|location-assignments|operations)(\/|$)/, allow: MANAGERS },
  { match: /^\/api\/(checklists|checklist-library)(\/|$)/, allow: MANAGERS, methods: WRITES },
  { match: /^\/api\/users(\/|$)/, allow: MANAGERS, methods: WRITES },
  { match: /^\/api\/issues\/[^/]+$/, allow: MANAGERS, methods: ['PUT', 'PATCH', 'DELETE'] },
  { match: /^\/api\/issues\/[^/]+\/notify-client$/, allow: MANAGERS },
]

export function apiAllowed(pathname: string, method: string, role: string): boolean {
  for (const rule of API_RULES) {
    if (!rule.match.test(pathname)) continue
    if (rule.methods && !rule.methods.includes(method.toUpperCase())) continue
    return rule.allow.includes(role)
  }
  return true
}
