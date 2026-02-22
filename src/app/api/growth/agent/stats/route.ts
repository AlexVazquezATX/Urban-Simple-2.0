import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { prisma } from '@/lib/db'

// GET /api/growth/agent/stats — Pipeline funnel stats and daily usage
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const companyId = user.companyId

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    // Pipeline funnel counts
    const [
      totalProspects,
      newProspects,
      enrichedProspects,
      withEmails,
      scoredProspects,
      withOutreach,
      pendingApproval,
    ] = await Promise.all([
      prisma.prospect.count({ where: { companyId, source: 'ai_discovery' } }),
      prisma.prospect.count({ where: { companyId, status: 'new', aiEnriched: false } }),
      prisma.prospect.count({ where: { companyId, aiEnriched: true } }),
      prisma.prospect.count({
        where: {
          companyId,
          aiEnriched: true,
          contacts: { some: { email: { not: null } } },
        },
      }),
      prisma.prospect.count({ where: { companyId, aiScore: { not: null } } }),
      prisma.prospect.count({
        where: {
          companyId,
          outreachMessages: { some: {} },
        },
      }),
      prisma.outreachMessage.count({
        where: {
          prospect: { companyId },
          approvalStatus: 'pending',
          step: 1,
        },
      }),
    ])

    // Today's agent activity
    const todayRuns = await prisma.growthAgentRun.findMany({
      where: {
        config: { companyId },
        startedAt: { gte: today },
        status: 'completed',
        isDryRun: false,
      },
      select: { stage: true, itemsSucceeded: true },
    })

    const dailyUsage: Record<string, number> = {}
    for (const run of todayRuns) {
      dailyUsage[run.stage] = (dailyUsage[run.stage] || 0) + run.itemsSucceeded
    }

    // Get config for rate limits
    const config = await prisma.growthAgentConfig.findUnique({
      where: { companyId },
      select: {
        maxDiscoveriesPerDay: true,
        maxEmailsPerDay: true,
        maxOutreachPerDay: true,
      },
    })

    // Discovered this week
    const discoveredThisWeek = await prisma.prospect.count({
      where: {
        companyId,
        source: 'ai_discovery',
        sourceDetail: 'Growth Agent',
        createdAt: { gte: weekAgo },
      },
    })

    return NextResponse.json({
      funnel: {
        total: totalProspects,
        new: newProspects,
        enriched: enrichedProspects,
        withEmails,
        scored: scoredProspects,
        withOutreach,
        pendingApproval,
      },
      today: {
        discovered: dailyUsage['discover'] || 0,
        enriched: dailyUsage['enrich'] || 0,
        emailsFound: dailyUsage['find_emails'] || 0,
        scored: dailyUsage['score'] || 0,
        outreachGenerated: dailyUsage['generate_outreach'] || 0,
      },
      limits: config
        ? {
            discoveries: { used: dailyUsage['discover'] || 0, max: config.maxDiscoveriesPerDay },
            emails: { used: dailyUsage['find_emails'] || 0, max: config.maxEmailsPerDay },
            outreach: { used: dailyUsage['generate_outreach'] || 0, max: config.maxOutreachPerDay },
          }
        : null,
      discoveredThisWeek,
    })
  } catch (error: any) {
    console.error('Error fetching agent stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agent stats' },
      { status: 500 }
    )
  }
}
