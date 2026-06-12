// Middleware - auth check + role-based protection + hostname routing
//
// Hostname routing (production only, controlled by BACKHAUS_DOMAIN env var):
//   backhaus.ai  → serves (studio) routes only — customer-facing product
//   krew42.com   → serves (app) + (public) routes — admin/internal
//   localhost     → serves everything — development

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ============================================
// HOSTNAME DETECTION
// ============================================

function isBackhausDomain(host: string): boolean {
  const domain = process.env.BACKHAUS_DOMAIN
  if (!domain) return false // Disabled in local dev
  const bare = host.split(':')[0] // Strip port if present
  return bare === domain || bare === `www.${domain}`
}

// Admin route prefixes — these should never be served on BackHaus
const ADMIN_PREFIXES = [
  '/dashboard', '/app', '/clients', '/invoices',
  '/billing', '/admin', '/creative-studio', '/portal',
  '/command',
]

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((p) => pathname.startsWith(p))
}

// ============================================
// ROLE LOOKUP (PostgREST — Edge Runtime safe)
// ============================================

async function getUserRole(authId: string): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${url}/rest/v1/users?select=role&auth_id=eq.${authId}&limit=1`,
    {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Accept': 'application/json',
      },
    }
  )

  if (!res.ok) {
    console.error('[Middleware] Role lookup failed:', res.status, await res.text())
    return null
  }

  const rows = await res.json()
  return rows?.[0]?.role || null
}

// Apply the impersonation cookie on top of the real DB role. Only honored
// when the real role is SUPER_ADMIN — everyone else gets their actual role
// regardless of cookie state.
const IMPERSONABLE = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE', 'CLIENT_USER']
function applyImpersonation(realRole: string | null, request: NextRequest): string | null {
  if (realRole !== 'SUPER_ADMIN') return realRole
  const impRole = request.cookies.get('us_impersonate_role')?.value
  if (impRole && IMPERSONABLE.includes(impRole)) return impRole
  return realRole
}

// ============================================
// AGENT (API-KEY) HANDLING
// ============================================
// Programmatic agents (e.g. Mercury) authenticate with
// `Authorization: Bearer us_live_…`. Middleware does only what it can do
// reliably here (no DB access — the Edge runtime can't be trusted to reach the
// DB in every environment):
//   1. Agents live ONLY on /api/* — a key aimed at a page is bounced to /login.
//   2. It bridges the real method + pathname to the Node auth layer as request
//      headers, so api-key-verify can enforce the BackHaus scope fence and
//      write the audit row with Prisma. Set unconditionally on agent requests
//      so a client can't spoof these headers.
// Gated on the us_live_ bearer prefix, so human/cookie traffic is untouched.

const AGENT_KEY_BEARER = 'Bearer us_live_'

// ============================================
// MIDDLEWARE
// ============================================

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if needed
  await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''
  const isBackhaus = isBackhausDomain(hostname)

  // ---- Agent (API-key) requests ----
  // Applies on every host, before page/host routing. Gated on the us_live_
  // bearer prefix so normal cookie traffic is untouched.
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith(AGENT_KEY_BEARER)) {
    // Invariant 1: agents may only touch /api/* — never render pages.
    if (!pathname.startsWith('/api/')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Invariant 2: bridge the real method + pathname to the Node auth layer
    // (api-key-verify) for the BackHaus fence + audit. `set` overwrites any
    // client-supplied value, so these can't be spoofed. Auth itself is still
    // enforced by the route handler via getCurrentUser → authenticateApiKey.
    const agentHeaders = new Headers(request.headers)
    agentHeaders.set('x-agent-path', pathname)
    agentHeaders.set('x-agent-method', request.method.toUpperCase())
    return NextResponse.next({ request: { headers: agentHeaders } })
  }

  // ---- BackHaus domain: only studio routes ----
  if (isBackhaus) {
    // Block admin routes → redirect to /studio
    if (isAdminRoute(pathname)) {
      return NextResponse.redirect(new URL('/studio', request.url))
    }

    // /login → /studio/login
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/studio/login', request.url))
    }

    // Root → serve landing page (URL stays as /)
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/backhaus-home'
      return NextResponse.rewrite(url)
    }

    // /studio/* — standard studio auth guards
    if (pathname.startsWith('/studio')) {
      const isStudioPublic =
        pathname === '/studio/login' ||
        pathname === '/studio/signup' ||
        pathname === '/studio/forgot-password' ||
        pathname === '/studio/reset-password' ||
        pathname === '/studio/terms' ||
        pathname === '/studio/privacy'

      const { data: { user } } = await supabase.auth.getUser()

      if (user && isStudioPublic) {
        return NextResponse.redirect(new URL('/studio', request.url))
      }
      if (!user && !isStudioPublic) {
        return NextResponse.redirect(new URL('/studio/login', request.url))
      }
    }

    // Everything else (API routes, static assets) passes through
    return response
  }

  // ---- Admin domain (krew42.com / urbansimple.net / localhost) ----

  // Set header to indicate if this is login page
  const isLoginPage = pathname === '/login' || pathname === '/app/login'
  response.headers.set('x-is-login-page', isLoginPage ? 'true' : 'false')

  // Protect authenticated routes - require login + role check.
  // These prefixes trigger the server-side role lookup so access is
  // *enforced*, not just hidden in the sidebar.
  const AUTHED_PREFIXES = [
    '/dashboard', '/app', '/clients', '/locations', '/operations', '/chat',
    '/team', '/invoices', '/billing', '/financials', '/growth', '/creative-hub',
    '/creative-studio', '/pulse', '/chat-analytics', '/tasks', '/admin', '/command',
  ]

  // Per-section role matrix — mirrors the sidebar's `roles` so what's hidden
  // from a role's nav is also blocked if they URL-hack to it. Anyone not in
  // the allow-list is bounced to their own dashboard. Order matters: more
  // specific prefixes (e.g. /dashboard/blog) must precede general ones.
  const ROUTE_ROLES: Array<{ prefix: string; allow: string[] }> = [
    { prefix: '/admin', allow: ['SUPER_ADMIN'] },
    { prefix: '/dashboard/blog', allow: ['SUPER_ADMIN'] },
    { prefix: '/pulse', allow: ['SUPER_ADMIN'] },
    { prefix: '/financials', allow: ['SUPER_ADMIN'] },
    { prefix: '/tasks', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/billing', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/invoices', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/growth', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/creative-hub', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/creative-studio', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/chat-analytics', allow: ['SUPER_ADMIN', 'ADMIN'] },
    { prefix: '/command', allow: ['SUPER_ADMIN', 'ADMIN'] },
  ]

  if (AUTHED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
      const realRole = await getUserRole(user.id)
      const role = applyImpersonation(realRole, request) ?? ''

      // CLIENT_USER cannot access admin routes — redirect to /portal (the
      // Urban Simple client portal) which is now the default landing for
      // cleaning customers. (BackHaus/Studio is a separate product surface.)
      if (role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/portal', request.url))
      }

      // Enforce the section role matrix.
      for (const { prefix, allow } of ROUTE_ROLES) {
        if (pathname.startsWith(prefix) && !allow.includes(role)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
  }

  // Handle root route - redirect authenticated users based on role
  if (pathname === '/') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const realRole = await getUserRole(user.id)
      const role = applyImpersonation(realRole, request)

      if (role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Handle login page - redirect authenticated users based on role
  if (pathname === '/login') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const realRole = await getUserRole(user.id)
      const role = applyImpersonation(realRole, request)

      if (role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect /studio routes - require login (except public pages)
  if (pathname.startsWith('/studio')) {
    const isStudioPublic =
      pathname === '/studio/login' ||
      pathname === '/studio/signup' ||
      pathname === '/studio/forgot-password' ||
      pathname === '/studio/reset-password' ||
      pathname === '/studio/terms' ||
      pathname === '/studio/privacy'

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Redirect authenticated users away from login/signup
    if (user && isStudioPublic) {
      return NextResponse.redirect(new URL('/studio', request.url))
    }

    // Redirect unauthenticated users to studio login
    if (!user && !isStudioPublic) {
      return NextResponse.redirect(new URL('/studio/login', request.url))
    }
  }

  // Protect /portal routes - require login (except public auth pages).
  // /portal/signup is public so non-Austin restaurants can self-onboard.
  if (pathname.startsWith('/portal')) {
    const isPortalPublic =
      pathname.startsWith('/portal/login') ||
      pathname.startsWith('/portal/signup')

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isPortalPublic) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
