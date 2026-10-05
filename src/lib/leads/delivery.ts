import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { buildLeadEmail, sendLeadEmail, type LeadEmailRequest } from './email'
import { enrollLeadInSequence } from './enroll'
import type { LeadPayload } from './schema'

export const MAX_DELIVERY_ATTEMPTS = 8
export const SAFE_RETRY_WINDOW_MS = 23 * 60 * 60_000

export function deliveryFailure(attempts: number, firstAttemptAt: Date, now = new Date()) {
  const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS || now.getTime() - firstAttemptAt.getTime() >= SAFE_RETRY_WINDOW_MS
  return {
    status: exhausted ? 'failed' : 'pending',
    nextAttemptAt: new Date(now.getTime() + Math.min(60, 2 ** Math.max(0, attempts - 1)) * 60_000),
  }
}

function safeError(error: unknown): string {
  if (error instanceof Error && /^(resend_(not_configured|missing_message_id|http_\d{3})|enrollment_[a-z_]+|delivery_[a-z_]+)$/.test(error.message)) {
    return error.message
  }
  return 'delivery_transport_or_processing_error'
}

// Claim one row at a time so a slow request never consumes another job's lease.
// SQL binds all values. Expired leases recover crashes and serverless shutdowns.
export async function drainLeadDeliveries(limit = 10, intakeId: string | null = null) {
  const results = { sent: 0, retried: 0, failed: 0, leaseLost: 0 }
  const deadline = Date.now() + 40_000
  for (let i = 0; i < limit && Date.now() < deadline; i++) {
    const lockToken = randomUUID()
    const ids = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE lead_deliveries SET
        status = 'processing', lock_token = ${lockToken},
        locked_until = NOW() + INTERVAL '2 minutes', attempts = attempts + 1,
        first_attempt_at = COALESCE(first_attempt_at, NOW()), updated_at = NOW()
      WHERE id = (
        SELECT id FROM lead_deliveries
        WHERE ((status = 'pending' AND next_attempt_at <= NOW())
          OR (status = 'processing' AND locked_until <= NOW()))
          AND (${intakeId}::text IS NULL OR intake_id = ${intakeId})
        ORDER BY next_attempt_at, created_at
        FOR UPDATE SKIP LOCKED LIMIT 1
      ) RETURNING id
    `
    if (!ids.length) break
    const job = await prisma.leadDelivery.findUniqueOrThrow({
      where: { id: ids[0].id }, include: { intake: true },
    })
    const owned = { id: job.id, status: 'processing', lockToken }
    let providerId: string
    try {
      if (job.attempts > MAX_DELIVERY_ATTEMPTS ||
          Date.now() - job.firstAttemptAt!.getTime() >= SAFE_RETRY_WINDOW_MS) {
        throw new Error('delivery_retry_window_exhausted')
      }
      if (job.kind === 'enrollment') {
        const sequenceId = (job.request as { sequenceId?: string } | null)?.sequenceId
        if (!sequenceId) throw new Error('enrollment_template_invalid')
        providerId = await enrollLeadInSequence(job.intake.prospectId, job.intake.companyId, sequenceId)
      } else if (job.kind === 'notification' || job.kind === 'autoresponder') {
        const body = job.request
          ? job.request as unknown as LeadEmailRequest
          : await buildLeadEmail(job.intake.payload as unknown as LeadPayload, job.kind)
        if (!job.request) {
          const stored = await prisma.leadDelivery.updateMany({
            where: owned, data: { request: body as unknown as Prisma.InputJsonValue },
          })
          if (stored.count !== 1) { results.leaseLost++; continue }
        }
        providerId = await sendLeadEmail(body, `lead/${job.id}`)
      } else {
        throw new Error('delivery_unknown_kind')
      }
    } catch (error) {
      const failure = deliveryFailure(job.attempts, job.firstAttemptAt!)
      console.warn('[leads] delivery failed', { id: job.id, kind: job.kind, status: failure.status, error: safeError(error) })
      const updated = await prisma.leadDelivery.updateMany({
        where: owned,
        data: { ...failure, lastError: safeError(error), lockedUntil: null, lockToken: null },
      })
      if (updated.count !== 1) results.leaseLost++
      else if (failure.status === 'failed') results.failed++
      else results.retried++
      continue
    }
    // If this database write fails after a send, the lease expires and Resend's
    // idempotency key reconciles the uncertain outcome on the next attempt.
    const updated = await prisma.leadDelivery.updateMany({
      where: owned,
      data: { status: 'sent', providerId, sentAt: new Date(), lastError: null, lockedUntil: null, lockToken: null },
    })
    if (updated.count === 1) results.sent++
    else results.leaseLost++
  }
  return results
}
