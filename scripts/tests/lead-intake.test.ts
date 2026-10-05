import { test, beforeEach, afterEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { prisma } from '../../src/lib/db'
import { leadFingerprint } from '../../src/lib/leads/intake'
import { POST } from '../../src/app/api/leads/route'
import { GET as cronGet } from '../../src/app/api/cron/lead-deliveries/route'
import { buildLeadEmail, sendLeadEmail } from '../../src/lib/leads/email'
import { deliveryFailure, drainLeadDeliveries, SAFE_RETRY_WINDOW_MS } from '../../src/lib/leads/delivery'
import { agentRequestAllowed } from '../../src/lib/agent-scopes'
import type { LeadPayload } from '../../src/lib/leads/schema'

const submissionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const payload: LeadPayload = {
  source: 'urbansimple.net/walkthrough', submitted_at: '2026-10-05T16:00:00Z',
  name: 'Test Contact', business_name: 'TEST ONLY Cafe', location: 'Austin 78701',
  email: 'test@example.invalid', business_type: 'restaurant',
  utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'austin-test',
}
const input = { ...payload, submission_id: submissionId }
const requests: unknown[] = []
const originalTransaction = prisma.$transaction
const originalQuery = prisma.$queryRaw
const originalDeliveryFind = prisma.leadDelivery.findUniqueOrThrow
const originalDeliveryUpdate = prisma.leadDelivery.updateMany
let writes: Array<{ model: string; data: Record<string, unknown> }> = []
type Receipt = { id: string; companyId: string; payloadHash: string }
let prior: Receipt | null = null
let recent: Receipt | null = null
let failOutbox = false
let companies = [{ id: 'company-test' }]

// A transaction double verifies that the route never succeeds after any write
// fails and that all CRM/receipt/job writes share the transaction boundary.
const tx = {
  $executeRaw: async () => 1,
  company: { findMany: async () => companies },
  branch: { findMany: async () => [{ id: 'austin-test' }] },
  user: { findFirst: async () => ({ id: 'owner-test' }) },
  prospect: { create: async ({ data }: { data: Record<string, unknown> }) => {
    writes.push({ model: 'prospect', data }); return { id: 'prospect-test' }
  } },
  leadIntake: {
    findUnique: async () => prior,
    findFirst: async () => recent,
    create: async ({ data }: { data: Record<string, unknown> }) => {
      if (failOutbox) throw new Error('simulated outbox database failure')
      writes.push({ model: 'intake', data }); return { id: 'intake-test' }
    },
  },
}

beforeEach(() => {
  writes = []; prior = null; recent = null; failOutbox = false; companies = [{ id: 'company-test' }]
  delete process.env.LEAD_COMPANY_ID; delete process.env.LEAD_BRANCH_ID
  delete process.env.LEAD_OWNER_USER_ID; delete process.env.WALKTHROUGH_OUTREACH_SEQUENCE_ID
  delete process.env.RESEND_API_KEY; delete process.env.CRON_SECRET
  mock.method(globalThis, 'fetch', async (...args: unknown[]) => { requests.push(args); throw new Error('network forbidden by offline test') })
  // Prisma exposes these through a proxy; node:test's descriptor-based
  // mock.method cannot patch them, so replace and restore the callable directly.
  prisma.$transaction = (async (callback: (client: typeof tx) => Promise<unknown>) => {
    try { return await callback(tx) } catch (error) { writes = []; throw error }
  }) as unknown as typeof prisma.$transaction
})
afterEach(() => {
  mock.restoreAll()
  prisma.$transaction = originalTransaction
  prisma.$queryRaw = originalQuery
  prisma.leadDelivery.findUniqueOrThrow = originalDeliveryFind
  prisma.leadDelivery.updateMany = originalDeliveryUpdate
})

function request(body: unknown = input) {
  return new NextRequest('http://localhost/api/leads', { method: 'POST', body: JSON.stringify(body) })
}

test('CRM receipt + two delivery jobs commit before success; no external HTTP', async () => {
  const before = requests.length
  const response = await POST(request())
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true, duplicate: false, notifications: 'queued' })
  assert.equal(requests.length, before)
  assert.deepEqual(writes.map(w => w.model), ['prospect', 'intake'])
  assert.deepEqual(writes[1].data.deliveries, { create: [{ kind: 'notification' }, { kind: 'autoresponder' }] })
  assert.equal((writes[0].data.discoveryData as Record<string, unknown>).utm_campaign, 'austin-test')
  assert.equal(writes[0].data.companyId, 'company-test')
})

test('outbox failure rolls back intake and CRM and returns retryable 503', async () => {
  failOutbox = true
  const response = await POST(request())
  assert.equal(response.status, 503)
  assert.equal(response.headers.get('retry-after'), '30')
  assert.equal((await response.json()).ok, false)
  assert.deepEqual(writes, [])
})

test('ambiguous/missing company fails closed with no writes', async () => {
  companies = [{ id: 'one' }, { id: 'two' }]
  assert.equal((await POST(request())).status, 503)
  assert.deepEqual(writes, [])
})

