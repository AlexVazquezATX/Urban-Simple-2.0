// OAuth 2.1 token endpoint.
//
//   grant_type=authorization_code  code + code_verifier (PKCE S256, mandatory)
//   grant_type=refresh_token       rotating refresh tokens (old one revoked)
//
// Access tokens are `us_oat_…` bearers accepted by the whole API surface via
// authenticateOAuthToken (src/lib/api-key-verify.ts).

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  OAUTH_CRM_READ_SCOPE,
  crmOAuthGrantValid,
  crmResource,
  getIssuer,
  oauthAgentScopes,
  parseOAuthScope,
  generateAccessToken,
  generateRefreshToken,
  sha256,
  verifyPkceS256,
} from '@/lib/oauth/core'
import { authenticateClient, parseTokenRequest } from '@/lib/oauth/client-auth'

const HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
}

function err(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: HEADERS })
}

async function issueTokens(args: {
  clientId: string; userId: string; scope: string; scopes: string[]; ip: string | null
  grantExpiresAt?: Date | null
}) {
  const now = Date.now()
  if (!crmOAuthGrantValid(args.scope, args.scopes, args.grantExpiresAt ?? null, now)) {
    return err('invalid_grant', 'Read-only consent has expired or is invalid; authorize again')
  }
  const refreshExpiresAt = args.scope === OAUTH_CRM_READ_SCOPE
    ? args.grantExpiresAt!
    : new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000)
  const accessExpiresAt = new Date(Math.min(now + ACCESS_TOKEN_TTL_SECONDS * 1000, refreshExpiresAt.getTime()))
  const accessToken = generateAccessToken()
  const refreshToken = generateRefreshToken()
  await prisma.oAuthToken.create({
    data: {
      accessTokenHash: sha256(accessToken),
      refreshTokenHash: sha256(refreshToken),
      clientId: args.clientId,
      userId: args.userId,
      scope: args.scope,
      scopes: args.scopes,
      accessExpiresAt,
      refreshExpiresAt,
      createdIp: args.ip,
    },
  })
  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.floor((accessExpiresAt.getTime() - now) / 1000),
      refresh_token: refreshToken,
      scope: args.scope,
    },
    { headers: HEADERS },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: HEADERS })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
  const rl = checkRateLimit(`oauth:token:${ip ?? 'unknown'}`, { limit: 60, windowSeconds: 60 })
  if (!rl.allowed) return err('too_many_requests', 'Token endpoint rate limit exceeded', 429)

  const params = await parseTokenRequest(request)
  const auth = await authenticateClient(request, params)
  if (!auth.ok) return err(auth.error, auth.description, 401)
  const client = auth.client

  switch (params.grant_type) {
    case 'authorization_code': {
      const { code, code_verifier: verifier, redirect_uri: redirectUri } = params
      if (!code) return err('invalid_request', 'code is required')
      if (!verifier) return err('invalid_request', 'code_verifier is required (PKCE)')

      const record = await prisma.oAuthAuthorizationCode.findUnique({
        where: { codeHash: sha256(code) },
      })
      if (!record) return err('invalid_grant', 'Unknown authorization code')
      if (record.clientId !== client.id) return err('invalid_grant', 'Code was issued to a different client')
      if (record.expiresAt <= new Date()) return err('invalid_grant', 'Authorization code expired')
      if (record.usedAt) {
        // Replay: RFC 6749 §4.1.2 says revoke everything derived from it.
        await prisma.oAuthToken.updateMany({
          where: { clientId: client.id, userId: record.userId, revokedAt: null, createdAt: { gte: record.createdAt } },
          data: { revokedAt: new Date() },
        })
        return err('invalid_grant', 'Authorization code already used')
      }
      // redirect_uri must match when it was used in the authorization request
      // (it always is here — we store it on the code).
      const scope = parseOAuthScope(record.scope)
      const scopes = scope ? oauthAgentScopes(scope) : null
      if (!scope || !scopes) return err('invalid_grant', 'Unsupported consent scope')
      if (params.scope !== undefined && parseOAuthScope(params.scope) !== scope) {
        return err('invalid_scope', 'Requested scope differs from consent')
      }
      const readOnly = scope === OAUTH_CRM_READ_SCOPE
      if (readOnly && (record.resource !== crmResource(getIssuer(request.nextUrl.origin)) || params.resource !== record.resource)) {
        return err('invalid_target', 'Read-only token requires its consented CRM resource')
      }
      if ((readOnly || redirectUri) && redirectUri !== record.redirectUri) {
        return err('invalid_grant', 'redirect_uri mismatch')
      }
      if (record.codeChallengeMethod !== 'S256' || !verifyPkceS256(verifier, record.codeChallenge)) {
        return err('invalid_grant', 'PKCE verification failed')
      }

      // Single use — atomically claim it (guards a race between two exchanges).
      const claimed = await prisma.oAuthAuthorizationCode.updateMany({
        where: { id: record.id, usedAt: null },
        data: { usedAt: new Date() },
      })
      if (claimed.count !== 1) return err('invalid_grant', 'Authorization code already used')

      const user = await prisma.user.findUnique({ where: { id: record.userId }, select: { isActive: true } })
      if (!user?.isActive) return err('invalid_grant', 'User is not active')

      prisma.oAuthClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
      return issueTokens({
        clientId: client.id, userId: record.userId, scope, scopes, ip,
        grantExpiresAt: readOnly ? new Date(record.createdAt.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000) : undefined,
      })
    }

    case 'refresh_token': {
      const refresh = params.refresh_token
      if (!refresh) return err('invalid_request', 'refresh_token is required')

      const existing = await prisma.oAuthToken.findUnique({
        where: { refreshTokenHash: sha256(refresh) },
      })
      if (!existing) return err('invalid_grant', 'Unknown refresh token')
      if (existing.clientId !== client.id) return err('invalid_grant', 'Refresh token was issued to a different client')
      if (existing.revokedAt) return err('invalid_grant', 'Refresh token revoked')
      if (existing.refreshExpiresAt && existing.refreshExpiresAt <= new Date()) {
        return err('invalid_grant', 'Refresh token expired')
      }

      const scope = parseOAuthScope(existing.scope)
      if (!scope || !crmOAuthGrantValid(scope, existing.scopes, existing.refreshExpiresAt)) {
        return err('invalid_grant', 'Read-only consent is invalid or expired')
      }
      if (params.scope !== undefined && parseOAuthScope(params.scope) !== scope) {
        return err('invalid_scope', 'Refresh cannot change the consented scope; authorize again')
      }
      if (scope === OAUTH_CRM_READ_SCOPE && params.resource !== crmResource(getIssuer(request.nextUrl.origin))) {
        return err('invalid_target', 'Read-only refresh requires its CRM resource')
      }

      const user = await prisma.user.findUnique({ where: { id: existing.userId }, select: { isActive: true } })
      if (!user?.isActive) return err('invalid_grant', 'User is not active')

      // Rotate: retire the old pair atomically, then mint a fresh one.
      const retired = await prisma.oAuthToken.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      if (retired.count !== 1) return err('invalid_grant', 'Refresh token already rotated')

      prisma.oAuthClient.update({ where: { id: client.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
      return issueTokens({
        clientId: client.id, userId: existing.userId, scope, scopes: [...existing.scopes], ip,
        grantExpiresAt: scope === OAUTH_CRM_READ_SCOPE ? existing.refreshExpiresAt : undefined,
      })
    }

    default:
      return err('unsupported_grant_type', `Unsupported grant_type: ${params.grant_type ?? '(missing)'}`)
  }
}
