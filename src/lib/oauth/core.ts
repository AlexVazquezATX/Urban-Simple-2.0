// OAuth 2.1 authorization-server core: token formats, hashing, PKCE, issuer.
//
// Dependency-light on purpose (crypto only) so it can be imported from route
// handlers, the consent page, and api-key-verify without cycles.
//
// Token formats (all opaque; only SHA-256 hashes are stored):
//   access token   us_oat_<64 hex>   — presented as `Authorization: Bearer …`
//   refresh token  us_ort_<64 hex>
//   auth code      <64 hex>          — single-use, 10 min
//   client secret  us_ocs_<64 hex>   — only for confidential clients

import crypto from 'crypto'

export const OAUTH_ACCESS_TOKEN_PREFIX = 'us_oat_'
export const OAUTH_REFRESH_TOKEN_PREFIX = 'us_ort_'
export const OAUTH_CLIENT_SECRET_PREFIX = 'us_ocs_'

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 // 1h
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60 // 30d (rotated on use)
export const AUTH_CODE_TTL_SECONDS = 10 * 60 // 10m

// The single scope this server issues. Consent is restricted to SUPER_ADMIN,
// so a token = full backend access (the agent-scope model still applies per
// request via `OAuthToken.scopes`, which is set to the full grant).
export const OAUTH_SCOPE = 'mcp'
export const OAUTH_TOKEN_AGENT_SCOPES = ['*', 'backhaus']

export function randomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}
export function generateAccessToken(): string {
  return OAUTH_ACCESS_TOKEN_PREFIX + randomHex()
}
export function generateRefreshToken(): string {
  return OAUTH_REFRESH_TOKEN_PREFIX + randomHex()
}
export function generateClientSecret(): string {
  return OAUTH_CLIENT_SECRET_PREFIX + randomHex()
}
export function generateAuthCode(): string {
  return randomHex()
}

/** Constant-time string compare (both hex/ascii). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

/** PKCE S256: base64url(sha256(verifier)) must equal the stored challenge. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  // RFC 7636 §4.1: verifier is 43–128 chars of [A-Za-z0-9-._~]
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false
  const computed = crypto.createHash('sha256').update(verifier).digest('base64url')
  return safeEqual(computed, challenge)
}

/**
 * The issuer / public origin of this authorization server. Must be stable and
 * match what clients see, so it's the canonical `www` host in production (the
 * apex 307-redirects to www and clients drop Authorization on that hop).
 */
export function getIssuer(requestOrigin?: string | null): string {
  const configured = process.env.OAUTH_ISSUER
  const raw = (configured || requestOrigin || 'https://www.urbansimple.net').replace(/\/+$/, '')
  // Never advertise the apex: it 307s to www and clients drop credentials on
  // that hop. (Vercel normally redirects before the request reaches us, but
  // be defensive about a misconfigured OAUTH_ISSUER.)
  return raw.replace(/^https:\/\/urbansimple\.net$/, 'https://www.urbansimple.net')
}

export function oauthEndpoints(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    resource: `${issuer}/api/mcp`,
    protected_resource_metadata: `${issuer}/.well-known/oauth-protected-resource`,
  }
}

/**
 * Redirect URIs a client may register. HTTPS anywhere (claude.ai, etc.), and
 * plain HTTP only for loopback (local MCP clients such as Claude Code, the
 * MCP inspector). No fragments, no wildcards.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let u: URL
  try {
    u = new URL(uri)
  } catch {
    return false
  }
  if (u.hash) return false
  if (u.protocol === 'https:') return true
  if (u.protocol === 'http:') {
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]'
  }
  return false
}

/**
 * Exact-match a presented redirect_uri against the registered list. Loopback
 * URIs match regardless of port (RFC 8252 §7.3 — the client picks an ephemeral
 * port per run).
 */
export function redirectUriMatches(registered: string[], presented: string): boolean {
  if (registered.includes(presented)) return true
  let p: URL
  try {
    p = new URL(presented)
  } catch {
    return false
  }
  const isLoopback = p.protocol === 'http:' && (p.hostname === 'localhost' || p.hostname === '127.0.0.1' || p.hostname === '[::1]')
  if (!isLoopback) return false
  return registered.some((r) => {
    try {
      const ru = new URL(r)
      return ru.protocol === p.protocol && ru.hostname === p.hostname && ru.pathname === p.pathname
    } catch {
      return false
    }
  })
}
