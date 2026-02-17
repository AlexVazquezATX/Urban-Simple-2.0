import { prisma } from '@/lib/db'

interface AuditLogParams {
  userId: string
  action: 'create' | 'update' | 'delete' | 'status_change'
  entityType: string
  entityId: string
  oldValues?: Record<string, unknown> | null
  newValues?: Record<string, unknown> | null
}

/**
 * Write an audit log entry. Fire-and-forget — errors are logged but never
 * bubble up to the caller so they can't break the main request flow.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: (params.oldValues ?? undefined) as any,
        newValues: (params.newValues ?? undefined) as any,
      },
    })
  } catch (err) {
    console.error('Audit log write failed:', err)
  }
}

/**
 * Build a diff of changed fields between old and new objects.
 * Only includes fields that actually changed.
 */
export function diffFields(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack: string[],
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } | null {
  const oldValues: Record<string, unknown> = {}
  const newValues: Record<string, unknown> = {}

  for (const field of fieldsToTrack) {
    const oldVal = oldObj[field]
    const newVal = newObj[field]

    // Handle arrays (like daysOfWeek)
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        oldValues[field] = oldVal
        newValues[field] = newVal
      }
      continue
    }

    // Handle Decimal → number comparison
    const oldNorm = oldVal !== null && oldVal !== undefined && typeof oldVal === 'object' && 'toNumber' in (oldVal as any)
      ? (oldVal as any).toNumber()
      : oldVal
    const newNorm = newVal !== null && newVal !== undefined && typeof newVal === 'object' && 'toNumber' in (newVal as any)
      ? (newVal as any).toNumber()
      : newVal

    if (oldNorm !== newNorm) {
      oldValues[field] = oldNorm
      newValues[field] = newNorm
    }
  }

  if (Object.keys(oldValues).length === 0) return null
  return { oldValues, newValues }
}
