import { test, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { setTimeout as nodeSetTimeout } from 'node:timers'
import { NextRequest } from 'next/server'
import { prisma } from '../../src/lib/db'
import { validateAuthorizeRequest } from '../../src/lib/oauth/authorize'
import { consentDecision } from '../../src/lib/oauth/consent'
import { POST as tokenPost } from '../../src/app/api/oauth/token/route'
import { authenticateOAuthToken } from '../../src/lib/api-key-verify'
import { authorizationServerMetadata, protectedResourceMetadata } from '../../src/lib/oauth/metadata'
import { mcpGet, serveMcp } from '../../src/lib/mcp/server'
import { agentRequestAllowed } from '../../src/lib/agent-scopes'
import {
  ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, crmResource, isCrmReadGrant,
  oauthAgentScopes, parseOAuthScope, sha256, verifyPkceS256,
} from '../../src/lib/oauth/core'

// Entirely offline: route controllers use in-memory Prisma doubles, and all
// unhandled DB requests / outbound HTTP throw. Tokens exist only in test memory.
const origin = 'https://crm.example.invalid'
const resource = crmResource(origin)
const redirectUri = 'https://client.example.invalid/callback'
const verifier = 'v'.repeat(64)
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
const codeText = 'offline-authorization-code'
const user = { id: 'user-test', realRole: 'SUPER_ADMIN' }
const client = { id: 'client-test', clientName: 'Offline client', clientUri: null,
  redirectUris: [redirectUri], tokenEndpointAuthMethod: 'none', clientSecretHash: null }
type Code = { id: string; codeHash: string; clientId: string; userId: string; redirectUri: string;
  codeChallenge: string; codeChallengeMethod: string; scope: string; resource: string | null;
  expiresAt: Date; usedAt: Date | null; createdAt: Date }
type Token = { id: string; accessTokenHash: string; refreshTokenHash: string; clientId: string; userId: string;
  scope: string; scopes: string[]; accessExpiresAt: Date; refreshExpiresAt: Date | null; revokedAt: Date | null }
let code: Code
let tokens: Token[]
let activeUser: boolean
let codeClaimed: boolean
let refreshClaimed: boolean
let sequence = 0
let writes: Array<{ model: string; data: Record<string, unknown> }>
let outbound: Array<{ url: string; init: RequestInit | undefined }>
const restorers: Array<() => void> = []

function stub(target: object, key: string, value: unknown) {
  const prior = Reflect.get(target, key)
  Reflect.set(target, key, value)
  restorers.push(() => { Reflect.set(target, key, prior) })
}
beforeEach(() => {
  // Rate-limit cleanup is a five-minute background timer, not test work.
  mock.method(globalThis, 'setTimeout', (callback: () => void, delay?: number, ...args: unknown[]) => {
    const timer = nodeSetTimeout(callback, delay, ...args)
    if (delay === 300_000) (timer as unknown as NodeJS.Timeout).unref()
    return timer
  })
  sequence++
  tokens = []; writes = []; outbound = []; activeUser = true; codeClaimed = true; refreshClaimed = true
  code = { id: 'code-test', codeHash: sha256(codeText), clientId: client.id, userId: user.id, redirectUri,
    codeChallenge: challenge, codeChallengeMethod: 'S256', scope: 'crm:read', resource,
    createdAt: new Date(), expiresAt: new Date(Date.now() + 600_000), usedAt: null }
  stub(prisma, '_request', () => { throw new Error('Unstubbed database access forbidden') })
  stub(prisma.oAuthClient, 'findUnique', async ({ where }: { where: { id: string } }) => where.id === client.id ? client : null)
  stub(prisma.oAuthClient, 'update', async () => client)
  stub(prisma.oAuthAuthorizationCode, 'findUnique', async ({ where }: { where: { codeHash: string } }) => where.codeHash === code.codeHash ? code : null)
  stub(prisma.oAuthAuthorizationCode, 'create', async ({ data }: { data: Record<string, unknown> }) => {
    writes.push({ model: 'code', data }); return { ...data, id: 'new-code' }
  })
  stub(prisma.oAuthAuthorizationCode, 'updateMany', async () => {
    if (!codeClaimed || code.usedAt) return { count: 0 }
    code.usedAt = new Date(); return { count: 1 }
  })
  stub(prisma.oAuthToken, 'findUnique', async ({ where }: { where: { accessTokenHash?: string; refreshTokenHash?: string } }) =>
    tokens.find(t => where.accessTokenHash ? t.accessTokenHash === where.accessTokenHash : t.refreshTokenHash === where.refreshTokenHash) ?? null)
  stub(prisma.oAuthToken, 'create', async ({ data }: { data: Record<string, unknown> }) => {
    writes.push({ model: 'token', data }); const row = { ...data, id: `token-${sequence}-${tokens.length}`, revokedAt: null } as Token
    tokens.push(row); return row
  })
  stub(prisma.oAuthToken, 'updateMany', async ({ where, data }: { where: { id?: string }; data: { revokedAt: Date } }) => {
    if (!refreshClaimed) return { count: 0 }
    const targets = tokens.filter(t => !t.revokedAt && (!where.id || t.id === where.id))
    for (const target of targets) target.revokedAt = data.revokedAt
    return { count: targets.length }
  })
  stub(prisma.oAuthToken, 'update', async () => ({}))
  stub(prisma.user, 'findUnique', async () => ({ id: user.id, isActive: activeUser, role: 'SUPER_ADMIN', companyId: 'company-test' }))
  stub(prisma.auditLog, 'create', async ({ data }: { data: Record<string, unknown> }) => { writes.push({ model: 'audit', data }); return data })
  mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    outbound.push({ url: String(url), init }); throw new Error('Outbound HTTP forbidden')
  })
})
afterEach(() => { mock.restoreAll(); for (const restore of restorers.reverse()) restore(); restorers.length = 0 })

