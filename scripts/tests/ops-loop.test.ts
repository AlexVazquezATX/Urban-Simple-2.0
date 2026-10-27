// Unit tests for the ops closed loop: access matrix, SMS helpers, overnight
// shift logic, alert email rendering. Pure functions only (no database).
//
//   npm run test:ops
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'crypto'
import { apiAllowed } from '../../src/lib/api-access'
import { toE164, verifyTwilioSignature } from '../../src/lib/notify/sms'
import { renderAlertEmail, renderAlertText } from '../../src/lib/notify/email'
import { overnightStillActive, normalizeSections, parseIncompleteItems } from '../../src/lib/ops/field'
import { reasonLabel, NOT_DONE_REASONS } from '../../src/lib/ops/constants'
import {
  getLocalDateUTC,
  getLocalDayOfWeek,
  getLocalHour,
  getStartOfLocalDay,
  nextSendSlot,
} from '../../src/lib/services/autopilot-schedule'
import { FIELD_STRINGS } from '../../src/lib/ops/field-i18n'
import { hideFinancialNotes, keepHiddenFinancialLines, stripFinancialLines } from '../../src/lib/financials'

test('associates cannot touch pay, shifts, money or client records', () => {
  const A = 'ASSOCIATE'
  assert.equal(apiAllowed('/api/location-assignments/abc', 'PUT', A), false)
  assert.equal(apiAllowed('/api/location-assignments', 'GET', A), false)
  assert.equal(apiAllowed('/api/shifts', 'POST', A), false)
  assert.equal(apiAllowed('/api/shifts/abc', 'DELETE', A), false)
  assert.equal(apiAllowed('/api/invoices', 'GET', A), false)
  assert.equal(apiAllowed('/api/payments/x', 'PATCH', A), false)
  assert.equal(apiAllowed('/api/clients', 'GET', A), false)
  assert.equal(apiAllowed('/api/checklists', 'POST', A), false)
  assert.equal(apiAllowed('/api/checklists/abc', 'PUT', A), false)
  assert.equal(apiAllowed('/api/users', 'POST', A), false)
  assert.equal(apiAllowed('/api/users/abc', 'PATCH', A), false)
  assert.equal(apiAllowed('/api/issues/abc', 'PATCH', A), false)
  assert.equal(apiAllowed('/api/operations/workforce', 'GET', A), false)
  assert.equal(apiAllowed('/api/users/abc123', 'GET', A), false) // coworker records
  assert.equal(apiAllowed('/api/issues', 'POST', A), false) // they report via /api/field/flag
})

test('associates keep what the field flow needs', () => {
  const A = 'ASSOCIATE'
  assert.equal(apiAllowed('/api/my-night', 'GET', A), true)
  assert.equal(apiAllowed('/api/field/visit', 'POST', A), true)
  assert.equal(apiAllowed('/api/field/flag', 'POST', A), true)
  assert.equal(apiAllowed('/api/operations/clock', 'POST', A), true)
  assert.equal(apiAllowed('/api/checklists/abc', 'GET', A), true)
  assert.equal(apiAllowed('/api/checklists/abc/complete', 'POST', A), true)
  assert.equal(apiAllowed('/api/upload', 'POST', A), true)
  assert.equal(apiAllowed('/api/users', 'GET', A), true) // chat member pickers
  assert.equal(apiAllowed('/api/users/me', 'PATCH', A), true)
  assert.equal(apiAllowed('/api/issues', 'GET', A), true) // own reports only (route-scoped)
  assert.equal(apiAllowed('/api/issues/abc/comments', 'POST', A), true)
  assert.equal(apiAllowed('/api/notifications', 'GET', A), true)
})

test('managers run ops but not money', () => {
  const M = 'MANAGER'
  assert.equal(apiAllowed('/api/shifts', 'POST', M), true)
  assert.equal(apiAllowed('/api/location-assignments/abc', 'PUT', M), true) // pay itself is checked in the route
  assert.equal(apiAllowed('/api/clients/abc/contacts', 'POST', M), true)
  assert.equal(apiAllowed('/api/issues/abc', 'PATCH', M), true)
  assert.equal(apiAllowed('/api/issues/abc/notify-client', 'POST', M), true)
  assert.equal(apiAllowed('/api/invoices', 'GET', M), false)
  assert.equal(apiAllowed('/api/clients/abc/billing-preview', 'GET', M), false)
  assert.equal(apiAllowed('/api/growth/prospects', 'GET', M), false)
  assert.equal(apiAllowed('/api/communications', 'GET', M), false)
})

