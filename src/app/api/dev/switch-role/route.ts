import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  IMPERSONATE_ROLE_COOKIE,
  IMPERSONATE_CLIENT_COOKIE,
  IMPERSONABLE_ROLES,
  IMPERSONATION_GATE_EMAIL,
  isImpersonableRole,
} from '@/lib/impersonation'

// Cookie-based role impersonation. The previous version of this endpoint
// permanently mutated `users.role` in the database, which downgraded the
// owner account on every "switch" with no UI path back. This rewrite leaves
// the real role untouched and stores the override in HttpOnly cookies that
// `getCurrentUser` and the middleware honor.

const ONE_DAY_SECONDS = 60 * 60 * 24

/**
 * POST /api/dev/switch-role
 * Body: { role: 'SUPER_ADMIN'|'ADMIN'|'MANAGER'|'ASSOCIATE'|'CLIENT_USER',
 *         clientId?: string }
 *
 * - Requires real DB role of SUPER_ADMIN AND email === IMPERSONATION_GATE_EMAIL.
 * - For CLIENT_USER, a clientId is required so the portal can render that
 *   client's data instead of trying to find a non-existent ClientContact for
 *   the SUPER_ADMIN user.
 * - Setting role === 'SUPER_ADMIN' clears the override (back to "yourself").
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gate on the REAL role and email — never the (possibly impersonated) effective role.
  if (user.realRole !== 'SUPER_ADMIN' || user.email !== IMPERSONATION_GATE_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const role = (body.role as string | undefined) || ''
  const clientId = (body.clientId as string | undefined) || null

  if (!isImpersonableRole(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of ${IMPERSONABLE_ROLES.join(', ')}.` },
      { status: 400 }
    )
  }

  const c = await cookies()

  // Switching back to your real role just clears the override.
  if (role === 'SUPER_ADMIN') {
    c.delete(IMPERSONATE_ROLE_COOKIE)
    c.delete(IMPERSONATE_CLIENT_COOKIE)
    return NextResponse.json({ ok: true, role: 'SUPER_ADMIN', cleared: true })
  }

  // CLIENT_USER needs a target client so the portal pages have data to render.
  let resolvedClientId: string | null = null
  if (role === 'CLIENT_USER') {
    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId is required when impersonating CLIENT_USER' },
        { status: 400 }
      )
    }
    const client = await prisma.client.findFirst({
      where: { id: clientId, deletedAt: null },
      select: { id: true },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    resolvedClientId = client.id
  }

  c.set(IMPERSONATE_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_DAY_SECONDS,
  })
  if (resolvedClientId) {
    c.set(IMPERSONATE_CLIENT_COOKIE, resolvedClientId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: ONE_DAY_SECONDS,
    })
  } else {
    c.delete(IMPERSONATE_CLIENT_COOKIE)
  }

  return NextResponse.json({ ok: true, role, clientId: resolvedClientId })
}

/**
 * DELETE /api/dev/switch-role
 * Clear impersonation. Available to any user whose real role is SUPER_ADMIN —
 * if someone got into a stuck state we want them to be able to recover.
 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.realRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const c = await cookies()
  c.delete(IMPERSONATE_ROLE_COOKIE)
  c.delete(IMPERSONATE_CLIENT_COOKIE)
  return NextResponse.json({ ok: true, cleared: true })
}