function authorizeParams(scope?: string) {
  return { client_id: client.id, redirect_uri: redirectUri, response_type: 'code', state: 'state-test',
    code_challenge: challenge, code_challenge_method: 'S256', resource, ...(scope === undefined ? {} : { scope }) }
}
function tokenRequest(params: Record<string, string>) {
  return new NextRequest(`${origin}/api/oauth/token`, { method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-forwarded-for': `192.0.2.${sequence}` },
    body: new URLSearchParams({ client_id: client.id, ...params }) })
}
async function exchange(extra: Record<string, string> = {}) {
  const response = await tokenPost(tokenRequest({ grant_type: 'authorization_code', code: codeText,
    code_verifier: verifier, redirect_uri: redirectUri, resource, ...extra }))
  return { response, body: await response.json() }
}
async function refresh(raw: string, extra: Record<string, string> = {}) {
  const response = await tokenPost(tokenRequest({ grant_type: 'refresh_token', refresh_token: raw, resource, ...extra }))
  return { response, body: await response.json() }
}
function consentRequest(params = authorizeParams('crm:read'), decision = 'approve', requestOrigin = origin) {
  return new NextRequest(`${origin}/api/oauth/authorize`, { method: 'POST',
    headers: { origin: requestOrigin, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, decision }) })
}
function mcpRequest(method: string, params: Record<string, unknown> = {}, path = '/api/mcp/crm', bearer = 'us_oat_offline') {
  return new NextRequest(`${origin}${path}`, { method: 'POST', headers: { authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })
}

test('scope parser accepts exactly one policy; never combines limited and wildcard', () => {
  assert.equal(parseOAuthScope(), 'mcp')
  assert.equal(parseOAuthScope(' crm:read crm:read '), 'crm:read')
  for (const scope of ['', '*', 'backhaus', 'mcp crm:read', 'crm:read financials']) assert.equal(parseOAuthScope(scope), null)
  assert.deepEqual(oauthAgentScopes('crm:read'), ['crm:read'])
  assert.deepEqual(oauthAgentScopes('mcp'), ['*', 'backhaus'])
  assert.equal(isCrmReadGrant(['crm:read', '*']), false)
})
test('discovery separates legacy full and new read-only resources, advertises S256', () => {
  const auth = authorizationServerMetadata(new NextRequest(`${origin}/.well-known/oauth-authorization-server`))
  assert.deepEqual(auth.scopes_supported, ['mcp', 'crm:read'])
  assert.deepEqual(auth.code_challenge_methods_supported, ['S256'])
  const narrow = protectedResourceMetadata(new NextRequest(`${origin}/.well-known/oauth-protected-resource/api/mcp/crm`))
  assert.equal(narrow.resource, resource); assert.deepEqual(narrow.scopes_supported, ['crm:read'])
  const broad = protectedResourceMetadata(new NextRequest(`${origin}/.well-known/oauth-protected-resource`))
  assert.deepEqual(broad.scopes_supported, ['mcp']); assert.equal(broad.resource, `${origin}/api/mcp`)
})
test('CRM resource defaults only to crm:read, while omitted legacy scope still defaults to mcp', async () => {
  const narrow = await validateAuthorizeRequest(authorizeParams(), origin)
  assert.equal(narrow.kind, 'ok'); if (narrow.kind === 'ok') assert.equal(narrow.params.scope, 'crm:read')
  const legacy = await validateAuthorizeRequest({ ...authorizeParams(), resource: undefined }, origin)
  assert.equal(legacy.kind, 'ok'); if (legacy.kind === 'ok') assert.equal(legacy.params.scope, 'mcp')
})
test('authorization rejects mixed/wildcard scope and full scope at CRM resource', async () => {
  for (const scope of ['*', 'backhaus', 'mcp crm:read', 'mcp']) {
    const result = await validateAuthorizeRequest(authorizeParams(scope), origin)
    assert.equal(result.kind, 'redirect'); if (result.kind === 'redirect') assert.equal(result.error, 'invalid_scope')
  }
})
test('narrow authorization rejects absent/foreign resource and unregistered redirect without open redirect', async () => {
  for (const target of [undefined, `${origin}/api/mcp`, 'https://other.example.invalid/api/mcp/crm']) {
    const result = await validateAuthorizeRequest({ ...authorizeParams('crm:read'), resource: target }, origin)
    assert.equal(result.kind, 'redirect'); if (result.kind === 'redirect') assert.equal(result.error, 'invalid_target')
  }
  assert.equal((await validateAuthorizeRequest({ ...authorizeParams('crm:read'), redirect_uri: 'https://evil.example.invalid' }, origin)).kind, 'fatal')
  assert.equal((await validateAuthorizeRequest({ ...authorizeParams('crm:read'), client_id: 'unknown' }, origin)).kind, 'fatal')
})
test('PKCE is required, S256 only; verifiers must match and respect RFC bounds', async () => {
  for (const override of [{ code_challenge: undefined }, { code_challenge_method: 'plain' }, { code_challenge: 'bad' }]) {
    assert.equal((await validateAuthorizeRequest({ ...authorizeParams('crm:read'), ...override }, origin)).kind, 'redirect')
  }
  assert.equal(verifyPkceS256(verifier, challenge), true)
  for (const invalid of ['short', 'x'.repeat(129), ' '.repeat(64), 'z'.repeat(64)]) assert.equal(verifyPkceS256(invalid, challenge), false)
})
test('consent rejects cross-origin, non-admin and bearer actors without writing a grant', async () => {
  assert.equal((await consentDecision(consentRequest(undefined, 'approve', 'https://evil.example.invalid'), user)).status, 403)
  assert.equal((await consentDecision(consentRequest(), { ...user, realRole: 'ADMIN' })).status, 403)
  assert.equal((await consentDecision(consentRequest(), { ...user, via: 'oauth' })).status, 403)
  assert.equal(writes.length, 0)
})
test('consent denial and scope forgery do not create codes; state is preserved', async () => {
  const denied = await consentDecision(consentRequest(undefined, 'deny'), user)
  assert.equal(new URL(denied.headers.get('location')!).searchParams.get('error'), 'access_denied')
  assert.equal(new URL(denied.headers.get('location')!).searchParams.get('state'), 'state-test')
  const forged = await consentDecision(consentRequest(authorizeParams('mcp crm:read')), user)
  assert.equal(new URL(forged.headers.get('location')!).searchParams.get('error'), 'invalid_scope')
  assert.equal(writes.length, 0)
})
test('consent persists normalized narrow scope, resource, PKCE and audit attribution', async () => {
  const response = await consentDecision(consentRequest(authorizeParams(' crm:read crm:read ')), user)
  assert.equal(response.status, 303)
  assert.deepEqual(writes.map(w => w.model), ['code', 'audit'])
  assert.equal(writes[0].data.scope, 'crm:read'); assert.equal(writes[0].data.resource, resource)
  assert.equal(writes[0].data.codeChallengeMethod, 'S256')
  assert.deepEqual(writes[1].data.newValues, { scope: 'crm:read', resource })
  assert.equal(writes[0].data.codeHash, sha256(new URL(response.headers.get('location')!).searchParams.get('code')!))
})
test('code exchange issues exactly crm:read, stores only hashes, fixes deadline at consent +30d', async () => {
  const { response, body } = await exchange()
  assert.equal(response.status, 200); assert.equal(body.scope, 'crm:read')
  assert.deepEqual(tokens[0].scopes, ['crm:read'])
  assert.equal(tokens[0].refreshExpiresAt!.getTime(), code.createdAt.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000)
  assert.equal(tokens[0].accessTokenHash, sha256(body.access_token))
  assert.equal(tokens[0].refreshTokenHash, sha256(body.refresh_token))
  assert.equal(body.expires_in, ACCESS_TOKEN_TTL_SECONDS)
  assert.ok(code.usedAt); assert.equal(outbound.length, 0)
})
test('code exchange denies wrong client, missing/wrong redirect and resource, or changed scope', async () => {
  const overrides: Array<Record<string, string>> = [{ client_id: 'unknown' }, { redirect_uri: '' }, { redirect_uri: 'https://evil.example.invalid' },
    { resource: '' }, { resource: `${origin}/api/mcp` }, { scope: 'mcp' }]
  for (const override of overrides) {
    const { response } = await exchange(override)
    assert.notEqual(response.status, 200); assert.equal(tokens.length, 0); assert.equal(code.usedAt, null)
  }
  code.clientId = 'other-client'; assert.equal((await exchange()).body.error, 'invalid_grant')
})
test('code exchange denies invalid PKCE, expired codes, inactive users and failed atomic claim', async () => {
  assert.equal((await exchange({ code_verifier: 'wrong' })).body.error, 'invalid_grant')
  code.expiresAt = new Date(Date.now() - 1); assert.equal((await exchange()).body.error, 'invalid_grant')
  code.expiresAt = new Date(Date.now() + 60_000); codeClaimed = false
  assert.equal((await exchange()).body.error, 'invalid_grant'); assert.equal(tokens.length, 0)
  codeClaimed = true; activeUser = false
  assert.equal((await exchange()).body.error, 'invalid_grant'); assert.equal(tokens.length, 0)
})
test('confidential client authentication is required before exchanging a consent code', async () => {
  const secret = 'offline-client-secret'
  stub(prisma.oAuthClient, 'findUnique', async () => ({ ...client, tokenEndpointAuthMethod: 'client_secret_post', clientSecretHash: sha256(secret) }))
  assert.equal((await exchange()).response.status, 401)
  assert.equal((await exchange({ client_secret: 'wrong-secret' })).response.status, 401)
  assert.equal(code.usedAt, null); assert.equal(tokens.length, 0)
  assert.equal((await exchange({ client_secret: secret })).response.status, 200)
})
test('confidential client secret remains required on refresh, with no rotation on authentication failure', async () => {
  const initial = await exchange()
  stub(prisma.oAuthClient, 'findUnique', async () => ({ ...client, tokenEndpointAuthMethod: 'client_secret_basic', clientSecretHash: sha256('offline-secret') }))
  const rejected = await refresh(initial.body.refresh_token)
  assert.equal(rejected.response.status, 401); assert.equal(tokens[0].revokedAt, null); assert.equal(tokens.length, 1)
  const request = tokenRequest({ grant_type: 'refresh_token', refresh_token: initial.body.refresh_token, resource })
  request.headers.set('authorization', `Basic ${Buffer.from(`${client.id}:offline-secret`).toString('base64')}`)
  assert.equal((await tokenPost(request)).status, 200)
})
test('authorization-code replay revokes derived credentials instead of issuing again', async () => {
  await exchange()
  assert.equal((await exchange()).body.error, 'invalid_grant')
  assert.equal(tokens.length, 1); assert.ok(tokens[0].revokedAt)
})
test('legacy mcp code exchange retains broad grant and accepts the existing optional resource/redirect behavior', async () => {
  code.scope = 'mcp'; code.resource = null
  const { response, body } = await exchange({ redirect_uri: '', resource: '' })
  assert.equal(response.status, 200); assert.equal(body.scope, 'mcp')
  assert.deepEqual(tokens[0].scopes, ['*', 'backhaus'])
})
test('refresh rotates once, preserving exact grant and original deadline across repeated rotations', async () => {
  const initial = await exchange(); const deadline = tokens[0].refreshExpiresAt!.getTime()
  const next = await refresh(initial.body.refresh_token)
  assert.equal(next.response.status, 200); assert.ok(tokens[0].revokedAt)
  assert.deepEqual(tokens[1].scopes, ['crm:read']); assert.equal(tokens[1].refreshExpiresAt!.getTime(), deadline)
  const again = await refresh(next.body.refresh_token)
  assert.equal(again.response.status, 200); assert.equal(tokens[2].refreshExpiresAt!.getTime(), deadline)
  assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant')
})
test('refresh rejects scope escalation, mixed scope and wrong audience without retiring valid grant', async () => {
  const initial = await exchange()
  const overrides: Array<Record<string, string>> = [{ scope: 'mcp' }, { scope: 'mcp crm:read' }, { scope: '*' }, { resource: '' }, { resource: 'https://foreign.example.invalid' }]
  for (const override of overrides) {
    const denied = await refresh(initial.body.refresh_token, override)
    assert.notEqual(denied.response.status, 200); assert.equal(tokens.length, 1); assert.equal(tokens[0].revokedAt, null)
  }
})
test('refresh denies mismatched client, inactive user, expiry, missing deadline and failed atomic rotation', async () => {
  const initial = await exchange()
  tokens[0].clientId = 'different'; assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant')
  tokens[0].clientId = client.id; activeUser = false
  assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant'); activeUser = true
  tokens[0].refreshExpiresAt = null; assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant')
  tokens[0].refreshExpiresAt = new Date(Date.now() - 1); assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant')
  tokens[0].refreshExpiresAt = new Date(Date.now() + 60_000); refreshClaimed = false
  assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant'); assert.equal(tokens.length, 1)
})
test('refresh refuses a crm:read record contaminated with wildcard rather than expanding privileges', async () => {
  const initial = await exchange(); tokens[0].scopes = ['crm:read', '*', 'backhaus']
  assert.equal((await refresh(initial.body.refresh_token)).body.error, 'invalid_grant')
  assert.equal(tokens.length, 1)
})
test('final access token is capped to narrow grant deadline; refresh cannot extend consent', async () => {
  const initial = await exchange(); const deadline = new Date(Date.now() + 35_000)
  tokens[0].refreshExpiresAt = deadline
  const next = await refresh(initial.body.refresh_token)
  assert.equal(next.response.status, 200); assert.ok(next.body.expires_in <= 35)
  assert.equal(tokens[1].accessExpiresAt.getTime(), deadline.getTime())
  assert.equal(tokens[1].refreshExpiresAt!.getTime(), deadline.getTime())
})
test('legacy refresh preserves stored agent scopes and rolling expiry instead of upgrading to wildcard', async () => {
  code.scope = 'mcp'; code.resource = null
  const initial = await exchange(); tokens[0].scopes = ['*']; tokens[0].refreshExpiresAt = new Date(Date.now() + 60_000)
  const next = await refresh(initial.body.refresh_token, { resource: '' })
  assert.equal(next.response.status, 200); assert.deepEqual(tokens[1].scopes, ['*'])
  assert.ok(tokens[1].refreshExpiresAt!.getTime() > Date.now() + 29 * 86400_000)
})
test('OAuth bearer enforces narrow method/path context and preserves company identity', async () => {
  const initial = await exchange(); const bearer = `Bearer ${initial.body.access_token}`
  const authenticated = await authenticateOAuthToken(bearer, null, { path: '/api/growth/prospects', method: 'GET' })
  assert.equal(authenticated?.companyId, 'company-test'); assert.deepEqual(authenticated?.apiKeyScopes, ['crm:read'])
  for (const ctx of [{}, { path: '/api/growth/prospects', method: 'POST' }, { path: '/api/growth/prospects/id/activities', method: 'POST' },
    { path: '/api/users', method: 'GET' }, { path: '/api/invoices', method: 'GET' }, { path: '/api/studio', method: 'GET' }]) {
    assert.equal(await authenticateOAuthToken(bearer, null, ctx), null)
  }
})
test('OAuth bearer denies revoked/expired/malformed narrow grants even when access token time remains', async () => {
  const initial = await exchange(); const bearer = `Bearer ${initial.body.access_token}`
  const ctx = { path: '/api/mcp/crm', method: 'POST' }
  tokens[0].revokedAt = new Date(); assert.equal(await authenticateOAuthToken(bearer, null, ctx), null)
  tokens[0].revokedAt = null; tokens[0].refreshExpiresAt = new Date(Date.now() - 1)
  assert.equal(await authenticateOAuthToken(bearer, null, ctx), null)
  tokens[0].refreshExpiresAt = new Date(Date.now() + 60_000); tokens[0].scopes = ['*', 'backhaus']
  assert.equal(await authenticateOAuthToken(bearer, null, ctx), null)
  tokens[0].scopes = ['crm:read']; tokens[0].accessExpiresAt = new Date(Date.now() - 1)
  assert.equal(await authenticateOAuthToken(bearer, null, ctx), null)
})
test('CRM MCP discovery challenges unauthenticated users and rejects broad credentials', async () => {
  const challengeResponse = await mcpGet(new NextRequest(resource))
  assert.equal(challengeResponse.status, 401)
  assert.ok(challengeResponse.headers.get('www-authenticate')!.includes('/.well-known/oauth-protected-resource/api/mcp/crm'))
  assert.equal((await serveMcp(mcpRequest('initialize'), null)).status, 401)
  assert.equal((await serveMcp(mcpRequest('initialize'), { via: 'oauth', apiKeyScopes: ['*', 'backhaus'] })).status, 403)
})
test('narrow MCP initialize/tools describe only CRM reads and do not claim SUPER_ADMIN/full access', async () => {
  const identity = { via: 'oauth', apiKeyScopes: ['crm:read'] }
  const initialized = await (await serveMcp(mcpRequest('initialize'), identity)).json()
  assert.match(initialized.result.instructions, /read-only/); assert.doesNotMatch(initialized.result.instructions, /SUPER_ADMIN/)
  const listed = await (await serveMcp(mcpRequest('tools/list'), identity)).json()
  assert.deepEqual(listed.result.tools.map((t: { name: string }) => t.name), ['list_endpoints', 'describe_endpoint', 'api_request'])
  assert.deepEqual(listed.result.tools[2].inputSchema.properties.method.enum, ['GET'])
})
test('narrow MCP catalog hides unrelated routes, mutation descriptions and business playbooks', async () => {
  const identity = { via: 'oauth', apiKeyScopes: ['crm:read'] }
  const list = await (await serveMcp(mcpRequest('tools/call', { name: 'list_endpoints' }), identity)).json()
  const text = list.result.content[0].text
  assert.match(text, /\/api\/growth\/prospects/); assert.doesNotMatch(text, /\/api\/(invoices|users\s|oauth|studio)/)
  assert.doesNotMatch(text, /POST|PATCH|DELETE/)
  for (const args of [{ name: 'describe_endpoint', arguments: { path: '/api/invoices' } }, { name: 'playbooks' }]) {
    const result = await (await serveMcp(mcpRequest('tools/call', args), identity)).json()
    assert.equal(result.result.isError, true)
  }
})
test('issued OAuth bearer reaches allowed MCP GET with original credential; all denied calls stop before fetch', async () => {
  const initial = await exchange(); const bearer = initial.body.access_token
  const auditsBefore = writes.filter(w => w.model === 'audit').length
  const identity = await authenticateOAuthToken(`Bearer ${bearer}`, null, { path: '/api/mcp/crm', method: 'POST' })
  assert.ok(identity)
  assert.equal(writes.filter(w => w.model === 'audit').length, auditsBefore, 'Read envelopes must not be logged as mutations')
  mock.method(globalThis, 'fetch', async (url: string | URL | Request, init?: RequestInit) => {
    outbound.push({ url: String(url), init }); return new Response('{"prospects":[]}', { status: 200 })
  })
  const allowed = await (await serveMcp(mcpRequest('tools/call', { name: 'api_request', arguments: { method: 'GET', path: '/api/growth/prospects' } }, undefined, bearer), identity)).json()
  assert.equal(allowed.result.isError, false); assert.equal(outbound.length, 1)
  assert.equal((outbound[0].init!.headers as Record<string, string>).authorization, `Bearer ${bearer}`)
  assert.equal(outbound[0].init!.redirect, 'error')
  for (const [method, path] of [['POST', '/api/leads'], ['PATCH', '/api/growth/prospects/id'], ['POST', '/api/growth/lead-deliveries'],
    ['GET', '/api/users'], ['GET', '/api/invoices'], ['GET', '/api/studio'], ['GET', '/api/growth/prospects/../invoices'],
    ['GET', '/api/growth/prospects/%2e%2e/invoices'], ['GET', '//evil.example.invalid/api/growth/prospects']]) {
    const denied = await (await serveMcp(mcpRequest('tools/call', { name: 'api_request', arguments: { method, path } }), identity)).json()
    assert.equal(denied.result.isError, true, `${method} ${path}`)
  }
  assert.equal(outbound.length, 1)
})
test('legacy full MCP resource keeps all tools and broad API policy', async () => {
  const identity = { via: 'oauth', apiKeyScopes: ['*', 'backhaus'] }
  const listed = await (await serveMcp(mcpRequest('tools/list', {}, '/api/mcp'), identity)).json()
  assert.equal(listed.result.tools.length, 4)
  assert.equal(agentRequestAllowed(identity.apiKeyScopes, '/api/invoices', 'POST'), true)
  assert.equal(agentRequestAllowed(identity.apiKeyScopes, '/api/studio', 'GET'), true)
})
