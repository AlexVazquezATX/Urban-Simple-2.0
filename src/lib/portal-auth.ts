// Portal-specific auth helpers. Loads the current user, validates they are a
// CLIENT_USER linked to a real Client, and returns the scope they're allowed
// to query (their client + their locations).
//
// All portal pages and API routes should use this; never assume an arbitrary
// User can read another client's data.

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export interface PortalContext {
  userId: string
  authId: string
  email: string
  firstName: string
  lastName: string
  displayName: string | null
  // The client this portal user belongs to. They can only see this client's data.
  client: {
    id: string
    name: string
    logoUrl: string | null
  }
  // The client's active locations. Their data scope is the union of these.
  locations: Array<{
    id: string
    name: string
  }>
}

/**
 * Returns the active portal user's context, or null if the request is not
 * authenticated as a portal user. Cached per-request via React.cache().
 *
 * A "portal user" is a User with role CLIENT_USER linked to exactly one
 * ClientContact (which links to a Client). If the linkage is missing or
 * inconsistent, returns null and the page should bounce to login.
 */
export const getPortalContext = cache(async (): Promise<PortalContext | null> => {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const user = await prisma.user.findUnique({
    where: { authId: authUser.id },
    select: {
      id: true,
      authId: true,
      email: true,
      firstName: true,
      lastName: true,
      displayName: true,
      role: true,
      isActive: true,
    },
  })
  if (!user || user.role !== 'CLIENT_USER' || !user.isActive) return null

  // Find the ClientContact this user is linked to (and through it, the Client).
  const contact = await prisma.clientContact.findFirst({
    where: { userId: user.id, isPortalUser: true },
    select: {
      client: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          deletedAt: true,
          locations: {
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
      },
    },
  })
  if (!contact || !contact.client || contact.client.deletedAt !== null) return null

  return {
    userId: user.id,
    authId: user.authId!,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    client: {
      id: contact.client.id,
      name: contact.client.name,
      logoUrl: contact.client.logoUrl,
    },
    locations: contact.client.locations,
  }
})

/**
 * Use in server components to enforce portal auth. Redirects to /portal/login
 * if the user is not a valid portal user.
 */
export async function requirePortalContext(): Promise<PortalContext> {
  const ctx = await getPortalContext()
  if (!ctx) {
    redirect('/portal/login')
  }
  return ctx
}
