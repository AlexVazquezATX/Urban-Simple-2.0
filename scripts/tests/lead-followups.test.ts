import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { prisma } from '../../src/lib/db'
import { leadReviewReason } from '../../src/lib/leads/junk'
import { FOLLOWUP_STEPS, followUpStopReason } from '../../src/lib/leads/followups'
import { followUpProblems } from '../../src/lib/lead-machine/health'
import { statusStopsOutreach } from '../../src/lib/services/outreach-cancel'
import { prospectFromAddress } from '../../src/lib/services/sender-address'
import { enrollProspectInSequence } from '../../src/lib/services/outreach-enroll'
import { isWithinSendWindow } from '../../src/lib/services/autopilot-schedule'
import { automatePipelineStage } from '../../src/lib/ai/pipeline-automator'
import { buildLeadEmail } from '../../src/lib/leads/email'
import { POST as homeForm } from '../../src/app/api/walkthrough-request/route'
import type { LeadPayload } from '../../src/lib/leads/schema'

const lead = { business_name: 'Mexta', email: 'owner@mextarestaurant.com', notes: undefined as string | undefined }

test('real requests pass the junk check', () => {
  assert.equal(leadReviewReason(lead), null)
  assert.equal(leadReviewReason({ ...lead, email: 'owner@gmail.com', notes: '1 Kitchen needs a deep cleaning and possible ongoing cleaning weekly' }), null)
  assert.equal(leadReviewReason({ ...lead, notes: 'I found your website and need a quote for our kitchen. We offer brunch on weekends so nights are best.' }), null)
  assert.equal(leadReviewReason({ ...lead, notes: 'We provide meals for 200 residents. Our cleaning is outsourced now and we want to switch.' }), null)
})

test('missing business names and vendor pitches are held for a person', () => {
  assert.equal(leadReviewReason({ ...lead, business_name: 'Not provided' }), 'no business name')
  assert.equal(leadReviewReason({ ...lead, business_name: '  ' }), 'no business name')
  assert.equal(leadReviewReason({ ...lead, email: 'emma@toptalentvas.com' }), 'vendor email domain')
  assert.equal(leadReviewReason({ ...lead, email: 'edward@acutemarketingsolutions.com' }), 'vendor email domain')
  assert.equal(leadReviewReason({ ...lead, notes: 'We provide SEO for local businesses' }), 'reads like a sales pitch')
  assert.equal(leadReviewReason({ ...lead, notes: "I'm a business broker that has several buyers interested in purchasing businesses" }), 'reads like a sales pitch')
})

test('follow-up copy keeps the house rules', () => {
  const text = FOLLOWUP_STEPS.flatMap((s) => [s.subject, s.body]).join('\n')
  assert.ok(!text.includes('—'), 'no em dashes')
  assert.ok(!/\[[^\]]+\]/.test(text), 'no bracketed placeholders')
  assert.ok(!/\b(call me|hop on a call|give me a call|phone call|stop by|drop by|swing by)\b/i.test(text), 'no call or drop-by asks')
  assert.ok(!/\bAlex\b/.test(text), 'the signature signs these')
  // Merge tags are limited to the ones that resolve for every lead.
  const tags = text.match(/\{\{[^}]+\}\}/g) ?? []
  assert.ok(tags.every((t) => t === '{{first_name_or_there}}'))
  assert.deepEqual(FOLLOWUP_STEPS.map((s) => s.delayDays), [2, 3, 7])
})

test('enrollment waits for the first step delay and stays in the send window', async () => {
  const created: Array<Record<string, unknown>> = []
  const db = {
    outreachCampaign: {
      findFirst: async () => null,
      create: async () => ({ id: 'campaign-test' }),
    },
    outreachMessage: { create: async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return data } },
    prospectActivity: { create: async () => ({}) },
  }
  const window = { timezone: 'America/Chicago', hourStart: 9, hourEnd: 16, daysOfWeek: [2, 3, 4, 5, 6] }
  const before = Date.now()
  const result = await enrollProspectInSequence({
    template: {
      id: 'template', name: 'Website lead follow-ups', description: null, autopilot: true,
      messages: FOLLOWUP_STEPS.map((s) => ({ ...s, channel: 'email', isAiGenerated: false })),
    },
    prospect: {
      id: 'prospect', companyName: 'Mexta', address: null,
      contacts: [{ id: 'c1', firstName: 'Rodrigo', lastName: 'Q', title: null, email: 'owner@mextarestaurant.com' }],
    },
    companyId: 'company',
    userId: 'alex',
    company: {
      id: 'company', timezone: window.timezone,
      autopilotSendHourStart: 9, autopilotSendHourEnd: 16, autopilotSendDaysOfWeek: window.daysOfWeek,
    },
  }, db as never)
  assert.deepEqual(result, { campaignId: 'campaign-test', messagesCreated: 3 })
  const times = created.map((m) => (m.scheduledAt as Date).getTime())
  assert.ok(times[0] >= before + 2 * 86_400_000, 'first follow-up is at least 2 days out')
  assert.ok(times[1] >= times[0] + 3 * 86_400_000)
  assert.ok(times[2] >= times[1] + 7 * 86_400_000)
  for (const m of created) {
    assert.equal(m.approvalStatus, 'approved')
    assert.equal(m.status, 'pending')
    assert.equal(m.contactId, 'c1')
    assert.ok(isWithinSendWindow(m.scheduledAt as Date, window))
    assert.ok(!String(m.body).includes('{{'))
    assert.ok(String(m.body).startsWith('Hi Rodrigo,'))
  }
})

