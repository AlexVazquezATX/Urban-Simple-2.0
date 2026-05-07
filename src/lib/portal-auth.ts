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
import {
  getImpersonationCookies,
  IMPERSONATION_GATE_EMAIL,
} from '@/lib/impersonation'

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
    // Subscription state (Phase 4). isSelfServe=true means the client signed
    // up via the public /portal/signup flow and isn't an Urban Simple cleaning
    // customer — UI should hide cleaning-log/visits and swap copy accordingly.
    isSelfServe: boolean
    portalPlan: string | null
    portalStatus: string | null
    portalTrialEndsAt: Date | null
  }
  // The client's active locations. Their data scope is the union of these.
  locations: Array<{
    id: string
    name: string
  }>
  // True when the current user is a SUPER_ADMIN viewing the portal as a
  // CLIENT_USER for the chosen client. Pages can use this to render an
  // "exit impersonation" affordance and to soften destructive actions.
  impersonating?: boolean
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
  if (!user || !user.isActive) return null

  // Impersonation path: a gated SUPER_ADMIN can view the portal as a chosen
  // client without being linked to any ClientContact. We synthesize a
  // PortalContext from the chosen client's data instead of looking it up via
  // the ClientContact link the way real CLIENT_USERs do.
  if (user.role === 'SUPER_ADMIN' && user.email === IMPERSONATION_GATE_EMAIL) {
    const { role: impRole, clientId: impClientId } = await getImpersonationCookies()
    if (impRole === 'CLIENT_USER' && impClientId) {
      const client = await prisma.client.findFirst({
        where: { id: impClientId, deletedAt: null },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          isSelfServe: true,
          portalPlan: true,
          portalStatus: true,
          portalTrialEndsAt: true,
          locations: {
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true },
            orderBy: { name: 'asc' },
          },
        },
      })
      if (!client) return null
      return {
        userId: user.id,
        authId: user.authId!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        client: {
          id: client.id,
          name: client.name,
          logoUrl: client.logoUrl,
          isSelfServe: client.isSelfServe,
          portalPlan: client.portalPlan,
          portalStatus: client.portalStatus,
          portalTrialEndsAt: client.portalTrialEndsAt,
        },
        locations: client.locations,
        impersonating: true,
      }
    }
  }

  if (user.role !== 'CLIENT_USER') return null

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
          isSelfServe: true,
          portalPlan: true,
          portalStatus: true,
          portalTrialEndsAt: true,
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
      isSelfServe: contact.client.isSelfServe,
      portalPlan: contact.client.portalPlan,
      portalStatus: contact.client.portalStatus,
      portalTrialEndsAt: contact.client.portalTrialEndsAt,
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
