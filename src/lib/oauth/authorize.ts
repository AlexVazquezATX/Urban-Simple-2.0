// Validation for the authorization request (shared by the consent page and
// the decision endpoint so both see exactly the same rules).
//
// Two classes of failure, per RFC 6749 §4.1.2.1:
//   - `fatal`: unknown client / bad redirect_uri → NEVER redirect; show an
//     error page (otherwise we'd become an open redirector).
//   - `redirect`: everything else → send the error back to the client's
//     redirect_uri with the state echoed.

import { prisma } from '@/lib/db'
import { OAUTH_SCOPE, redirectUriMatches } from '@/lib/oauth/core'

export interface AuthorizeParams {
  client_id?: string
  redirect_uri?: string
  response_type?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: string
  scope?: string
  resource?: string
}

export const AUTHORIZE_PARAM_KEYS: (keyof AuthorizeParams)[] = [
  'client_id',
  'redirect_uri',
  'response_type',
  'state',
  'code_challenge',
  'code_challenge_method',
  'scope',
  'resource',
]

export type AuthorizeValidation =
  | { kind: 'ok'; client: { id: string; clientName: string | null; clientUri: string | null }; params: Required<Pick<AuthorizeParams, 'client_id' | 'redirect_uri' | 'code_challenge'>> & AuthorizeParams }
  | { kind: 'fatal'; message: string }
  | { kind: 'redirect'; redirectUri: string; error: string; description: string; state?: string }

export async function validateAuthorizeRequest(p: AuthorizeParams): Promise<AuthorizeValidation> {
  if (!p.client_id) return { kind: 'fatal', message: 'Missing client_id.' }
  const client = await prisma.oAuthClient.findUnique({
    where: { id: p.client_id },
    select: { id: true, clientName: true, clientUri: true, redirectUris: true },
  })
  if (!client) return { kind: 'fatal', message: 'Unknown client. The application must register first.' }

  if (!p.redirect_uri) return { kind: 'fatal', message: 'Missing redirect_uri.' }
  if (!redirectUriMatches(client.redirectUris, p.redirect_uri)) {
    return { kind: 'fatal', message: 'redirect_uri is not registered for this client.' }
  }

  const redirectUri = p.redirect_uri
  const fail = (error: string, description: string): AuthorizeValidation => ({
    kind: 'redirect',
    redirectUri,
    error,
    description,
    state: p.state,
  })

  if (p.response_type !== 'code') return fail('unsupported_response_type', 'Only response_type=code is supported')
  if (!p.code_challenge) return fail('invalid_request', 'code_challenge is required (PKCE)')
  if ((p.code_challenge_method ?? 'plain') !== 'S256') {
    return fail('invalid_request', 'code_challenge_method must be S256')
  }
  if (!/^[A-Za-z0-9\-_]{43,128}$/.test(p.code_challenge)) {
    return fail('invalid_request', 'Malformed code_challenge')
  }
  if (p.scope) {
    const requested = p.scope.split(/\s+/).filter(Boolean)
    if (requested.some((s) => s !== OAUTH_SCOPE)) {
      return fail('invalid_scope', `Only the "${OAUTH_SCOPE}" scope is available`)
    }
  }

  return {
    kind: 'ok',
    client: { id: client.id, clientName: client.clientName, clientUri: client.clientUri },
    params: { ...p, client_id: client.id, redirect_uri: redirectUri, code_challenge: p.code_challenge },
  }
}

export function buildRedirect(redirectUri: string, query: Record<string, string | undefined>): string {
  const url = new URL(redirectUri)
  for (const [k, v] of Object.entries(query)) if (v !== undefined) url.searchParams.set(k, v)
  return url.toString()
}
