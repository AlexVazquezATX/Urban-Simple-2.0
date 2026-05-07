// Minimal auth utilities - just enough to know who's logged in
// No complex permissions yet - we'll add those when we actually need them
//
// `role` is the EFFECTIVE role (after impersonation override). `realRole`
// is what's actually stored on the user record. All authorization checks
// throughout the app should use `role` so that impersonation simulates the
// target role's experience faithfully — the role-switch endpoint itself is
// the only thing that should gate on `realRole`.

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import {
  getImpersonationCookies,
  IMPERSONATION_GATE_EMAIL,
} from '@/lib/impersonation'

// Cache the user lookup within a single request to avoid redundant DB queries
// React's cache() deduplicates calls within the same request lifecycle
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) return null

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
