// Minimal auth utilities - just enough to know who's logged in
// No complex permissions yet - we'll add those when we actually need them

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

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

  return user
})

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
  return user
}






