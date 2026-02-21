import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    // Get all prospects for company
    const prospects = await prisma.prospect.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        activities: {
          where: {
            createdAt: { gte: weekStart },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
        contacts: true,
      },
    })

    // Get all activities for stats
    const activities = await prisma.prospectActivity.findMany({
      where: {
        prospect: {
          companyId: user.companyId,
        },
        createdAt: { gte: weekStart },
      },
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get scheduled messages
    const scheduledMessages = await prisma.outreachMessage.findMany({
      where: {
        prospect: {
          companyId: user.companyId,
        },
        status: 'pending',
        scheduledAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
            contacts: {
              take: 1,
            },
          },
        },
        campaign: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    })

    // Calculate stats
    const messagesThisWeek = activities.filter(
      (a) => ['email', 'sms', 'linkedin', 'instagram_dm'].includes(a.type)
    ).length

    const responsesThisWeek = activities.filter(
      (a) => a.outcome === 'interested' || a.outcome === 'follow_up'
    ).length

    const responseRate = messagesThisWeek > 0 
      ? ((responsesThisWeek / messagesThisWeek) * 100).toFixed(1)
      : '0'

    // Find hot prospects (recent engagement)
    const hotProspects = prospects
      .filter((p) => {
        const recentActivities = p.activities.filter(
          (a) => a.createdAt >= weekStart
        )
        return recentActivities.some(
          (a) => a.openedAt || a.clickedAt || a.outcome === 'interested'
        )
      })
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        companyName: p.companyName,
        status: p.status,
        lastActivity: p.activities[0]?.createdAt || p.createdAt,
      }))

    // Today's tasks (follow-ups due)
    const todaysTasks = activities
      .filter((a) => {
        if (a.scheduledAt) {
          return a.scheduledAt >= todayStart && a.scheduledAt <= todayEnd
        }
        // Check if follow-up is due (7 days after last contact)
        if (a.outcome === 'follow_up' && a.completedAt) {
          const followUpDate = new Date(a.completedAt)
          followUpDate.setDate(followUpDate.getDate() + 7)
          return followUpDate <= todayEnd
        }
        return false
      })
      .slice(0, 10)

    // Recent activity feed
    const recentActivity = activities.slice(0, 20).map((a) => ({
      id: a.id,
      type: a.type,
      channel: a.channel,
      prospectId: a.prospectId,
      prospectName: a.prospect.companyName,
      title: a.title,
      description: a.description,
      outcome: a.outcome,
      createdAt: a.createdAt,
      user: a.user,
      openedAt: a.openedAt,
      clickedAt: a.clickedAt,
    }))

    return NextResponse.json({
      stats: {
        messagesThisWeek,
        responsesThisWeek,
        responseRate: parseFloat(responseRate),
        scheduledToday: scheduledMessages.length,
        hotProspects: hotProspects.length,
      },
      todaysTasks,
      recentActivity,
      scheduledMessages: scheduledMessages.map((m) => ({
        id: m.id,
        prospectId: m.prospectId,
        prospectName: m.prospect?.companyName ?? null,
        contactEmail: m.prospect?.contacts[0]?.email ?? null,
        channel: m.channel,
        subject: m.subject,
        scheduledAt: m.scheduledAt,
        campaignName: m.campaign?.name,
      })),
      hotProspects,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