test('admins have everything', () => {
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    assert.equal(apiAllowed('/api/invoices', 'POST', role), true)
    assert.equal(apiAllowed('/api/clients/abc/billing-preview', 'GET', role), true)
    assert.equal(apiAllowed('/api/location-assignments', 'POST', role), true)
  }
})

test('toE164 normalizes US numbers and rejects junk', () => {
  assert.equal(toE164('(512) 555-1001'), '+15125551001')
  assert.equal(toE164('512.555.1001'), '+15125551001')
  assert.equal(toE164('1-512-555-1001'), '+15125551001')
  assert.equal(toE164('+44 20 7946 0958'), '+442079460958')
  assert.equal(toE164('555-1001'), null)
  assert.equal(toE164(''), null)
  assert.equal(toE164(null), null)
})

test('Twilio signature verification', () => {
  process.env.TWILIO_AUTH_TOKEN = 'test-token'
  const url = 'https://www.urbansimple.net/api/webhooks/twilio'
  const params = { From: '+15125551001', Body: 'STOP', To: '+15125550000' }
  const data = url + Object.keys(params).sort().map(k => k + params[k as keyof typeof params]).join('')
  const sig = createHmac('sha1', 'test-token').update(data).digest('base64')
  assert.equal(verifyTwilioSignature(url, params, sig), true)
  assert.equal(verifyTwilioSignature(url, { ...params, Body: 'START' }, sig), false)
  assert.equal(verifyTwilioSignature(url, params, null), false)
})

test('overnight shifts stay "tonight" until end + 3h', () => {
  // 21:00-02:00, now 01:30 → still active
  assert.equal(overnightStillActive('21:00', '02:00', 90), true)
  // now 04:59 → within grace
  assert.equal(overnightStillActive('21:00', '02:00', 299), true)
  // now 05:01 → over
  assert.equal(overnightStillActive('21:00', '02:00', 301), false)
  // same-day shift from yesterday is never tonight
  assert.equal(overnightStillActive('17:00', '22:00', 60), false)
})

test('checklist sections normalize defensively', () => {
  const s = normalizeSections([
    { id: 's1', name: 'Kitchen', nameEs: 'Cocina', items: [{ id: 'i1', text: 'Mop', textEs: 'Trapear', requiresPhoto: true }, { text: 'no id' }] },
    null,
    'junk',
  ])
  assert.equal(s.length, 1)
  assert.equal(s[0].items.length, 1)
  assert.equal(s[0].items[0].textEs, 'Trapear')
  assert.equal(s[0].items[0].requiresPhoto, true)
  assert.deepEqual(normalizeSections(undefined), [])
})

test('incomplete items parse and keep photos', () => {
  const items = parseIncompleteItems([{ itemId: 'i1', text: 'Mop', reason: 'out_of_time', photos: ['a', 3] }, { nope: 1 }])
  assert.equal(items.length, 1)
  assert.deepEqual(items[0].photos, ['a'])
})

test('alert email escapes user content and has no em dashes', () => {
  const html = renderAlertEmail({
    kicker: 'Service update',
    title: '<script>x</script>',
    rows: [['Location', 'HSB | Yacht Club'], ['Empty', '']],
    bullets: ['Kitchen: Mop floor (Ran out of time)'],
    ctaLabel: 'View',
    ctaUrl: 'https://example.com/a?b=1&c=2',
  })
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(!html.includes('Empty'))
  assert.ok(html.includes('&amp;c=2'))
  assert.ok(!html.includes('—'))
  const text = renderAlertText({ kicker: 'k', title: 'T', bullets: ['a'] })
  assert.ok(text.includes('- a'))
})

test('reasons and field strings are complete in both languages', () => {
  for (const r of NOT_DONE_REASONS) {
    assert.ok(r.en && r.es)
  }
  assert.equal(reasonLabel('no_access', 'es'), 'Sin acceso / área cerrada')
  assert.equal(reasonLabel('unknown_id'), 'unknown_id')
  const enKeys = Object.keys(FIELD_STRINGS.en).sort()
  assert.deepEqual(Object.keys(FIELD_STRINGS.es).sort(), enKeys)
  for (const s of Object.values(FIELD_STRINGS.es)) {
    if (typeof s === 'string') assert.ok(!s.includes('—'))
  }
})