test('same submission replay reuses receipt without new CRM or notification writes', async () => {
  prior = { id: 'existing', companyId: 'company-test', payloadHash: leadFingerprint(payload) }
  const response = await POST(request())
  assert.equal(response.status, 200)
  assert.equal((await response.json()).duplicate, true)
  assert.deepEqual(writes, [])
})

test('submission ID cannot replace a different request', async () => {
  prior = { id: 'existing', companyId: 'company-test', payloadHash: 'different' }
  assert.equal((await POST(request())).status, 409)
  assert.deepEqual(writes, [])
})

test('cross-company receipt is never reused', async () => {
  prior = { id: 'existing', companyId: 'another-company', payloadHash: leadFingerprint(payload) }
  assert.equal((await POST(request())).status, 409)
  assert.deepEqual(writes, [])
})

test('exact-content repeat within 15 minutes collapses without a submission ID', async () => {
  recent = { id: 'existing', companyId: 'company-test', payloadHash: leadFingerprint(payload) }
  const response = await POST(request({ ...input, submission_id: undefined }))
  assert.equal((await response.json()).duplicate, true)
  assert.deepEqual(writes, [])
})

test('invalid body and honeypot produce no database writes', async () => {
  assert.equal((await POST(request({ email: 'bad' }))).status, 400)
  assert.equal((await POST(request({ ...input, website: 'spam' }))).status, 200)
  const invalid = new NextRequest('http://localhost/api/leads', { method: 'POST', body: '{' })
  assert.equal((await POST(invalid)).status, 400)
  assert.deepEqual(writes, [])
})

test('fingerprint ignores timestamp/email case and changes for campaign or notes', () => {
  assert.equal(leadFingerprint(payload), leadFingerprint({ ...payload, submitted_at: 'later', email: 'TEST@EXAMPLE.INVALID' }))
  assert.notEqual(leadFingerprint(payload), leadFingerprint({ ...payload, utm_campaign: 'different' }))
  assert.notEqual(leadFingerprint(payload), leadFingerprint({ ...payload, notes: 'new request' }))
})

test('configured enrollment is durable with the sequence ID frozen at receipt', async () => {
  process.env.WALKTHROUGH_OUTREACH_SEQUENCE_ID = 'sequence-test'
  await POST(request())
  assert.deepEqual(writes[1].data.deliveries, { create: [
    { kind: 'notification' }, { kind: 'autoresponder' },
    { kind: 'enrollment', request: { sequenceId: 'sequence-test' } },
  ] })
})

test('missing email configuration and provider failures reject instead of succeeding', async () => {
  const body = await buildLeadEmail(payload, 'autoresponder')
  await assert.rejects(sendLeadEmail(body, 'test/id'), /resend_not_configured/)
  process.env.RESEND_API_KEY = 'offline-test-key'
  mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 429 }))
  await assert.rejects(sendLeadEmail(body, 'test/id'), /resend_http_429/)
  mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 200 }))
  await assert.rejects(sendLeadEmail(body, 'test/id'), /resend_missing_message_id/)
})

test('email escapes lead text and uses deterministic provider idempotency', async () => {
  process.env.RESEND_API_KEY = 'offline-test-key'
  const body = await buildLeadEmail({ ...payload, business_name: '<script>alert(1)</script>' }, 'notification')
  assert.ok(!body.html.includes('<script>alert(1)</script>'))
  let call: RequestInit | undefined
  mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    call = options; return new Response('{"id":"message-test"}', { status: 200 })
  })
  assert.equal(await sendLeadEmail(body, 'lead/test-job'), 'message-test')
  assert.equal((call?.headers as Record<string, string>)['Idempotency-Key'], 'lead/test-job')
  assert.equal(call?.redirect, 'error')
  assert.equal(call?.body, JSON.stringify(body))
})

test('retries back off, exhaust attempts, and stop before Resend 24h expiry', () => {
  const now = new Date()
  assert.equal(deliveryFailure(1, now, now).nextAttemptAt.getTime() - now.getTime(), 60_000)
  assert.equal(deliveryFailure(4, now, now).nextAttemptAt.getTime() - now.getTime(), 8 * 60_000)
  assert.equal(deliveryFailure(8, now, now).status, 'failed')
  assert.equal(deliveryFailure(2, new Date(now.getTime() - SAFE_RETRY_WINDOW_MS), now).status, 'failed')
})

test('worker rejects missing/wrong cron credentials before touching DB', async () => {
  assert.equal((await cronGet(new NextRequest('http://localhost/api/cron/lead-deliveries'))).status, 401)
  process.env.CRON_SECRET = 'offline-test-secret'
  assert.equal((await cronGet(new NextRequest('http://localhost/api/cron/lead-deliveries', { headers: { authorization: 'Bearer wrong' } }))).status, 401)
})

