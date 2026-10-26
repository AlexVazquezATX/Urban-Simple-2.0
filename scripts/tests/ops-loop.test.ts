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
import { FIELD_STRINGS } from '../../src/lib/ops/field-i18n'

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
  assert.equal(apiAllowed('/api/issues', 'POST', A), true)
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