test('a cold sequence with no first delay still goes at the next slot', async () => {
  const created: Array<Record<string, unknown>> = []
  const db = {
    outreachCampaign: { findFirst: async () => null, create: async () => ({ id: 'c' }) },
    outreachMessage: { create: async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return data } },
    prospectActivity: { create: async () => ({}) },
  }
  await enrollProspectInSequence({
    template: { id: 't', name: 'Cold', description: null, autopilot: true, messages: [{ step: 1, delayDays: 0, channel: 'email', subject: 's', body: 'b', isAiGenerated: false }] },
    prospect: { id: 'p', companyName: 'X', address: null, contacts: [] },
    companyId: 'company', userId: 'alex',
    company: { id: 'company', timezone: 'America/Chicago', autopilotSendHourStart: 0, autopilotSendHourEnd: 24, autopilotSendDaysOfWeek: [0, 1, 2, 3, 4, 5, 6] },
  }, db as never)
  assert.ok((created[0].scheduledAt as Date).getTime() < Date.now() + 2 * 86_400_000)
})

test('follow-ups stop once a person has the lead', () => {
  assert.equal(followUpStopReason('new', false), null)
  assert.equal(followUpStopReason('contacted', false), 'status_contacted')
  assert.equal(followUpStopReason('lost', false), 'status_lost')
  assert.equal(followUpStopReason('new', true), 'human_contact_logged')
})

test('marking contacted stops an inbound lead but not a cold sequence', () => {
  assert.equal(statusStopsOutreach('contacted', 'website'), true)
  assert.equal(statusStopsOutreach('contacted', 'lead_machine'), false)
  assert.equal(statusStopsOutreach('lost', 'lead_machine'), true)
  assert.equal(statusStopsOutreach('engaged', 'website'), true)
  assert.equal(statusStopsOutreach('researching', 'website'), false)
})

test('people who came to us hear from the main address, cold accounts from the cold domain', () => {
  const saved = process.env.RESEND_OUTREACH_FROM_EMAIL
  process.env.RESEND_OUTREACH_FROM_EMAIL = 'alex@cold.example'
  try {
    assert.equal(prospectFromAddress('website'), 'alex@urbansimple.net')
    assert.equal(prospectFromAddress('meta_lead_ad'), 'alex@urbansimple.net')
    assert.equal(prospectFromAddress('lead_machine'), 'alex@cold.example')
  } finally {
    if (saved === undefined) delete process.env.RESEND_OUTREACH_FROM_EMAIL
    else process.env.RESEND_OUTREACH_FROM_EMAIL = saved
  }
})

test('the watchdog speaks up when follow-ups stop', () => {
  assert.deepEqual(followUpProblems({ sequenceActive: true, overdue: 0, stuckDeliveries: 0 }), [])
  assert.match(followUpProblems({ sequenceActive: false, overdue: 0, stuckDeliveries: 0 })[0], /getting no follow-ups/)
  assert.match(followUpProblems({ sequenceActive: true, overdue: 3, stuckDeliveries: 0 })[0], /3 website lead follow-ups/)
  assert.match(followUpProblems({ sequenceActive: true, overdue: 0, stuckDeliveries: 2 })[0], /2 website lead emails/)
})

const originalFindUnique = prisma.prospect.findUnique
const originalUpdate = prisma.prospect.update
const originalTransaction = prisma.$transaction
afterEach(() => {
  prisma.prospect.findUnique = originalFindUnique
  prisma.prospect.update = originalUpdate
  prisma.$transaction = originalTransaction
})

function prospectWith(source: string, pending: boolean) {
  return {
    id: 'p', status: 'new', source, assignedToId: 'u',
    activities: [{ type: 'email', sentAt: new Date(), outcome: 'sent', openedAt: null, clickedAt: null, title: 'x' }],
    outreachMessages: pending ? [{ status: 'pending', approvalStatus: 'approved', scheduledAt: new Date(), openedAt: null, clickedAt: null, openCount: 0, clickCount: 0 }] : [],
  }
}

test('the pipeline cron leaves a lead alone while follow-ups are scheduled', async () => {
  let updates = 0
  prisma.prospect.update = (async () => { updates++ }) as never
  prisma.prospect.findUnique = (async () => prospectWith('website', true)) as never
  await automatePipelineStage('p')
  assert.equal(updates, 0)
})

