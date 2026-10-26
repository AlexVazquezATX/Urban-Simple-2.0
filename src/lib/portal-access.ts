// Portal access emails (invites + sign-in links). Server-only.
//
// Supabase's inviteUserByEmail only works for brand-new auth users; for anyone
// who already has an auth account it errors and sends nothing. For those we
// mint a recovery link with the admin API and email it ourselves, so a
// re-invite always results in a real email (or an honest "not sent").

import { createAdminClient } from '@/lib/supabase/admin'
import { appBaseUrl, sendEmail } from '@/lib/notify/email'

export function portalSetPasswordUrl(): string {
  return `${appBaseUrl()}/portal/set-password`
}

export interface PortalAccessParams {
  email: string
  firstName?: string | null
  clientName: string
  companyId: string
  clientId: string
  userId?: string | null
  /** Shown in the email, e.g. "Maria Lopez gave you access". */
  invitedByName?: string | null
}

export interface PortalAccessResult {
  /** Supabase auth user id, when known. */
  authUserId: string | null
  emailSent: boolean
  method: 'invite' | 'link' | null
  error?: string
}

/** Email an existing auth user a one-time link that lands on /portal/set-password. */
export async function sendPortalAccessLink(params: PortalAccessParams): Promise<PortalAccessResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: params.email,
    options: { redirectTo: portalSetPasswordUrl() },
  })
  const actionLink = data?.properties?.action_link
  if (error || !actionLink) {
    return {
      authUserId: null,
      emailSent: false,
      method: null,
      error: error?.message || 'Could not create a sign-in link',
    }
  }

  const greeting = params.firstName?.trim() ? `Hi ${params.firstName.trim()},` : 'Hello there,'
  const who = params.invitedByName?.trim()
    ? `${params.invitedByName.trim()} gave you access`
    : 'You have access'
  const sent = await sendEmail({
    companyId: params.companyId,
    to: params.email,
    subject: `Your Urban Simple portal access for ${params.clientName}`,
    category: 'portal',
    clientId: params.clientId,
    userId: params.userId ?? null,
    replyTo: process.env.RESEND_PORTAL_REPLY_TO || undefined,
    content: {
      kicker: 'Portal access',
      title: `Your portal for ${params.clientName}`,
      intro: `${greeting} ${who} to the Urban Simple client portal for ${params.clientName}. Use the button below to set your password and sign in. The link works once and expires after a short time.`,
      ctaLabel: 'Set your password',
      ctaUrl: actionLink,
      footer:
        'If you were not expecting this email, you can ignore it. Reply to this email to reach our team.',
    },
  })

  return {
    authUserId: data.user?.id ?? null,
    emailSent: sent,
    method: 'link',
    error: sent ? undefined : 'The email could not be sent',
  }
}

/**
 * Give someone portal access by email. New auth users get Supabase's invite
 * email; if an auth user already exists for the address, falls back to a
 * sign-in link we send ourselves.
 */
export async function invitePortalUser(params: PortalAccessParams): Promise<PortalAccessResult> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(params.email, {
    redirectTo: portalSetPasswordUrl(),
  })
  if (!error && data?.user) {
    return { authUserId: data.user.id, emailSent: true, method: 'invite' }
  }

  const fallback = await sendPortalAccessLink(params)
  if (fallback.authUserId) return fallback
  return {
    authUserId: null,
    emailSent: false,
    method: null,
    error: error?.message || fallback.error || 'Failed to send invite',
  }
}
