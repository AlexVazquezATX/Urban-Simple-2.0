import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { exchangeCodeForTokens, saveConnection } from '@/lib/qbo/client'

// GET /api/qbo/callback - Intuit redirects here after the user authorizes
export async function GET(request: NextRequest) {
  const redirectTo = (params: Record<string, string>) => {
    const url = new URL('/billing', request.url)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const response = NextResponse.redirect(url)
    response.cookies.delete('qbo_oauth_state')
    return response
  }

  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const realmId = searchParams.get('realmId')
    const state = searchParams.get('state')
    const expectedState = request.cookies.get('qbo_oauth_state')?.value

    if (!code || !realmId) {
      return redirectTo({ qbo: 'error', reason: 'missing_code_or_realm' })
    }
    if (!state || !expectedState || state !== expectedState) {
      return redirectTo({ qbo: 'error', reason: 'state_mismatch' })
    }

    const tokens = await exchangeCodeForTokens(code)
    await saveConnection({
      companyId: user.companyId,
      realmId,
      tokens,
      connectedById: user.id,
    })

    return redirectTo({ qbo: 'connected' })
  } catch (error) {
    console.error('QBO OAuth callback failed:', error)
    return redirectTo({ qbo: 'error', reason: 'token_exchange_failed' })
  }
}
