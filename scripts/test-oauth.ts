// End-to-end test of the OAuth 2.1 authorization server + MCP resource server.
//
// Covers everything except the human click on the consent screen: it registers
// a client (DCR), reads discovery, mints an authorization code straight into
// the DB (exactly what /api/oauth/authorize does on Approve, bound to
// alex@urbansimple.net), then exchanges it with PKCE, calls /api/mcp with the
// access token, rotates the refresh token, checks replay detection, and revokes.
//
// Usage:
//   npx tsx scripts/test-oauth.ts                        # http://localhost:3000
//   npx tsx scripts/test-oauth.ts https://www.urbansimple.net
import { config } from 'dotenv'
import { resolve } from 'path'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'

config({ path: resolve(process.cwd(), '.env.local') })
config({ path: resolve(process.cwd(), '.env') })

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '')
const prisma = new PrismaClient()
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

let failures = 0
function check(label: string, cond: unknown, detail = '') {
  if (!cond) failures++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`)
}
async function json(res: Response) {
  const t = await res.text()
  try { return JSON.parse(t) } catch { return t }
}
async function mcp(token: string | null, body: unknown) {
  return fetch(`${base}/api/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
}
async function tokenReq(form: Record<string, string>) {
  const res = await fetch(`${base}/api/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  })
  return { status: res.status, body: await json(res) }
}

async function main() {
  console.log(`Testing OAuth against ${base}\n`)

  // ---- discovery ----
  const as = await json(await fetch(`${base}/.well-known/oauth-authorization-server`))
  check('AS metadata issuer', typeof as.issuer === 'string' && as.token_endpoint?.endsWith('/api/oauth/token'), as.issuer)
  check('AS metadata PKCE S256', Array.isArray(as.code_challenge_methods_supported) && as.code_challenge_methods_supported.includes('S256'))
  const pr = await json(await fetch(`${base}/.well-known/oauth-protected-resource`))
  check('PR metadata points at AS', Array.isArray(pr.authorization_servers) && pr.authorization_servers[0] === as.issuer, pr.resource)

  // ---- 401 hint on /api/mcp ----
  const unauth = await mcp(null, { jsonrpc: '2.0', id: 1, method: 'ping' })
  check('unauthenticated /api/mcp → 401', unauth.status === 401)
  check('WWW-Authenticate resource_metadata', (unauth.headers.get('www-authenticate') ?? '').includes('resource_metadata='), unauth.headers.get('www-authenticate') ?? '')

  // ---- DCR ----
  const redirectUri = 'https://claude.ai/api/mcp/auth_callback'
  const regRes = await fetch(`${base}/api/oauth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_name: 'oauth-e2e-test', redirect_uris: [redirectUri], token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }),
  })
  const reg = await json(regRes)
  check('DCR → 201 with client_id', regRes.status === 201 && typeof reg.client_id === 'string', reg.client_id)
  const clientId: string = reg.client_id

  const badReg = await fetch(`${base}/api/oauth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ redirect_uris: ['http://evil.example.com/cb'] }),
  })
  check('DCR rejects non-https redirect', badReg.status === 400)

  // ---- authorize validation (no cookie → must not leak a code) ----
  const verifier = crypto.randomBytes(48).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  const state = crypto.randomBytes(8).toString('hex')
  const authzUrl = `${base}/oauth/authorize?` + new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', state, code_challenge: challenge, code_challenge_method: 'S256', scope: 'mcp' })
  const authzRes = await fetch(authzUrl, { redirect: 'manual' })
  const loc = authzRes.headers.get('location') ?? ''
  check('authorize (no session) → bounces to /login?next=', authzRes.status >= 300 && authzRes.status < 400 && loc.includes('/login?next='), `${authzRes.status} ${loc.slice(0, 60)}`)

  const badAuthz = await fetch(`${base}/oauth/authorize?` + new URLSearchParams({ client_id: clientId, redirect_uri: 'https://attacker.example/cb', response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256' }), { redirect: 'manual' })
  check('authorize with unregistered redirect_uri → error page, no redirect', badAuthz.status === 200)

  const plainAuthz = await fetch(`${base}/oauth/authorize?` + new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', code_challenge: challenge, code_challenge_method: 'plain', state }), { redirect: 'manual' })
  const plainLoc = plainAuthz.headers.get('location') ?? ''
  check('authorize with plain PKCE → redirected error', plainLoc.startsWith(redirectUri) && plainLoc.includes('error=invalid_request') && plainLoc.includes(`state=${state}`), plainLoc.slice(0, 90))

  // ---- CSRF guard on the decision endpoint ----
  const csrf = await fetch(`${base}/api/oauth/authorize`, { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'decision=approve' })
  check('decision POST from foreign origin → 403', csrf.status === 403)

  // ---- mint a code as the consent screen would (bound to Alex) ----
  const alex = await prisma.user.findFirst({ where: { email: 'alex@urbansimple.net' }, select: { id: true, role: true } })
  check('alex@urbansimple.net exists and is SUPER_ADMIN', alex?.role === 'SUPER_ADMIN')
  if (!alex) throw new Error('no alex')
  const code = crypto.randomBytes(32).toString('hex')
  await prisma.oAuthAuthorizationCode.create({
    data: { codeHash: sha256(code), clientId, userId: alex.id, redirectUri, codeChallenge: challenge, codeChallengeMethod: 'S256', scope: 'mcp', expiresAt: new Date(Date.now() + 600_000) },
  })

  // ---- token exchange ----
  const wrongVerifier = await tokenReq({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: crypto.randomBytes(48).toString('base64url') })
  check('exchange with wrong verifier → invalid_grant', wrongVerifier.status === 400 && wrongVerifier.body.error === 'invalid_grant', wrongVerifier.body.error_description)

  const ex = await tokenReq({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier })
  check('exchange → access + refresh token', ex.status === 200 && ex.body.access_token?.startsWith('us_oat_') && ex.body.refresh_token?.startsWith('us_ort_'), `expires_in=${ex.body.expires_in}`)
  const access1: string = ex.body.access_token
  const refresh1: string = ex.body.refresh_token

  const replay = await tokenReq({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier })
  check('code replay → invalid_grant', replay.status === 400 && replay.body.error === 'invalid_grant')
  const replayKilled = await prisma.oAuthToken.findFirst({ where: { accessTokenHash: sha256(access1) }, select: { revokedAt: true } })
  check('code replay revokes tokens derived from it', !!replayKilled?.revokedAt)

  // Mint a fresh code for the rest of the run (previous tokens are now dead by design).
  const code2 = crypto.randomBytes(32).toString('hex')
  await prisma.oAuthAuthorizationCode.create({
    data: { codeHash: sha256(code2), clientId, userId: alex.id, redirectUri, codeChallenge: challenge, codeChallengeMethod: 'S256', scope: 'mcp', expiresAt: new Date(Date.now() + 600_000) },
  })
  const ex2 = await tokenReq({ grant_type: 'authorization_code', code: code2, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier })
  check('second exchange OK', ex2.status === 200)
  const access2: string = ex2.body.access_token
  const refresh2: string = ex2.body.refresh_token

  // ---- use the token on MCP ----
  const init = await json(await mcp(access2, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } } }))
  check('MCP initialize with OAuth token', init.result?.serverInfo?.name === 'urbansimple')
  const call = await json(await mcp(access2, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'api_request', arguments: { method: 'GET', path: '/api/users/me' } } }))
  const meText: string = call.result?.content?.[0]?.text ?? ''
  check('api_request as OAuth user → 200 /api/users/me', meText.startsWith('HTTP 200') && meText.includes('alex@urbansimple.net'), meText.slice(0, 70).replace(/\n/g, ' '))
  const bh = await json(await mcp(access2, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'api_request', arguments: { method: 'GET', path: '/api/admin/studio-clients/stats' } } }))
  check('BackHaus reachable with OAuth token', (bh.result?.content?.[0]?.text ?? '').startsWith('HTTP 200'))

  // ---- refresh rotation ----
  const rf = await tokenReq({ grant_type: 'refresh_token', refresh_token: refresh2, client_id: clientId })
  check('refresh → new pair', rf.status === 200 && rf.body.access_token && rf.body.access_token !== access2)
  const rfReplay = await tokenReq({ grant_type: 'refresh_token', refresh_token: refresh2, client_id: clientId })
  check('old refresh token rejected after rotation', rfReplay.status === 400)
  const oldAccess = await mcp(access2, { jsonrpc: '2.0', id: 4, method: 'ping' })
  check('old access token dead after rotation', oldAccess.status === 401)
  const access3: string = rf.body.access_token
  const okNew = await mcp(access3, { jsonrpc: '2.0', id: 5, method: 'ping' })
  check('new access token works', okNew.status === 200)

  // ---- wrong client can't use the refresh token ----
  const otherReg = await json(await fetch(`${base}/api/oauth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'other', redirect_uris: [redirectUri] }) }))
  const cross = await tokenReq({ grant_type: 'refresh_token', refresh_token: rf.body.refresh_token, client_id: otherReg.client_id })
  check('refresh token bound to its client', cross.status === 400)

  // ---- revoke ----
  const rv = await fetch(`${base}/api/oauth/revoke`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: access3, client_id: clientId }).toString() })
  check('revoke → 200', rv.status === 200)
  const afterRevoke = await mcp(access3, { jsonrpc: '2.0', id: 6, method: 'ping' })
  check('revoked token → 401', afterRevoke.status === 401)

  // ---- audit trail sanity ----
  const audit = await prisma.auditLog.count({ where: { userId: alex.id, entityType: 'agent_api', entityId: '/api/mcp' } })
  check('MCP envelope NOT audit-logged (inner calls only)', audit === 0, `envelope rows=${audit}`)

  // ---- cleanup test clients (cascades codes/tokens) ----
  await prisma.oAuthClient.deleteMany({ where: { id: { in: [clientId, otherReg.client_id] } } })

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`)
  process.exitCode = failures === 0 ? 0 : 1
}

main()
  .catch((e) => { console.error('test-oauth crashed:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
