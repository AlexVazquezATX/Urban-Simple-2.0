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
      url.pathname = '/landing'
      return NextResponse.rewrite(url)
    }

    // /studio/* — standard studio auth guards
    if (pathname.startsWith('/studio')) {
      const isStudioPublic =
        pathname === '/studio/login' || pathname === '/studio/signup'

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

  // Protect authenticated routes - require login + role check
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/app') || pathname.startsWith('/clients') || pathname.startsWith('/invoices') || pathname.startsWith('/billing') || pathname.startsWith('/admin') || pathname.startsWith('/creative-studio')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
      const role = await getUserRole(user.id)

      // CLIENT_USER cannot access admin routes — redirect to studio
      if (role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/studio', request.url))
      }

      // Admin routes require SUPER_ADMIN role
      if (pathname.startsWith('/admin') && role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }

  // Handle root route - redirect authenticated users based on role
  if (pathname === '/') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const role = await getUserRole(user.id)

      if (role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/studio', request.url))
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
      const role = await getUserRole(user.id)

      if (role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/studio', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect /studio routes - require login (except login/signup pages)
  if (pathname.startsWith('/studio')) {
    const isStudioPublic =
      pathname === '/studio/login' ||
      pathname === '/studio/signup'

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

  // Protect /portal routes - require login
  if (pathname.startsWith('/portal')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !pathname.startsWith('/portal/login')) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
