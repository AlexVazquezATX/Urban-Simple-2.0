import { test } from 'node:test'
import assert from 'node:assert/strict'
import { planSendSlots } from '../../src/lib/services/send-schedule'
import { buildColdFollowUps, COLD_FOLLOWUP_STEPS, greetingFrom, replySubject } from '../../src/lib/services/cold-followups'
import { isWithinSendWindow, getLocalDateUTC } from '../../src/lib/services/autopilot-schedule'
import { sendQueueProblems } from '../../src/lib/lead-machine/health'
import { describeSendCheck } from '../../src/lib/services/outreach-recipient'

const window = { timezone: 'America/Chicago', hourStart: 9, hourEnd: 16, daysOfWeek: [2, 3, 4, 5, 6] }
const day = (d: Date) => getLocalDateUTC(d, window.timezone).toISOString().slice(0, 10)
// Monday Nov 9 2026, 10am Central: outside the Tuesday to Saturday window.
const monday = new Date('2026-11-09T16:00:00Z')

test('approved first emails are booked inside the window, a capped number a day', () => {
  const slots = planSendSlots({ count: 14, now: monday, window, dailyCap: 5, booked: new Map() })
  assert.equal(slots.length, 14)
  const perDay = new Map<string, number>()
  for (const s of slots) {
    assert.ok(isWithinSendWindow(s, window), s.toISOString())
    assert.ok(s.getTime() > monday.getTime())
    perDay.set(day(s), (perDay.get(day(s)) ?? 0) + 1)
  }
  assert.ok([...perDay.values()].every((n) => n <= 5))
  assert.deepEqual([...perDay.keys()].sort(), ['2026-11-10', '2026-11-11', '2026-11-12'])
  assert.deepEqual(slots, [...slots].sort((a, b) => a.getTime() - b.getTime()))
})

test('sends already booked on a day count against its cap', () => {
  const slots = planSendSlots({ count: 3, now: monday, window, dailyCap: 5, booked: new Map([['2026-11-10', 4]]) })
  const tuesday = slots.filter((s) => day(s) === '2026-11-10').length
  assert.equal(tuesday, 1)
  assert.equal(slots.length, 3)
})

test('follow-ups reuse the greeting, reply to the subject, and land in the window', () => {
  const sentAt = new Date('2026-11-10T17:00:00Z')
  const steps = buildColdFollowUps({
    subject: 'after close at The Rose Room', firstBody: 'Hi Kaleigh,\n\nThree levels...', sentAt, window, now: sentAt,
  })
  assert.deepEqual(steps.map((s) => s.step), [2, 3])
  for (const s of steps) {
    assert.equal(s.subject, 'Re: after close at The Rose Room')
    assert.ok(s.body.startsWith('Hi Kaleigh,\n\n'))
    assert.ok(isWithinSendWindow(s.scheduledAt, window))
  }
  assert.ok(steps[0].scheduledAt.getTime() >= sentAt.getTime() + 4 * 86_400_000)
  assert.ok(steps[1].scheduledAt.getTime() >= steps[0].scheduledAt.getTime() + 7 * 86_400_000)
})

test('a backfilled send from days ago gets its first follow-up at the next slot, not in the past', () => {
  const sentAt = new Date('2026-11-04T21:50:00Z')
  const steps = buildColdFollowUps({ subject: 'x', firstBody: 'Hi,\n\nBody', sentAt, window, now: monday })
  assert.ok(steps[0].scheduledAt.getTime() > monday.getTime())
  assert.ok(isWithinSendWindow(steps[0].scheduledAt, window))
  assert.ok(steps[1].scheduledAt.getTime() >= steps[0].scheduledAt.getTime() + 7 * 86_400_000)
})

test('greeting and subject edge cases', () => {
  assert.equal(greetingFrom('Hi,\n\nBody'), 'Hi,')
  assert.equal(greetingFrom('Hi Alexander,\n\nBody'), 'Hi Alexander,')
  assert.equal(greetingFrom('Scholz Garten has been pouring beer since 1866.'), 'Hi,')
  assert.equal(replySubject('Re: already a reply'), 'Re: already a reply')
  assert.equal(replySubject(null), 'Following up')
})

test('follow-up copy keeps the house rules', () => {
  const text = COLD_FOLLOWUP_STEPS.map((s) => s.body).join('\n')
  assert.ok(!text.includes('—'), 'no em dashes')
  assert.ok(!/\[[^\]]+\]|\{\{/.test(text), 'no placeholders')
  assert.ok(!/\b(call me|hop on a call|give me a call|phone call|stop by|drop by|swing by)\b/i.test(text))
  assert.ok(!/\b(straight with you|be honest|frankly)\b/i.test(text))
  assert.ok(!/\bAlex\b/.test(text), 'the signature signs these')
})

test('the watchdog flags approved sends that are running late', () => {
  assert.deepEqual(sendQueueProblems(0), [])
  assert.match(sendQueueProblems(3)[0], /3 approved emails/)
})

test('a blocked send never suggests showing up in person', () => {
  assert.ok(!/drop-?by|walk-?in|stop by/i.test(describeSendCheck('address_risky', 'a@b.example')))
})