test('crm:read permits CRM reads and rejects writes, credential management, finance and BackHaus', () => {
  for (const path of ['/api/users/me', '/api/growth/prospects', '/api/growth/prospects/p1', '/api/growth/prospects/p1/activities', '/api/growth/lead-deliveries']) {
    assert.equal(agentRequestAllowed(['crm:read'], path, 'GET'), true)
    assert.equal(agentRequestAllowed(['crm:read'], path, 'POST'), false)
  }
  for (const path of ['/api/growth/api-keys', '/api/invoices', '/api/users', '/api/admin/studio-clients', '/api/growth/outreach/send', '/api/leads']) {
    assert.equal(agentRequestAllowed(['crm:read'], path, 'GET'), false)
    assert.equal(agentRequestAllowed(['crm:read'], path, 'POST'), false)
  }
  assert.equal(agentRequestAllowed(['crm:read'], '/api/mcp', 'POST'), true)
  assert.equal(agentRequestAllowed(['crm:read']), false)
  assert.equal(agentRequestAllowed(['*'], '/api/admin/studio-clients', 'GET'), false)
  assert.equal(agentRequestAllowed(['*', 'backhaus'], '/api/admin/studio-clients', 'GET'), true)
})

test('idle worker leaves providers untouched', async () => {
  const before = requests.length
  prisma.$queryRaw = (async () => []) as typeof prisma.$queryRaw
  assert.deepEqual(await drainLeadDeliveries(), { sent: 0, retried: 0, failed: 0, leaseLost: 0 })
  assert.equal(requests.length, before)
})

function claimedJob(options: { kind?: string; attempts?: number; firstAttemptAt?: Date; request?: unknown; updateCount?: number } = {}) {
  const updates: Array<{ where: Record<string, unknown>; data: Record<string, unknown> }> = []
  let claims = 0
  prisma.$queryRaw = (async () => claims++ === 0 ? [{ id: 'job-test' }] : []) as typeof prisma.$queryRaw
  prisma.leadDelivery.findUniqueOrThrow = (async () => ({
    id: 'job-test', kind: options.kind ?? 'notification',
    attempts: options.attempts ?? 1, firstAttemptAt: options.firstAttemptAt ?? new Date(),
    request: options.request ?? null,
    intake: { payload, prospectId: 'prospect-test', companyId: 'company-test' },
  })) as unknown as typeof prisma.leadDelivery.findUniqueOrThrow
  prisma.leadDelivery.updateMany = (async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
    updates.push(args); return { count: options.updateCount ?? 1 }
  }) as unknown as typeof prisma.leadDelivery.updateMany
  return updates
}

test('worker snapshots the email before send and records provider acceptance with a lease guard', async () => {
  process.env.RESEND_API_KEY = 'offline-test-key'
  const updates = claimedJob()
  mock.method(globalThis, 'fetch', async () => {
    assert.equal(updates.length, 1)
    assert.ok(updates[0].data.request)
    return new Response('{"id":"accepted-test"}')
  })
  assert.deepEqual(await drainLeadDeliveries(), { sent: 1, retried: 0, failed: 0, leaseLost: 0 })
  assert.equal(updates[1].data.status, 'sent')
  assert.equal(updates[1].data.providerId, 'accepted-test')
  assert.equal(updates[1].where.status, 'processing')
  assert.equal(typeof updates[1].where.lockToken, 'string')
})

test('failed channel remains pending with a sanitized error; successful channels are not selected again', async () => {
  const updates = claimedJob({ kind: 'autoresponder' })
  const result = await drainLeadDeliveries()
  assert.equal(result.retried, 1)
  assert.equal(updates.at(-1)?.data.status, 'pending')
  assert.equal(updates.at(-1)?.data.lastError, 'resend_not_configured')
  assert.equal(updates.at(-1)?.data.lockedUntil, null)
})

test('uncertain send retry uses the frozen body and same per-job key', async () => {
  process.env.RESEND_API_KEY = 'offline-test-key'
  const frozen = { from: 'test@example.invalid', to: ['test@example.invalid'], subject: 'frozen', html: '<p>frozen</p>' }
  const updates = claimedJob({ attempts: 2, request: frozen })
  mock.method(globalThis, 'fetch', async (_url: unknown, options: RequestInit) => {
    assert.equal(options.body, JSON.stringify(frozen))
    assert.equal((options.headers as Record<string, string>)['Idempotency-Key'], 'lead/job-test')
    return new Response('{"id":"original-message"}')
  })
  assert.equal((await drainLeadDeliveries()).sent, 1)
  assert.equal(updates.length, 1)
})

test('expired uncertain outcomes become failed without another send', async () => {
  const before = requests.length
  const updates = claimedJob({ firstAttemptAt: new Date(Date.now() - SAFE_RETRY_WINDOW_MS) })
  assert.equal((await drainLeadDeliveries()).failed, 1)
  assert.equal(updates[0].data.status, 'failed')
  assert.equal(updates[0].data.lastError, 'delivery_retry_window_exhausted')
  assert.equal(requests.length, before)
})

test('lost lease during snapshot prevents a send', async () => {
  const before = requests.length
  claimedJob({ updateCount: 0 })
  assert.equal((await drainLeadDeliveries()).leaseLost, 1)
  assert.equal(requests.length, before)
})
