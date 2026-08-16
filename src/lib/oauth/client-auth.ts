// Client authentication for the token / revocation endpoints.
//
// Public clients (token_endpoint_auth_method = none) identify by client_id
// only — PKCE is what protects them. Confidential clients must present their
// secret via HTTP Basic or the request body (client_secret_post).

import { prisma } from '@/lib/db'
import { safeEqual, sha256 } from '@/lib/oauth/core'

export type TokenRequestParams = Record<string, string | undefined>

/** Parse form-urlencoded or JSON bodies into a flat string map. */
export async function parseTokenRequest(request: Request): Promise<TokenRequestParams> {
  const ct = request.headers.get('content-type') ?? ''
  const out: TokenRequestParams = {}
  if (ct.includes('application/json')) {
    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>
    for (const [k, v] of Object.entries(json)) if (typeof v === 'string') out[k] = v
    return out
  }
  const text = await request.text().catch(() => '')
  for (const [k, v] of new URLSearchParams(text)) out[k] = v
  return out
}

/** Pull client credentials from Basic auth or the body. */
export function extractClientCredentials(request: Request, params: TokenRequestParams) {
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8')
      const idx = decoded.indexOf(':')
      if (idx >= 0) {
        return {
          clientId: decodeURIComponent(decoded.slice(0, idx)),
          clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
          viaBasic: true,
        }
      }
    } catch {
      /* fall through */
    }
  }
  return { clientId: params.client_id, clientSecret: params.client_secret, viaBasic: false }
}

export interface OAuthClientRecord {
  id: string
  clientName: string | null
  redirectUris: string[]
  tokenEndpointAuthMethod: string
  clientSecretHash: string | null
}

export type ClientAuthResult =
  | { ok: true; client: OAuthClientRecord }
  | { ok: false; error: string; description: string }

/**
 * Resolve + authenticate the client. Returns { client } or { error }.
 */
export async function authenticateClient(request: Request, params: TokenRequestParams): Promise<ClientAuthResult> {
  const { clientId, clientSecret } = extractClientCredentials(request, params)
  if (!clientId) return { ok: false, error: 'invalid_client', description: 'client_id is required' }

  const client = await prisma.oAuthClient.findUnique({
    where: { id: clientId },
    select: { id: true, clientName: true, redirectUris: true, tokenEndpointAuthMethod: true, clientSecretHash: true },
  })
  if (!client) return { ok: false, error: 'invalid_client', description: 'Unknown client' }

  if (client.tokenEndpointAuthMethod !== 'none') {
    if (!clientSecret || !client.clientSecretHash || !safeEqual(sha256(clientSecret), client.clientSecretHash)) {
      return { ok: false, error: 'invalid_client', description: 'Client authentication failed' }
    }
  }
  return { ok: true, client }
}
