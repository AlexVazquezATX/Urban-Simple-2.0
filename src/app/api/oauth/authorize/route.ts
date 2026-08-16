// Consent decision endpoint — the POST target of /oauth/authorize's form.
// Cookie-authenticated (SUPER_ADMIN only), same-origin only. On approve it
// mints a single-use PKCE-bound authorization code and 302s back to the client.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { AUTH_CODE_TTL_SECONDS, OAUTH_SCOPE, generateAuthCode, sha256 } from '@/lib/oauth/core'
import { AUTHORIZE_PARAM_KEYS, buildRedirect, validateAuthorizeRequest, type AuthorizeParams } from '@/lib/oauth/authorize'

export async function POST(request: NextRequest) {
  // CSRF: the form lives on this origin; anything else is rejected outright.
  const origin = request.headers.get('origin')
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Cross-origin consent submission rejected' }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  if (user.realRole !== 'SUPER_ADMIN' || ('via' in user && user.via)) {
    return NextResponse.json({ error: 'Only a super-admin can authorize a connector' }, { status: 403 })
  }

  const form = await request.formData()
  const params: AuthorizeParams = {}
  for (const k of AUTHORIZE_PARAM_KEYS) {
    const v = form.get(k)
    if (typeof v === 'string' && v) params[k] = v
  }
  const decision = form.get('decision')

  const validation = await validateAuthorizeRequest(params)
  if (validation.kind === 'fatal') {
    return NextResponse.json({ error: validation.message }, { status: 400 })
  }
  if (validation.kind === 'redirect') {
    return NextResponse.redirect(
      buildRedirect(validation.redirectUri, {
        error: validation.error,
        error_description: validation.description,
        state: validation.state,
      }),
    )
  }

  const { params: p, client } = validation

  if (decision !== 'approve') {
    return NextResponse.redirect(
      buildRedirect(p.redirect_uri, {
        error: 'access_denied',
        error_description: 'The user denied the request',
        state: p.state,
      }),
    )
  }

  const code = generateAuthCode()
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: sha256(code),
      clientId: client.id,
      userId: user.id,
      redirectUri: p.redirect_uri,
      codeChallenge: p.code_challenge,
      codeChallengeMethod: 'S256',
      scope: p.scope?.trim() || OAUTH_SCOPE,
      resource: p.resource ?? null,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
    },
  })

  // Record the grant on the audit trail (who connected what, from where).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
  prisma.auditLog
    .create({
      data: {
        userId: user.id,
        action: 'OAUTH_GRANT',
        entityType: 'oauth_client',
        entityId: client.id,
        ipAddress: ip,
        userAgent: request.headers.get('user-agent'),
      },
    })
    .catch(() => {})

  return NextResponse.redirect(buildRedirect(p.redirect_uri, { code, state: p.state }), { status: 303 })
}
