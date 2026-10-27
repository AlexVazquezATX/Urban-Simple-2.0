import { test, beforeEach, mock } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import './outreach-deliverability.env'
import { prisma } from '../../src/lib/db'
import { pickRecipient, resolveMessageRecipient, checkSendable, suppressBouncedAddress } from '../../src/lib/services/outreach-recipient'
import { buildOutreachEmail, unsubscribeUrl, verifyUnsubscribeToken } from '../../src/lib/services/outreach-email'
import * as unsubscribe from '../../src/app/api/outreach/unsubscribe/route'

const day = (n: number) => new Date(Date.UTC(2026, 0, n))

// ---- prisma doubles ----
let knownBad: { id: string } | null = null
let optedOut: { id: string } | null = null
let contactUpdates: Array<{ where: unknown; data: Record<string, unknown> }> = []
let prospectUpdates: string[] = []
let cancels: string[] = []
let abstractCalls = 0
let abstractVerdict = 'DELIVERABLE'

const db = prisma as any
db.prospectContact.findFirst = async (args: any) => {
  if (args.where?.emailVerificationStatus === 'bounced') return knownBad
  if (args.where?.prospect?.doNotContact) return optedOut
  if (args.where?.id === 'c-1') return { email: 'Owner@Cafe.test' }
  return null
}
db.prospectContact.updateMany = async (args: any) => {
  contactUpdates.push(args)
  return { count: 2 }
}
db.prospect.findUnique = async () => ({ id: 'p-1', companyId: 'co-1', doNotContact: false })
db.prospect.findMany = async () => [{ id: 'p-1' }, { id: 'p-dup' }]
db.prospect.update = async (args: any) => { prospectUpdates.push(args.where.id); return {} }
db.outreachMessage.updateMany = async (args: any) => { cancels.push(args.where?.prospectId); return { count: 0 } }
db.outreachMessage.findMany = async () => []
db.user.findFirst = async () => ({ id: 'admin-1' })
db.prospectActivity.create = async () => ({})

mock.method(globalThis, 'fetch', async () => {
  abstractCalls++
  return new Response(JSON.stringify({
    email: 'x', autocorrect: '', deliverability: abstractVerdict, quality_score: '0.9',
    is_valid_format: { value: true }, is_free_email: { value: false }, is_disposable_email: { value: false },
    is_role_email: { value: false }, is_catchall_email: { value: abstractVerdict === 'RISKY' },
    is_mx_found: { value: true }, is_smtp_valid: { value: abstractVerdict === 'DELIVERABLE' },
  }), { status: 200 })
})

beforeEach(() => {
  knownBad = null
  optedOut = null
  contactUpdates = []
  prospectUpdates = []
  cancels = []
  abstractCalls = 0
  abstractVerdict = 'DELIVERABLE'
})

// ---- recipient selection ----

test('pickRecipient prefers verified, then decision-makers, never bad or blank addresses', () => {
  const contacts = [
    { id: 'blank', email: null, createdAt: day(1) },
    { id: 'bounced', email: 'gm@hotel.test', emailVerificationStatus: 'bounced', isDecisionMaker: true, createdAt: day(1) },
    { id: 'undeliverable', email: 'gm2@hotel.test', emailVerificationStatus: 'invalid', isDecisionMaker: true, createdAt: day(1) },
    { id: 'risky', email: 'chef@hotel.test', emailVerificationStatus: 'risky', isDecisionMaker: true, createdAt: day(1) },
    { id: 'plain', email: 'info@hotel.test', createdAt: day(2) },
    { id: 'dm', email: 'owner@hotel.test', isDecisionMaker: true, createdAt: day(3) },
  ]
  assert.equal(pickRecipient(contacts)?.id, 'dm')
  assert.equal(pickRecipient([...contacts, { id: 'valid', email: 'ops@hotel.test', emailVerificationStatus: 'valid', createdAt: day(9) }])?.id, 'valid')
  assert.equal(pickRecipient([contacts[0], contacts[1], contacts[2]]), null)
})

