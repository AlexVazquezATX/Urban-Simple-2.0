import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only honor a same-origin absolute path (never an external URL).
  const rawNext = searchParams.get('next')
  const next =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.startsWith('/\\')
      ? rawNext
      : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Record the login so team rosters can show who has actually signed in.
      // Fire-and-forget; a failure here must never block the redirect.
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await prisma.user.updateMany({
            where: { authId: user.id },
            data: { lastLogin: new Date() },
          })
        }
      } catch {
        // ignore — login tracking is best-effort
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
