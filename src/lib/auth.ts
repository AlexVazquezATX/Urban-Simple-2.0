// Minimal auth utilities - just enough to know who's logged in
// No complex permissions yet - we'll add those when we actually need them
//
// `role` is the EFFECTIVE role (after impersonation override). `realRole`
// is what's actually stored on the user record. All authorization checks
// throughout the app should use `role` so that impersonation simulates the
// target role's experience faithfully — the role-switch endpoint itself is
// the only thing that should gate on `realRole`.

import { cache } from 'react'
import { headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { authenticateApiKey } from '@/lib/api-key-verify'
import {
  getImpersonationCookies,
  IMPERSONATION_GATE_EMAIL,
} from '@/lib/impersonation'

// When there's no Supabase session, fall back to API-key auth using the request
// headers (e.g. the Mercury agent calling with `Authorization: Bearer us_live_…`).
// Returns a user shaped exactly like the cookie path, or null.
async function authenticateFromHeaders() {
  const h = await headers()
  const authHeader = h.get('authorization')
  if (!authHeader) return null
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  // path/method are injected by middleware (the only layer that sees the real
  // pathname + verb); used for the BackHaus fence and the audit trail.
  return authenticateApiKey(authHeader, ip, {
    path: h.get('x-agent-path'),
    method: h.get('x-agent-method'),
    userAgent: h.get('user-agent'),
  })
}

// Cache the user lookup within a single request to avoid redundant DB queries
// React's cache() deduplicates calls within the same request lifecycle
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  // No browser session → try API-key auth (cookie auth always takes priority).
  if (!authUser) return authenticateFromHeaders()

  // Get user from database - minimal select for performance
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    select: {
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
    },
  })

  if (!user) return null

  const realRole = user.role
  let effectiveRole = realRole
  let impersonating = false
  let impersonatedClientId: string | null = null

  // Impersonation override: only the gated SUPER_ADMIN can swap their
  // effective role at runtime. We read the cookie last so we always know
  // the real role first — that's how we decide whether to trust the cookie.
  if (realRole === 'SUPER_ADMIN' && user.email === IMPERSONATION_GATE_EMAIL) {
    const { role: impRole, clientId: impClientId } = await getImpersonationCookies()
    if (impRole) {
      effectiveRole = impRole
      impersonating = impRole !== realRole
      impersonatedClientId = impClientId
    }
  }

  return {
    ...user,
    role: effectiveRole,
    realRole,
    impersonating,
    impersonatedClientId,
  }
})

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
  return user
}

// Unified auth for API route handlers: cookie session first, then API key.
// getCurrentUser() now performs both (the key fallback reads the request
// headers), so this simply delegates — the `request` arg is kept for the
// existing call sites and is no longer needed.
export async function getAuthenticatedUser(request?: NextRequest) {
  void request // accepted for backward-compat with existing call sites; the key path now reads headers() directly
  return getCurrentUser()
}