test('resolveMessageRecipient: typed address, then pinned contact, then oldest usable (how legacy rows were greeted)', () => {
  const contacts = [
    { id: 'a', email: 'a@x.test', createdAt: day(1) },
    { id: 'b', email: 'b@x.test', isDecisionMaker: true, createdAt: day(2) },
  ]
  assert.equal(resolveMessageRecipient({ recipientEmail: 'A@X.test' }, contacts)?.email, 'a@x.test')
  assert.deepEqual(resolveMessageRecipient({ recipientEmail: 'new@x.test' }, contacts), { email: 'new@x.test' })
  assert.equal((resolveMessageRecipient({ contactId: 'a' }, contacts) as any).id, 'a')
  assert.equal((resolveMessageRecipient({ contactId: 'gone' }, contacts) as any).id, 'a')
  assert.equal((resolveMessageRecipient({}, contacts) as any).id, 'a', 'unpinned rows must not switch to the best-ranked contact')
})

// ---- verification gate ----

test('cold address is verified once, the result saved on the contact', async () => {
  const r = await checkSendable({ id: 'c-9', email: 'gm@hotel.test' }, { source: 'csv_import' })
  assert.deepEqual(r, { ok: true })
  assert.equal(abstractCalls, 1)
  assert.equal(contactUpdates[0].data.emailVerificationStatus, 'valid')
  assert.deepEqual(contactUpdates[0].where, { id: 'c-9' })

  // Already valid: no second lookup
  await checkSendable({ id: 'c-9', email: 'gm@hotel.test', emailVerificationStatus: 'valid' }, { source: 'csv_import' })
  assert.equal(abstractCalls, 1)
})

test('undeliverable and catch-all addresses are blocked', async () => {
  abstractVerdict = 'UNDELIVERABLE'
  assert.deepEqual(await checkSendable({ id: 'c', email: 'guess@marriott.test' }, { source: 'csv_import' }), { ok: false, reason: 'address_known_bad' })
  // Already marked undeliverable: no repeat lookup
  await checkSendable({ id: 'c', email: 'guess@marriott.test', emailVerificationStatus: 'invalid' }, { source: 'csv_import' })
  assert.equal(abstractCalls, 1)
  abstractVerdict = 'RISKY'
  assert.deepEqual(await checkSendable({ id: 'c', email: 'x@catchall.test' }, { source: 'manual' }), { ok: false, reason: 'address_risky' })
})

test('a recent "unknown" result is not re-checked every hour', async () => {
  const r = await checkSendable(
    { id: 'c', email: 'x@slow.test', emailVerificationStatus: 'unknown', emailVerifiedAt: new Date() },
    { source: 'csv_import' },
  )
  assert.deepEqual(r, { ok: false, reason: 'address_unverified' })
  assert.equal(abstractCalls, 0)
})

test('inbound leads skip verification, but a bounce or opt-out on any record blocks even them', async () => {
  assert.deepEqual(await checkSendable({ email: 'me@lead.test' }, { source: 'website' }), { ok: true })
  assert.deepEqual(await checkSendable({ email: 'me@lead.test', emailVerificationStatus: 'invalid' }, { source: 'website' }), { ok: true },
    'a flaky verification result must not lock out someone who filled in our form')
  assert.equal(abstractCalls, 0)
  optedOut = { id: 'reimported-record' }
  assert.deepEqual(await checkSendable({ email: 'me@lead.test' }, { source: 'website', companyId: 'co-1' }), { ok: false, reason: 'address_opted_out' })
  knownBad = { id: 'other-record' }
  assert.deepEqual(await checkSendable({ email: 'me@lead.test' }, { source: 'website' }), { ok: false, reason: 'address_bounced' })
})

test('verification budget caps paid lookups per run', async () => {
  const budget = { remaining: 1 }
  await checkSendable({ id: 'c1', email: 'a@one.test' }, { source: 'csv_import' }, { verifyBudget: budget })
  const r = await checkSendable({ id: 'c2', email: 'b@two.test' }, { source: 'csv_import' }, { verifyBudget: budget })
  assert.equal(abstractCalls, 1)
  assert.deepEqual(r, { ok: false, reason: 'address_unverified' })
})

