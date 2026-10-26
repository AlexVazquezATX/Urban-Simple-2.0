import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { portalSetPasswordUrl } from '@/lib/portal-access'

// POST /api/portal/forgot-password — public. Emails a password reset link
// that lands on /portal/set-password. Always answers with the same generic
// message so it can't be used to find out which emails have accounts.
//
// Body: { email }
const GENERIC = {
  success: true,
  message: 'If that email has portal access, a reset link is on its way. Check your inbox in a minute or two.',
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const body = await request.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  const byIp = checkRateLimit(`portal-forgot:ip:${ip}`, { limit: 10, windowSeconds: 15 * 60 })
  if (!byIp.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }
  // Per-address throttle answers generically so it doesn't confirm anything.
  const byEmail = checkRateLimit(`portal-forgot:email:${email}`, { limit: 3, windowSeconds: 15 * 60 })
  if (!byEmail.allowed) return NextResponse.json(GENERIC)

  try {
    // Only active portal users get a portal reset link; staff use /login.
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, role: 'CLIENT_USER', isActive: true },
      select: { email: true, authId: true },
    })
    if (user?.authId) {
      // Implicit flow (not PKCE) so the link works on any device, not only
      // the browser that asked for it.
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { flowType: 'implicit', persistSession: false, autoRefreshToken: false } }
      )
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: portalSetPasswordUrl(),
      })
      if (error) console.error('[portal/forgot-password] reset failed:', error.message)
    }
  } catch (err) {
    console.error('[portal/forgot-password] failed:', err)
  }

  return NextResponse.json(GENERIC)
}
