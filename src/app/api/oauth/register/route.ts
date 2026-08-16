// RFC 7591 — OAuth 2.0 Dynamic Client Registration.
//
// Public by design: MCP clients (claude.ai, Claude Code, inspectors) register
// themselves before starting the authorization flow. Registration grants
// nothing on its own — a token still requires a SUPER_ADMIN to sign in and
// approve the consent screen for that specific client. Rate-limited per IP.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateClientSecret, isAllowedRedirectUri, sha256 } from '@/lib/oauth/core'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
}

function err(error: string, description: string, status = 400) {
  return NextResponse.json({ error, error_description: description }, { status, headers: CORS })
}

const AUTH_METHODS = ['none', 'client_secret_post', 'client_secret_basic'] as const

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  const rl = checkRateLimit(`oauth:register:${ip}`, { limit: 20, windowSeconds: 3600 })
  if (!rl.allowed) return err('too_many_requests', 'Registration rate limit exceeded', 429)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return err('invalid_client_metadata', 'Body must be JSON')
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === 'string')
    : []
  if (redirectUris.length === 0) {
    return err('invalid_redirect_uri', 'redirect_uris is required')
  }
  if (redirectUris.length > 10) {
    return err('invalid_redirect_uri', 'Too many redirect_uris (max 10)')
  }
  for (const uri of redirectUris) {
    if (!isAllowedRedirectUri(uri)) {
      return err('invalid_redirect_uri', `Redirect URI not allowed: ${uri} (https required; http only for loopback)`)
    }
  }

  const grantTypes = Array.isArray(body.grant_types)
    ? body.grant_types.filter((g): g is string => typeof g === 'string')
    : ['authorization_code']
  for (const g of grantTypes) {
    if (g !== 'authorization_code' && g !== 'refresh_token') {
      return err('invalid_client_metadata', `Unsupported grant_type: ${g}`)
    }
  }
  const responseTypes = Array.isArray(body.response_types)
    ? body.response_types.filter((r): r is string => typeof r === 'string')
    : ['code']
  for (const r of responseTypes) {
    if (r !== 'code') return err('invalid_client_metadata', `Unsupported response_type: ${r}`)
  }

  const requestedAuth = typeof body.token_endpoint_auth_method === 'string' ? body.token_endpoint_auth_method : 'none'
  if (!(AUTH_METHODS as readonly string[]).includes(requestedAuth)) {
    return err('invalid_client_metadata', `Unsupported token_endpoint_auth_method: ${requestedAuth}`)
  }
  const authMethod = requestedAuth as (typeof AUTH_METHODS)[number]

  const clientName = typeof body.client_name === 'string' ? body.client_name.slice(0, 200) : null
  const clientUri = typeof body.client_uri === 'string' && isAllowedRedirectUri(body.client_uri) ? body.client_uri : null

  const clientSecret = authMethod === 'none' ? null : generateClientSecret()

  const client = await prisma.oAuthClient.create({
    data: {
      clientName,
      clientUri,
      redirectUris,
      tokenEndpointAuthMethod: authMethod,
      clientSecretHash: clientSecret ? sha256(clientSecret) : null,
      createdIp: ip,
    },
    select: { id: true, createdAt: true },
  })

  return NextResponse.json(
    {
      client_id: client.id,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
      client_name: clientName ?? undefined,
      client_uri: clientUri ?? undefined,
      redirect_uris: redirectUris,
      grant_types: grantTypes,
      response_types: responseTypes,
      token_endpoint_auth_method: authMethod,
    },
    { status: 201, headers: CORS },
  )
}
