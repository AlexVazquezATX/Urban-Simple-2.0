// Role impersonation for testing. SUPER_ADMIN can layer a "view as <role>"
// override on top of their real account without changing anything in the DB.
// The previous design mutated `user.role` directly, which permanently
// downgraded the only owner account and made it impossible to switch back
// from the UI. This module replaces that with cookie-based impersonation.
//
// Trust model: the SET endpoint enforces that the caller's real DB role is
// SUPER_ADMIN AND their email matches IMPERSONATION_GATE_EMAIL. Once set,
// downstream code trusts the cookie. The worst a tampered cookie can do is
// downgrade the caller's effective role — never elevate it.
//
// HttpOnly cookies are written server-side, so a non-admin user can't fake
// these from the browser console.

import { cookies } from 'next/headers'

export const IMPERSONATE_ROLE_COOKIE = 'us_impersonate_role'
export const IMPERSONATE_CLIENT_COOKIE = 'us_impersonate_client_id'

// Only this user is allowed to impersonate. If we ever add more super-admins,
// expand this to a list or move to a flag on the user record.
export const IMPERSONATION_GATE_EMAIL = 'alex@urbansimple.net'

export const IMPERSONABLE_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'ASSOCIATE',
  'CLIENT_USER',
] as const

export type ImpersonableRole = (typeof IMPERSONABLE_ROLES)[number]

export function isImpersonableRole(value: string | null | undefined): value is ImpersonableRole {
  return !!value && (IMPERSONABLE_ROLES as readonly string[]).includes(value)
}

export interface ImpersonationCookies {
  role: ImpersonableRole | null
  clientId: string | null
}

/**
 * Read the impersonation cookies from the current request. Server-only.
 * Callers should additionally verify the user's real role before honoring
 * the override — the cookies are untrusted on their own.
 */
export async function getImpersonationCookies(): Promise<ImpersonationCookies> {
  const c = await cookies()
  const role = c.get(IMPERSONATE_ROLE_COOKIE)?.value
  const clientId = c.get(IMPERSONATE_CLIENT_COOKIE)?.value
  return {
    role: isImpersonableRole(role) ? role : null,
    clientId: clientId || null,
  }
}
