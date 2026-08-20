import { prisma } from '@/lib/db'

/**
 * Cancel all pending/scheduled outreach messages for a prospect.
 * Called when: bounce detected, spam complaint, prospect replied, or Do Not Contact toggled.
 */
export async function cancelPendingMessagesForProspect(
  prospectId: string,
  reason: string,
  userId?: string
): Promise<number> {
  const result = await prisma.outreachMessage.updateMany({
    where: {
      prospectId,
      status: 'pending',
    },
    data: {
      status: 'cancelled',
    },
  })

  if (result.count > 0) {
    // ProspectActivity.userId is a REAL foreign key — the old `'system'`
    // fallback violated it and the create threw. Resolve an actual user
    // (company's first SUPER_ADMIN); if none can be found, still cancel but
    // skip the activity note rather than crash the caller (often a webhook).
    let actorId = userId ?? null
    if (!actorId) {
      const prospect = await prisma.prospect.findUnique({
        where: { id: prospectId },
        select: { companyId: true },
      })
      if (prospect) {
        const admin = await prisma.user.findFirst({
          where: { companyId: prospect.companyId, role: 'SUPER_ADMIN', isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        })
        actorId = admin?.id ?? null
      }
    }
    if (actorId) {
      await prisma.prospectActivity.create({
        data: {
          prospectId,
          userId: actorId,
          type: 'status_change',
          title: `${result.count} pending message(s) auto-cancelled`,
          description: `Reason: ${reason}`,
        },
      })
    } else {
      console.warn(`[OUTREACH CANCEL] ${result.count} message(s) cancelled for prospect ${prospectId} (${reason}) but no user found to attribute the activity note to`)
    }
  }

  return result.count
}
