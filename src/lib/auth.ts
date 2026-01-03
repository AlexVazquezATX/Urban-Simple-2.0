// Minimal auth utilities - just enough to know who's logged in
// No complex permissions yet - we'll add those when we actually need them

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  if (!authUser) return null
  
  // Get user from database
  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    include: {
      company: true,
      branch: true,
    },
  })
  
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
  return user
}



