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
    await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: userId || 'system',
        type: 'status_change',
        title: `${result.count} pending message(s) auto-cancelled`,
        description: `Reason: ${reason}`,
      },
    })
  }

  return result.count
}
