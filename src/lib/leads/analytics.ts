type Pixel = (...args: unknown[]) => void

interface LeadEventQueueOptions {
  readPixel: () => Pixel | undefined
  now: () => number
  schedule: (callback: () => void, delayMs: number) => () => void
  maxWaitMs?: number
  pollMs?: number
}

/** Fresh saved intakes declare duplicate:false. Older durable API responses
 * omit accepted; tolerate those while rejecting explicit nonacceptance.
 */
export function isTrackableLeadResponse(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false
  const receipt = data as Record<string, unknown>
  const accepted = receipt.accepted === undefined || receipt.accepted === true
  return receipt.ok === true && accepted && receipt.duplicate === false
}

/** Briefly wait for the existing pixel bootstrap. Never initialize a pixel,
 * reload a blocked script, change consent, or send through another transport.
 * Only opaque submission IDs are retained in memory; nothing is logged.
 */
export function createLeadEventQueue({
  readPixel, now, schedule, maxWaitMs = 10_000, pollMs = 100,
}: LeadEventQueueOptions) {
  const seen = new Set<string>()
  const pending = new Map<string, number>()
  let cancelTimer: (() => void) | undefined

  function flush() {
    cancelTimer?.()
    cancelTimer = undefined
    for (const [id, deadline] of pending) {
      if (now() >= deadline) pending.delete(id)
    }
    if (!pending.size) return

    let pixel: Pixel | undefined
    try {
      pixel = readPixel()
    } catch {
      pending.clear()
      return
    }
    if (pixel) {
      for (const id of pending.keys()) {
        pending.delete(id)
        // Consume before calling: an exception or re-entrant call must not
        // produce another attempt or override a browser/pixel restriction.
        try { pixel('track', 'Lead') } catch { /* Tracking is best-effort. */ }
      }
    }
    if (pending.size) cancelTimer = schedule(flush, pollMs)
  }

  return {
    enqueue(id: string) {
      if (seen.has(id)) return
      seen.add(id)
      pending.set(id, now() + maxWaitMs)
      flush()
    },
    dispose() {
      cancelTimer?.()
      cancelTimer = undefined
      pending.clear()
    },
  }
}

let browserQueue: ReturnType<typeof createLeadEventQueue> | undefined

export function queueMetaLeadEvent(submissionId: string) {
  if (typeof window === 'undefined') return
  if (!browserQueue) {
    browserQueue = createLeadEventQueue({
      readPixel: () => {
        const browser = window as unknown as { fbq?: Pixel }
        return typeof browser.fbq === 'function' ? browser.fbq.bind(browser) : undefined
      },
      now: () => Date.now(),
      schedule: (callback, delayMs) => {
        const timer = window.setTimeout(callback, delayMs)
        return () => window.clearTimeout(timer)
      },
    })
    window.addEventListener('pagehide', () => browserQueue?.dispose())
  }
  browserQueue.enqueue(submissionId)
}
