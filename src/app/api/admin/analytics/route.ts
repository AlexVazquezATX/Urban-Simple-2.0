import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/admin/analytics
 * Fetch aggregated chat analytics for administrators
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can access analytics
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    // Safety check for companyId
    if (!user.companyId) {
      console.error('User has no companyId:', user)
      return NextResponse.json(
        { error: 'User has no company association' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all messages for the company in the time period
    const messages = await prisma.message.findMany({
      where: {
        channel: {
          companyId: user.companyId,
        },
        createdAt: {
          gte: startDate,
        },
        isDeleted: false,
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            isAiEnabled: true,
            aiPersona: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Fetch user details separately
    const userIds = [...new Set(messages.map((m) => m.userId))]
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
      },
    })

    // Get all channels for the company
    const channels = await prisma.channel.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        _count: {
          select: {
            members: true,
            messages: true,
          },
        },
      },
    })

    // Calculate active users from messages already fetched
    const userMessageCounts: Record<string, number> = {}
    messages.forEach((m) => {
      if (!m.isAiGenerated) {
        userMessageCounts[m.userId] = (userMessageCounts[m.userId] || 0) + 1
      }
    })

    // Get full user details for active users
    const activeUserIds = Object.keys(userMessageCounts)
    const activeUsers = users
      .filter((u) => activeUserIds.includes(u.id))
      .map((u) => ({
        ...u,
        _count: {
          messages: userMessageCounts[u.id] || 0,
        },
      }))

    // Aggregate metrics
    const totalMessages = messages.length
    const aiMessages = messages.filter((m) => m.isAiGenerated).length
    const userMessages = totalMessages - aiMessages
    const uniqueUsers = new Set(messages.map((m) => m.userId)).size

    // Channel activity
    const channelActivity = channels.map((channel) => {
      const channelMessages = messages.filter((m) => m.channelId === channel.id)
      const channelUsers = new Set(channelMessages.map((m) => m.userId)).size

      return {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
        type: channel.type,
        isAiEnabled: channel.isAiEnabled,
        aiPersona: channel.aiPersona,
        messageCount: channelMessages.length,
        activeUsers: channelUsers,
        totalMembers: channel._count.members,
      }
    })

    // AI assistant usage
    const aiChannels = channels.filter((c) => c.isAiEnabled)
    const aiUsage = aiChannels.map((channel) => {
      const channelMessages = messages.filter((m) => m.channelId === channel.id)
      const userQuestions = channelMessages.filter((m) => !m.isAiGenerated)
      const aiResponses = channelMessages.filter((m) => m.isAiGenerated)

      return {
        persona: channel.aiPersona,
        name: channel.name,
        questions: userQuestions.length,
        responses: aiResponses.length,
        uniqueUsers: new Set(userQuestions.map((m) => m.userId)).size,
      }
    })

    // Daily activity (messages per day)
    const dailyActivity = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const dayMessages = messages.filter(
        (m) => m.createdAt >= date && m.createdAt < nextDate
      )

      dailyActivity.push({
        date: date.toISOString().split('T')[0],
        messages: dayMessages.length,
        users: new Set(dayMessages.map((m) => m.userId)).size,
        aiMessages: dayMessages.filter((m) => m.isAiGenerated).length,
      })
    }

    // Top active users
    const topUsers = activeUsers
      .sort((a, b) => b._count.messages - a._count.messages)
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        name: u.displayName || `${u.firstName} ${u.lastName}`,
        role: u.role,
        messageCount: u._count.messages,
      }))

    // Most active channels
    const topChannels = channelActivity
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10)

    // Recent activity summary (last 24 hours)
    const yesterday = new Date()
    yesterday.setHours(yesterday.getHours() - 24)
    const last24hMessages = messages.filter((m) => m.createdAt >= yesterday)

    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      overview: {
        totalMessages,
        userMessages,
        aiMessages,
        activeUsers: uniqueUsers,
        totalChannels: channels.length,
        aiChannels: aiChannels.length,
        last24h: {
          messages: last24hMessages.length,
          users: new Set(last24hMessages.map((m) => m.userId)).size,
        },
      },
      channelActivity,
      aiUsage,
      dailyActivity,
      topUsers,
      topChannels,
      // Raw data for AI to analyze (limited to prevent massive payloads)
      recentMessages: messages.slice(0, 100).map((m) => {
        const messageUser = users.find((u) => u.id === m.userId)
        return {
          id: m.id,
          content: m.channel.type !== 'direct_message' ? m.content : '[DM - content hidden]',
          channelName: m.channel.name,
          channelType: m.channel.type,
          isAiGenerated: m.isAiGenerated,
          userName: messageUser ? `${messageUser.firstName || ''} ${messageUser.lastName || ''}`.trim() : 'Unknown User',
          userRole: messageUser?.role || 'UNKNOWN',
          createdAt: m.createdAt,
        }
      }),
    })
  } catch (error: any) {
    console.error('Analytics fetch error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    )
  }
}
