import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAuthorizeUrl, qboConfigured } from '@/lib/qbo/client'

// GET /api/qbo/connect - Start the QuickBooks OAuth flow (admin only)
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  if (!qboConfigured()) {
    return NextResponse.json(
      { error: 'QuickBooks is not configured. Set QBO_CLIENT_ID, QBO_CLIENT_SECRET and QBO_REDIRECT_URI.' },
      { status: 500 }
    )
  }

  const state = crypto.randomUUID()
  const response = NextResponse.redirect(getAuthorizeUrl(state))
  response.cookies.set('qbo_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })
  return response
}
