import { prisma } from '@/lib/db'

/**
 * Automatically move prospects through pipeline stages based on engagement
 */
export async function automatePipelineStage(prospectId: string): Promise<void> {
  const prospect = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!prospect) return

  const currentStatus = prospect.status
  let newStatus: string | null = null

  // Rule 1: new → contacted (when first message sent)
  if (currentStatus === 'new') {
    const hasSentMessage = prospect.activities.some(
      (a) =>
        ['email', 'sms', 'linkedin', 'instagram_dm'].includes(a.type) &&
        a.sentAt !== null
    )
    if (hasSentMessage) {
      newStatus = 'contacted'
    }
  }

  // Rule 2: contacted → engaged (when they open/click)
  if (currentStatus === 'contacted') {
    const hasEngagement = prospect.activities.some(
      (a) => a.openedAt !== null || a.clickedAt !== null
    )
    if (hasEngagement) {
      newStatus = 'engaged'
    }
  }

  // Rule 3: engaged → qualified (when they reply)
  if (currentStatus === 'engaged') {
    const hasReply = prospect.activities.some(
      (a) => a.outcome === 'interested' || a.outcome === 'follow_up'
    )
    if (hasReply) {
      newStatus = 'qualified'
    }
  }

  // Rule 4: qualified → proposal_sent (when proposal activity logged)
  if (currentStatus === 'qualified') {
    const hasProposal = prospect.activities.some(
      (a) => a.type === 'proposal' || a.title?.toLowerCase().includes('proposal')
    )
    if (hasProposal) {
      newStatus = 'proposal_sent'
    }
  }

  // Update status if changed
  if (newStatus && newStatus !== currentStatus) {
    await prisma.prospect.update({
      where: { id: prospectId },
      data: { status: newStatus },
    })

    // Log status change activity
    await prisma.prospectActivity.create({
      data: {
        prospectId,
        userId: prospect.assignedToId || '', // Use assigned user or system
        type: 'status_change',
        title: `Status changed to ${newStatus}`,
        description: `Automatically moved from ${currentStatus} to ${newStatus} based on engagement`,
        outcome: 'status_updated',
      },
    })
  }
}

/**
 * Detect hot prospects based on engagement signals
 */
export async function detectHotProspects(
  companyId: string
): Promise<Array<{ prospectId: string; score: number; reason: string }>> {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Get prospects with recent high engagement
  const prospects = await prisma.prospect.findMany({
    where: {
      companyId,
      status: { in: ['contacted', 'engaged', 'qualified'] },
    },
    include: {
      activities: {
        where: {
          createdAt: { gte: last24h },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  const hotProspects = []

  for (const prospect of prospects) {
    let score = 0
    const reasons: string[] = []

    // Multiple opens = hot
    const opens = prospect.activities.filter((a) => a.openedAt !== null).length
    if (opens >= 3) {
      score += 30
      reasons.push(`${opens} email opens`)
    } else if (opens >= 2) {
      score += 15
      reasons.push(`${opens} email opens`)
    }

    // Click + website visit = very hot
    const clicks = prospect.activities.filter((a) => a.clickedAt !== null).length
    if (clicks >= 2) {
      score += 40
      reasons.push(`${clicks} link clicks`)
    } else if (clicks >= 1) {
      score += 20
      reasons.push('link clicked')
    }

    // Reply with interest = urgent
    const replies = prospect.activities.filter(
      (a) => a.outcome === 'interested'
    ).length
    if (replies >= 1) {
      score += 50
      reasons.push('replied with interest')
    }

    // Multiple touchpoints = engaged
    if (prospect.activities.length >= 3) {
      score += 10
      reasons.push('multiple touchpoints')
    }

    if (score >= 20) {
      hotProspects.push({
        prospectId: prospect.id,
        score,
        reason: reasons.join(', '),
      })
    }
  }

  return hotProspects.sort((a, b) => b.score - a.score)
}
