// Middleware - auth check + role-based protection for admin routes

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  // Set header to indicate if this is login page
  const isLoginPage = request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/app/login'
  response.headers.set('x-is-login-page', isLoginPage ? 'true' : 'false')

  // Protect authenticated routes - require login
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/app') || request.nextUrl.pathname.startsWith('/clients') || request.nextUrl.pathname.startsWith('/invoices') || request.nextUrl.pathname.startsWith('/billing') || request.nextUrl.pathname.startsWith('/admin')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Admin routes require SUPER_ADMIN role
    if (user && request.nextUrl.pathname.startsWith('/admin')) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single()

      if (!dbUser || dbUser.role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
  }
  
  // Handle root route - redirect authenticated users based on role
  if (request.nextUrl.pathname === '/') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Check role to determine redirect destination
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single()

      if (dbUser?.role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/studio', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Handle login page - redirect authenticated users based on role
  if (request.nextUrl.pathname === '/login') {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', user.id)
        .single()

      if (dbUser?.role === 'CLIENT_USER') {
        return NextResponse.redirect(new URL('/studio', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect /studio routes - require login (except login/signup pages)
  if (request.nextUrl.pathname.startsWith('/studio')) {
    const isStudioPublic =
      request.nextUrl.pathname === '/studio/login' ||
      request.nextUrl.pathname === '/studio/signup'

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
  if (request.nextUrl.pathname.startsWith('/portal')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !request.nextUrl.pathname.startsWith('/portal/login')) {
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