test('allowUnverified lets a person send to a catch-all, never to a bounced or opted-out address', async () => {
  abstractVerdict = 'RISKY'
  assert.deepEqual(await checkSendable({ id: 'c', email: 'gm@catchall.test' }, { source: 'manual' }, { allowUnverified: true }), { ok: true })
  knownBad = { id: 'x' }
  assert.deepEqual(await checkSendable({ id: 'c', email: 'gm@catchall.test' }, { source: 'manual' }, { allowUnverified: true }), { ok: false, reason: 'address_bounced' })
})

test('suppressBouncedAddress marks the address bounced on every company record, case-insensitively', async () => {
  const n = await suppressBouncedAddress('Tommy.S@Hotel.test', 'co-1')
  assert.equal(n, 2)
  assert.deepEqual(contactUpdates[0].where, { email: { equals: 'Tommy.S@Hotel.test', mode: 'insensitive' }, prospect: { companyId: 'co-1' } })
  assert.equal(contactUpdates[0].data.emailVerificationStatus, 'bounced')
})

// ---- email building ----

test('outreach email has a text part, postal address, opt-out, and one-click headers', () => {
  const e = buildOutreachEmail({
    body: 'Hi Bryce,\n\nQuick question.',
    signature: { emailSignature: 'Alex\nUrban Simple' },
    prospectId: 'p-1',
    contactId: 'c-1',
  })
  assert.match(e.text, /^Hi Bryce,\n\nQuick question\.\n\n--\nAlex\nUrban Simple/)
  assert.match(e.text, /Example LLC, PO Box 1, Austin, TX 78701/)
  assert.match(e.text, /reply "unsubscribe"/)
  assert.match(e.html, /Hi Bryce,<br><br>Quick question\./)
  assert.match(e.html, /opt out here<\/a>/)
  assert.equal(e.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click')
  assert.match(e.headers['List-Unsubscribe'], /^<mailto:reply@in\.example\.test\?subject=unsubscribe>, <https:\/\/www\.example\.test\/api\/outreach\/unsubscribe\?p=p-1&c=c-1&t=/)
  assert.doesNotMatch(e.headers['List-Unsubscribe'], /@cafe/i) // ids in the URL, never the address
  assert.doesNotMatch(e.text + e.html, /—/) // no em dashes in prospect-facing copy
})

test('HTML bodies get a stripped plain-text part', () => {
  const e = buildOutreachEmail({ body: '<p>Hello &amp; welcome</p><p>Line two</p>', bodyIsHtml: true, prospectId: 'p', contactId: null })
  assert.match(e.text, /^Hello & welcome\nLine two/)
})

test('unsubscribe tokens round-trip and reject tampering', () => {
  const url = new URL(unsubscribeUrl('p-1', 'c-1')!)
  const t = url.searchParams.get('t')!
  assert.ok(verifyUnsubscribeToken('p-1', 'c-1', t))
  assert.ok(!verifyUnsubscribeToken('p-2', 'c-1', t))
  assert.ok(!verifyUnsubscribeToken('p-1', 'c-1', t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A')))
})

// ---- unsubscribe route ----

test('GET only shows a confirm page; POST opts out every record with that address', async () => {
  const url = unsubscribeUrl('p-1', 'c-1')!

  const get = await unsubscribe.GET(new NextRequest(url))
  assert.equal(get.status, 200)
  assert.match(await get.text(), /<form method="post"/)
  assert.deepEqual(prospectUpdates, [], 'link scanners prefetching GET must not unsubscribe anyone')

  const post = await unsubscribe.POST(new NextRequest(url, { method: 'POST', body: 'List-Unsubscribe=One-Click' }))
  assert.equal(post.status, 200)
  assert.deepEqual(prospectUpdates.sort(), ['p-1', 'p-dup'])
  assert.deepEqual(cancels.sort(), ['p-1', 'p-dup'])
})

test('a forged unsubscribe link changes nothing', async () => {
  const res = await unsubscribe.POST(new NextRequest('https://www.example.test/api/outreach/unsubscribe?p=p-1&c=c-1&t=forged', { method: 'POST' }))
  assert.equal(res.status, 400)
  assert.deepEqual(prospectUpdates, [])
})
