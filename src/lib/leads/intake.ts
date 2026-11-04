import { createHash, randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { buildCrmPayload } from './crm'
import { FOLLOWUP_SEQUENCE_NAME } from './followups'
import { leadReviewReason } from './junk'
import type { LeadPayload } from './schema'

export class LeadConflictError extends Error {}

// Ignore the receipt timestamp; retain attribution and notes so a distinct
// request never silently overwrites an earlier one.
export function leadFingerprint(payload: LeadPayload): string {
  const { submitted_at: _timestamp, ...content } = payload
  void _timestamp
  const normalized = { ...content, email: content.email.trim().toLowerCase() }
  const sorted = Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b)))
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex')
}

export async function persistLead(payload: LeadPayload, submissionId: string = randomUUID()) {
  const payloadHash = leadFingerprint(payload)
  return prisma.$transaction(async (tx) => {
    const companies = await tx.company.findMany({
      where: process.env.LEAD_COMPANY_ID
        ? { id: process.env.LEAD_COMPANY_ID }
        : { name: 'Urban Simple LLC' },
      select: { id: true }, take: 2,
    })
    if (companies.length !== 1) throw new Error('lead_company_configuration')
    const companyId = companies[0].id
    // These short transaction-scoped locks serialize duplicates across instances.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${companyId + payloadHash}, 0))`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${submissionId}, 1))`
    const prior = await tx.leadIntake.findUnique({ where: { submissionId } })
    if (prior) {
      if (prior.companyId !== companyId || prior.payloadHash !== payloadHash) {
        throw new LeadConflictError('submission_id_reused')
      }
      return { intakeId: prior.id, duplicate: true }
    }
    const recent = await tx.leadIntake.findFirst({
      where: { companyId, payloadHash, createdAt: { gte: new Date(Date.now() - 15 * 60_000) } },
      orderBy: { createdAt: 'desc' },
    })
    if (recent) return { intakeId: recent.id, duplicate: true }
    const branches = await tx.branch.findMany({
      where: {
        companyId, isActive: true,
        ...(process.env.LEAD_BRANCH_ID ? { id: process.env.LEAD_BRANCH_ID } : { code: 'AUS' }),
      },
      select: { id: true }, take: 2,
    })
    if (branches.length > 1 || (process.env.LEAD_BRANCH_ID && branches.length !== 1)) {
      throw new Error('lead_branch_configuration')
    }
    const ownerId = process.env.LEAD_OWNER_USER_ID
    if (ownerId) {
      const owner = await tx.user.findFirst({
        where: { id: ownerId, companyId, isActive: true, role: { in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] } },
        select: { id: true },
      })
      if (!owner) throw new Error('lead_owner_configuration')
    }
    const crm = buildCrmPayload(payload)
    // Flagged submissions alert Alex but get no automatic email.
    const review = leadReviewReason(payload)
    const sequence = review ? null : await tx.outreachCampaign.findFirst({
      where: { companyId, name: FOLLOWUP_SEQUENCE_NAME, prospectId: null, autopilot: true, status: 'active' },
      select: { id: true },
    })
    const prospect = await tx.prospect.create({
      data: {
        ...crm, companyId,
        branchId: branches[0]?.id ?? null,
        assignedToId: ownerId || null,
        notes: review ? `POSSIBLE JUNK (${review}). No automatic email sent.\n\n${crm.notes}` : crm.notes,
        tags: ['Website Lead', 'Walkthrough Request', ...(review ? ['Possible Junk'] : [])],
        contacts: { create: crm.contacts },
      },
      select: { id: true },
    })
    const intake = await tx.leadIntake.create({
      data: {
        companyId, prospectId: prospect.id, submissionId, payloadHash,
        payload: { ...payload, email: payload.email.toLowerCase() },
        deliveries: {
          create: [
            { kind: 'notification' },
            ...(review ? [] : [{ kind: 'autoresponder' }]),
            ...(sequence ? [{ kind: 'enrollment', request: { sequenceId: sequence.id } }] : []),
          ],
        },
      },
      select: { id: true },
    })
    return { intakeId: intake.id, duplicate: false }
  }, { timeout: 10_000 })
}
