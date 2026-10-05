import { afterEach, beforeEach, mock, test } from 'node:test'
import assert from 'node:assert/strict'
import { createLeadEventQueue, isTrackableLeadResponse, queueMetaLeadEvent } from '../../src/lib/leads/analytics'

beforeEach(() => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('External requests forbidden in offline analytics tests') })
})
afterEach(() => mock.restoreAll())

function harness() {
  let clock = 0, nextTimer = 0
  let pixel: ((...args: unknown[]) => void) | undefined
  const timers = new Map<number, { at: number; callback: () => void }>()
  const events: unknown[][] = []
  const queue = createLeadEventQueue({
    readPixel: () => pixel,
    now: () => clock,
    schedule: (callback, delayMs) => {
      const id = ++nextTimer
      timers.set(id, { at: clock + delayMs, callback })
      return () => { timers.delete(id) }
    },
  })
  return {
    queue, events,
    ready: () => { pixel = (...args) => { events.push(args) } },
    fail: () => { pixel = () => { events.push(['attempt']); throw new Error('Pixel refuses this event') } },
    timerCount: () => timers.size,
    advance(ms: number) {
      const until = clock + ms
      for (;;) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > until) break
        clock = next[1].at
        timers.delete(next[0])
        next[1].callback()
      }
      clock = until
    },
  }
}

test('only a saved, nonduplicate success is eligible, including the older durable API response', () => {
  assert.equal(isTrackableLeadResponse({ ok: true, accepted: true, duplicate: false }), true)
  assert.equal(isTrackableLeadResponse({ ok: true, duplicate: false }), true)
  for (const response of [
    { ok: true, accepted: false }, // Honeypot.
    { ok: true, accepted: true, duplicate: true },
    { ok: false, accepted: true, duplicate: false },
    { ok: true }, { ok: true, accepted: true },
    { ok: true, accepted: 'true', duplicate: false }, null, 'success',
  ]) assert.equal(isTrackableLeadResponse(response), false)
})

test('ready pixel receives one Lead immediately, without submission data', () => {
  const h = harness(); h.ready(); h.queue.enqueue('submission-a')
  assert.deepEqual(h.events, [['track', 'Lead']])
  assert.equal(h.timerCount(), 0)
})

test('delayed existing initialization receives the pending Lead exactly once', () => {
  const h = harness(); h.queue.enqueue('submission-a'); h.queue.enqueue('submission-a')
  h.advance(2_000); assert.deepEqual(h.events, [])
  h.ready(); h.advance(100)
  h.queue.enqueue('submission-a'); h.advance(10_000)
  assert.deepEqual(h.events, [['track', 'Lead']])
  assert.equal(h.timerCount(), 0)
})

test('two distinct saved submissions retain their separate conversion events', () => {
  const h = harness(); h.queue.enqueue('submission-a'); h.queue.enqueue('submission-b')
  h.ready(); h.advance(100)
  assert.deepEqual(h.events, [['track', 'Lead'], ['track', 'Lead']])
})

test('absent or withheld pixel expires without initialization, fallback transport or later replay', () => {
  const h = harness(); h.queue.enqueue('submission-a'); h.advance(10_000)
  assert.equal(h.timerCount(), 0); assert.deepEqual(h.events, [])
  h.ready(); h.advance(10_000); h.queue.enqueue('submission-a')
  assert.deepEqual(h.events, [])
})

test('page disposal cancels a pending conversion', () => {
  const h = harness(); h.queue.enqueue('submission-a'); h.queue.dispose()
  h.ready(); h.advance(10_000)
  assert.equal(h.timerCount(), 0); assert.deepEqual(h.events, [])
})

test('a pixel restriction or exception is not retried', () => {
  const h = harness(); h.fail(); h.queue.enqueue('submission-a'); h.advance(10_000)
  h.queue.enqueue('submission-a')
  assert.deepEqual(h.events, [['attempt']]); assert.equal(h.timerCount(), 0)
})

test('server-side invocation does not create tracking or timers', () => {
  assert.equal(typeof window, 'undefined')
  assert.doesNotThrow(() => queueMetaLeadEvent('submission-a'))
})
