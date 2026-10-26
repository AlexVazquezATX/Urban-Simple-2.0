// Text a client will read (resolutions, messages, public replies) never
// carries em dashes; house style. Replaces them with a plain hyphen.
export function clientSafeText(value: string): string {
  return value.replace(/\s*[—―]\s*/g, ' - ').trim()
}

export const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ASSOCIATE'] as const
export const MANAGER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] as const
export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

export function isManagerRole(role: string): boolean {
  return (MANAGER_ROLES as readonly string[]).includes(role)
}

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}