test('the pipeline cron still moves cold prospects, and leads whose follow-ups are done', async () => {
  for (const [source, pending] of [['lead_machine', true], ['website', false]] as const) {
    let updates = 0
    prisma.prospect.update = (async () => { updates++ }) as never
    prisma.prospect.findUnique = (async () => prospectWith(source, pending)) as never
    // Past the status write it logs an activity, which isn't mocked here.
    await automatePipelineStage('p').catch(() => {})
    assert.equal(updates, 1, source)
  }
})

function homeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/walkthrough-request', { method: 'POST', body: JSON.stringify(body) })
}

function captureIntake(sequence: { id: string } | null) {
  const writes: Array<{ model: string; data: Record<string, unknown> }> = []
  const tx = {
    $executeRaw: async () => 1,
    company: { findMany: async () => [{ id: 'company-test' }] },
    branch: { findMany: async () => [{ id: 'austin-test' }] },
    user: { findFirst: async () => ({ id: 'owner-test' }) },
    outreachCampaign: { findFirst: async () => sequence },
    prospect: { create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ model: 'prospect', data }); return { id: 'prospect-test' } } },
    leadIntake: {
      findUnique: async () => null,
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => { writes.push({ model: 'intake', data }); return { id: 'intake-test' } },
    },
  }
  prisma.$transaction = (async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)) as never
  return writes
}

test('the home page form saves a real lead through intake with all three jobs', async () => {
  const writes = captureIntake({ id: 'sequence-test' })
  const response = await homeForm(homeRequest({
    name: 'Nicolette Jefferson', email: 'N@PEGASUS.example', phone: '5125550100',
    company: 'Parmer Woods', propertyType: 'Other', message: 'Kitchen needs a deep cleaning',
  }))
  assert.equal(response.status, 200)
  assert.deepEqual(writes.map((w) => w.model), ['prospect', 'intake'])
  assert.deepEqual(writes[1].data.deliveries, { create: [
    { kind: 'notification' }, { kind: 'autoresponder' },
    { kind: 'enrollment', request: { sequenceId: 'sequence-test' } },
  ] })
  assert.equal(writes[0].data.companyName, 'Parmer Woods')
  assert.equal(writes[0].data.sourceDetail, 'urbansimple.net/home')
  assert.equal(writes[0].data.source, 'website')
  assert.match(String(writes[0].data.notes), /Kitchen needs a deep cleaning/)
  assert.equal((writes[1].data.payload as Record<string, unknown>).email, 'n@pegasus.example')
})

test('with no active sequence a lead still gets the alert and auto-reply', async () => {
  const writes = captureIntake(null)
  await homeForm(homeRequest({ name: 'A B', email: 'a@cafe.example', phone: '5125550100', company: 'Cafe' }))
  assert.deepEqual(writes[1].data.deliveries, { create: [{ kind: 'notification' }, { kind: 'autoresponder' }] })
})

test('a flagged submission is saved and alerts Alex but gets no automatic email', async () => {
  const writes = captureIntake({ id: 'sequence-test' })
  const response = await homeForm(homeRequest({ name: 'Miley A', email: 'miley@vasdirect.com', phone: '2175550100' }))
  assert.equal(response.status, 200)
  assert.deepEqual(writes[1].data.deliveries, { create: [{ kind: 'notification' }] })
  assert.deepEqual(writes[0].data.tags, ['Website Lead', 'Walkthrough Request', 'Possible Junk'])
  assert.match(String(writes[0].data.notes), /^POSSIBLE JUNK \(no business name\)/)
})

test('the home form honeypot and bad input save nothing', async () => {
  const writes = captureIntake(null)
  assert.equal((await homeForm(homeRequest({ name: 'Bot', email: 'b@b.example', phone: '1', company: 'X', website: 'spam' }))).status, 200)
  assert.equal((await homeForm(homeRequest({ name: 'No Email' }))).status, 400)
  assert.deepEqual(writes, [])
})

const payload: LeadPayload = {
  source: 'urbansimple.net/home', submitted_at: '2026-11-04T16:00:00Z', name: 'A B',
  business_name: 'Cafe', location: 'Not provided', email: 'a@cafe.example',
}

test('auto-reply replies reach the hub, and junk alerts say so', async () => {
  const saved = process.env.OUTREACH_REPLY_TO
  process.env.OUTREACH_REPLY_TO = 'reply@in.example'
  try {
    assert.equal((await buildLeadEmail(payload, 'autoresponder')).reply_to, 'reply@in.example')
  } finally {
    if (saved === undefined) delete process.env.OUTREACH_REPLY_TO
    else process.env.OUTREACH_REPLY_TO = saved
  }
  assert.match((await buildLeadEmail(payload, 'notification')).subject, /^New walkthrough request: Cafe/)
  assert.match((await buildLeadEmail({ ...payload, business_name: 'Not provided' }, 'notification')).subject, /^Possible junk \(no business name\)/)
})