test('local calendar date is right for Central time on both sides of UTC midnight', () => {
  const tz = 'America/Chicago'
  // 10am Oct 25 local
  assert.equal(getLocalDateUTC(new Date('2026-10-25T15:00:00Z'), tz).toISOString(), '2026-10-25T00:00:00.000Z')
  // 10pm Oct 25 local (already Oct 26 in UTC)
  assert.equal(getLocalDateUTC(new Date('2026-10-26T03:00:00Z'), tz).toISOString(), '2026-10-25T00:00:00.000Z')
  // 1am Oct 26 local
  assert.equal(getLocalDateUTC(new Date('2026-10-26T06:00:00Z'), tz).toISOString(), '2026-10-26T00:00:00.000Z')
})

test('start of local day is the instant of local midnight, today not yesterday', () => {
  const start = (iso: string, tz: string) => getStartOfLocalDay(new Date(iso), tz).toISOString()
  const ct = 'America/Chicago'
  // 10am and 10pm Oct 25 CDT both start at Oct 25 00:00 CDT
  assert.equal(start('2026-10-25T15:00:00Z', ct), '2026-10-25T05:00:00.000Z')
  assert.equal(start('2026-10-26T03:00:00Z', ct), '2026-10-25T05:00:00.000Z')
  // CST in winter
  assert.equal(start('2026-12-10T18:00:00Z', ct), '2026-12-10T06:00:00.000Z')
  // DST days: Nov 1 starts in CDT, Mar 8 starts in CST
  assert.equal(start('2026-11-01T20:00:00Z', ct), '2026-11-01T05:00:00.000Z')
  assert.equal(start('2026-03-08T20:00:00Z', ct), '2026-03-08T06:00:00.000Z')
  // Zones east of UTC and UTC itself
  assert.equal(start('2026-10-25T20:00:00Z', 'Asia/Tokyo'), '2026-10-25T15:00:00.000Z')
  assert.equal(start('2026-10-25T20:00:00Z', 'UTC'), '2026-10-25T00:00:00.000Z')
})

test('next send slot lands on an allowed local day inside the window', () => {
  const window = { timezone: 'America/Chicago', hourStart: 9, hourEnd: 11, daysOfWeek: [1, 2, 3, 4, 5] }
  // Saturday Oct 24, noon CDT: next slot is Monday Oct 26 between 9 and 11 CDT
  const slot = nextSendSlot(new Date('2026-10-24T17:00:00Z'), window)
  assert.equal(getLocalDayOfWeek(slot, window.timezone), 1)
  assert.equal(getLocalDateUTC(slot, window.timezone).toISOString(), '2026-10-26T00:00:00.000Z')
  const h = getLocalHour(slot, window.timezone)
  assert.ok(h >= 9 && h < 11, `hour ${h}`)
})

test('money lines in notes are hidden from managers and survive their edits', () => {
  const stored = [
    'Note: Negative margin (labor $7,200 vs revenue $6,588).',
    'Kitchen floors and drains nightly.',
    'Monthly revenue: $6,588',
    'Monthly profit: $-612',
    'Margin: 53.3%',
    'Seasonal: Feb to Sep (2027 pricing schedule), paused Oct to Jan.',
  ].join('\n')
  const visible = stripFinancialLines(stored)
  assert.equal(visible, 'Kitchen floors and drains nightly.\nSeasonal: Feb to Sep (2027 pricing schedule), paused Oct to Jan.')
  assert.equal(stripFinancialLines('Monthly revenue: $5,421\nMonthly profit: $1,821'), null)

  const row = { serviceNotes: stored, painPoints: null, name: 'HSB | Summit' }
  assert.equal(hideFinancialNotes(row, 'MANAGER').serviceNotes, visible)
  assert.equal(hideFinancialNotes(row, 'SUPER_ADMIN').serviceNotes, stored)
  assert.equal(hideFinancialNotes({ notes: 'CDNC: $23,000/mo. Reconcile.' }, 'MANAGER').notes, null)

  // A manager saves the redacted note with one line added: nothing hidden is lost.
  const saved = keepHiddenFinancialLines(stored, `${visible}\nGate code changed.`)!
  for (const line of stored.split('\n')) assert.ok(saved.includes(line), line)
  assert.ok(saved.includes('Gate code changed.'))
  assert.equal(stripFinancialLines(saved), `${visible}\nGate code changed.`)
})
