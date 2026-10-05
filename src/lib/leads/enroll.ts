import { prisma } from '@/lib/db'
import { enrollProspectInSequence } from '@/lib/services/outreach-enroll'

// Enrollment uses the same database as intake, with one atomic transaction so
// a crash cannot leave a half-created campaign that then looks "already enrolled".
export async function enrollLeadInSequence(prospectId: string, companyId: string, sequenceId: string): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${prospectId + sequenceId}, 2))`
    const template = await tx.outreachCampaign.findFirst({
      where: { id: sequenceId, companyId, prospectId: null },
      include: { messages: { orderBy: { step: 'asc' } } },
    })
    if (!template || !template.messages.length) throw new Error('enrollment_template_invalid')
    const creator = await tx.user.findFirst({ where: { id: template.createdById, companyId, isActive: true } })
    if (!creator) throw new Error('enrollment_creator_invalid')
    const prospect = await tx.prospect.findFirst({
      where: { id: prospectId, companyId, deletedAt: null }, include: { contacts: true },
    })
    if (!prospect || prospect.doNotContact) throw new Error('enrollment_prospect_unavailable')
    const company = await tx.company.findUnique({
      where: { id: companyId }, include: { branches: { where: { isActive: true, code: 'AUS' }, take: 1 } },
    })
    const result = await enrollProspectInSequence({
      template, prospect, companyId, userId: template.createdById,
      company: company ? { ...company, timezone: company.branches[0]?.timezone || 'America/Chicago' } : null,
    }, tx)
    if ('skipped' in result) {
      if (result.reason === 'already_enrolled') return 'already_enrolled'
      throw new Error('enrollment_skipped')
    }
    return result.campaignId
  }, { timeout: 10_000 })
}
