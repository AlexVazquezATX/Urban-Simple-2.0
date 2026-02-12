/**
 * Simple in-memory rate limiter.
 * No external dependencies — uses a Map with automatic cleanup.
 * Good enough for single-instance deployments (Vercel serverless handles
 * per-invocation isolation, so this protects against burst abuse within
 * a single warm instance).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
let cleanupScheduled = false
function scheduleCleanup() {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setTimeout(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
    cleanupScheduled = false
  }, 5 * 60 * 1000)
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Check if a request is within rate limits.
 * @param key Unique identifier (e.g. IP address, user ID)
 * @param options Rate limit configuration
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000
  const entry = store.get(key)

  // No existing entry or window expired — allow and start fresh
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    scheduleCleanup()
    return { allowed: true, remaining: options.limit - 1, resetAt }
  }

  // Within window — check count
  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: options.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Extract client IP from request headers.
 * Works with Vercel (x-forwarded-for) and direct connections.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
