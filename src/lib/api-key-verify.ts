// API-key verification — the LEAF of the auth import graph.
//
// This module must NOT import from '@/lib/auth' (auth.ts imports from HERE).
// Keeping it dependency-light (prisma + crypto + rate-limit + agent-scopes)
// avoids the circular import that would arise if auth.ts and api-key-auth.ts
// imported each other. Public re-exports live in '@/lib/api-key-auth'.

import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { backhausScopeForPath, keyAllowsScope } from '@/lib/agent-scopes'

const API_KEY_PREFIX = 'us_live_'

// Burst safety for a single key (best-effort; per warm instance on serverless).
// Generous enough never to trip a human-driven agent; a backstop against a
// runaway tool loop. The authoritative runaway control is the kill switch.
const KEY_BURST_LIMIT = 300
const KEY_BURST_WINDOW_SECONDS = 60

// Generate a new raw API key: us_live_ + 32 random hex bytes
export function generateRawApiKey(): string {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('hex')
}

// Hash a raw API key with SHA-256 for storage
export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

// Get display prefix (first 12 chars) for identifying keys without exposing them
export function getKeyPrefix(rawKey: string): string {
  return rawKey.substring(0, 12)
}

// Same select shape as getCurrentUser() in src/lib/auth.ts
const USER_SELECT = {
  id: true,
  authId: true,
  companyId: true,
  branchId: true,
  email: true,
  firstName: true,
  lastName: true,
  displayName: true,
  phone: true,
  role: true,
  avatarUrl: true,
  isActive: true,
  emailSignature: true,
  signatureLogoUrl: true,
  company: {
    select: {
      id: true,
      name: true,
    },
  },
  branch: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
} as const

/** Request context bridged from middleware (it has method + real pathname). */
export interface ApiKeyRequestContext {
  /** The real request pathname (middleware-set; clients cannot spoof it). */
  path?: string | null
  /** HTTP method, uppercased. */
  method?: string | null
  /** User-agent, for the audit trail. */
  userAgent?: string | null
}

/**
 * Authenticate a raw `Authorization` header value against the ApiKey table.
 * Returns a user object shaped like getCurrentUser()'s (so downstream code can
 * read `role`/`realRole` uniformly), plus API-key metadata, or null.
 *
 * `ip` is the resolved client IP (first hop of x-forwarded-for / x-real-ip),
 * used to enforce the key's optional `allowedIps` lock.
 *
 * `ctx` carries the request path/method (bridged from middleware) so we can
 * enforce the BackHaus scope fence and write an audit row — both in this Node
 * layer where Prisma is available (middleware's Edge runtime can't be relied on
 * to reach the DB).
 */
export async function authenticateApiKey(
  authHeader: string | null,
  ip: string | null,
  ctx: ApiKeyRequestContext = {},
) {
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) return null

  const rawKey = authHeader.substring(7) // strip "Bearer "
  const keyHash = hashApiKey(rawKey)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: USER_SELECT,
      },
    },
  })

  if (!apiKey) return null
  if (!apiKey.isActive) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null
  if (!apiKey.user.isActive) return null

  // IP allowlist (defense-in-depth). Empty list = no restriction.
  if (apiKey.allowedIps.length > 0) {
    if (!ip || !apiKey.allowedIps.includes(ip)) return null
  }

  // Burst safety — best-effort, keyed by the key id.
  const rl = checkRateLimit(`apikey:${apiKey.id}`, {
    limit: KEY_BURST_LIMIT,
    windowSeconds: KEY_BURST_WINDOW_SECONDS,
  })
  if (!rl.allowed) return null

  // BackHaus fence (fail-closed): the studio subtree requires the opt-in
  // `backhaus` scope, which the wildcard `*` does NOT grant. Denying returns
  // null → the route handler responds 401. `path` is middleware-set, so a
  // client cannot spoof its way past this.
  const path = ctx.path ?? null
  if (path) {
    const requiredScope = backhausScopeForPath(path)
    if (requiredScope && !keyAllowsScope(apiKey.scopes, requiredScope)) {
      return null
    }
  }

  // Fire-and-forget usage tracking (loss-tolerant — a dropped counter is fine).
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      usageCount: { increment: 1 },
    },
  }).catch(() => {})

  // Audit every mutation. AWAITED (not fire-and-forget): on serverless the
  // instance can freeze once the response returns, dropping a detached write —
  // an audit row must not be lost. Wrapped so a DB error never breaks the
  // agent's request.
  const method = (ctx.method ?? 'GET').toUpperCase()
  if (path && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    try {
      await prisma.auditLog.create({
        data: {
          userId: apiKey.user.id,
          action: method,
          entityType: 'agent_api',
          entityId: path,
          ipAddress: ip,
          userAgent: ctx.userAgent ?? null,
        },
      })
    } catch (err) {
      console.error('[agent] audit write failed:', err)
    }
  }

  // Shape to match getCurrentUser(): a key holder has no impersonation and its
  // effective role IS its real role.
  return {
    ...apiKey.user,
    role: apiKey.user.role,
    realRole: apiKey.user.role,
    impersonating: false,
    impersonatedClientId: null as string | null,
    // API-key context (extra, non-breaking fields):
    via: 'api_key' as const,
    apiKeyId: apiKey.id,
    apiKeyScopes: apiKey.scopes,
  }
}
