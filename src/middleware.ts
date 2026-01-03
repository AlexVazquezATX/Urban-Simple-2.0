// Minimal middleware - just checks if user is logged in
// No complex route protection - we'll add that when needed

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

  // Protect /app routes - require login
  if (request.nextUrl.pathname.startsWith('/app') || request.nextUrl.pathname.startsWith('/clients') || request.nextUrl.pathname.startsWith('/invoices') || request.nextUrl.pathname.startsWith('/billing')) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !isLoginPage) {
      // Redirect to login - try /login first (route group), fallback to /app/login
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  // Also protect root routes that are part of the app
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login') {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    // If on login page, allow it
    if (request.nextUrl.pathname === '/login') {
      return response
    }
    
    // If on root and not logged in, redirect to login
    if (!user && request.nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url))
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



