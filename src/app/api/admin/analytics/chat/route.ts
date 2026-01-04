import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { AI_PERSONAS } from '@/lib/ai/prompts'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/admin/analytics/chat
 * Chat with the Analytics AI about team chat data
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can access analytics AI
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    const { message, days = 7 } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Fetch analytics data to provide context to the AI
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

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
      take: 500, // Limit to avoid huge context
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
        role: true,
      },
    })

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

    // Build analytics summary for AI context
    const totalMessages = messages.length
    const aiMessages = messages.filter((m) => m.isAiGenerated).length
    const userMessages = totalMessages - aiMessages
    const uniqueUsers = new Set(messages.map((m) => m.userId)).size

    // Channel breakdown
    const channelBreakdown = channels.map((ch) => {
      const channelMsgs = messages.filter((m) => m.channelId === ch.id)
      return {
        name: ch.name,
        type: ch.type,
        isAiEnabled: ch.isAiEnabled,
        aiPersona: ch.aiPersona,
        messageCount: channelMsgs.length,
        aiMessageCount: channelMsgs.filter((m) => m.isAiGenerated).length,
        uniqueUsers: new Set(channelMsgs.map((m) => m.userId)).size,
        totalMembers: ch._count.members,
      }
    }).filter((ch) => ch.messageCount > 0)

    // AI assistant usage
    const aiUsage = channelBreakdown
      .filter((ch) => ch.isAiEnabled)
      .map((ch) => ({
        assistant: ch.aiPersona || 'unknown',
        name: ch.name,
        questions: ch.messageCount - ch.aiMessageCount,
        responses: ch.aiMessageCount,
        users: ch.uniqueUsers,
      }))

    // User activity
    const userActivity: Record<string, { name: string; role: string; messages: number }> = {}
    messages.forEach((m) => {
      const messageUser = users.find((u) => u.id === m.userId)
      if (messageUser) {
        const userName = `${messageUser.firstName} ${messageUser.lastName}`
        if (!userActivity[m.userId]) {
          userActivity[m.userId] = {
            name: userName,
            role: messageUser.role,
            messages: 0,
          }
        }
        if (!m.isAiGenerated) {
          userActivity[m.userId].messages++
        }
      }
    })

    const topUsers = Object.values(userActivity)
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 10)

    // Sample recent messages (excluding DMs for privacy)
    const recentSamples = messages
      .filter((m) => m.channel.type !== 'direct_message')
      .slice(0, 50)
      .map((m) => {
        const messageUser = users.find((u) => u.id === m.userId)
        return {
          channel: m.channel.name,
          user: messageUser ? `${messageUser.firstName} ${messageUser.lastName}` : 'Unknown User',
          role: messageUser?.role || 'UNKNOWN',
          isAI: m.isAiGenerated,
          content: m.content.substring(0, 200), // Truncate long messages
          timestamp: m.createdAt.toISOString(),
        }
      })

    // Build context for AI
    const analyticsContext = `
CHAT ANALYTICS DATA (Last ${days} days)
Period: ${startDate.toISOString()} to ${new Date().toISOString()}

OVERVIEW:
- Total Messages: ${totalMessages}
- User Messages: ${userMessages}
- AI Messages: ${aiMessages}
- Active Users: ${uniqueUsers}
- Total Channels: ${channels.length}

CHANNEL ACTIVITY:
${channelBreakdown.map((ch) => `- ${ch.name} (${ch.type}${ch.isAiEnabled ? ', AI-enabled' : ''}): ${ch.messageCount} messages, ${ch.uniqueUsers} active users`).join('\n')}

AI ASSISTANT USAGE:
${aiUsage.length > 0 ? aiUsage.map((ai) => `- ${ai.name} (${ai.assistant}): ${ai.questions} questions from ${ai.users} users, ${ai.responses} responses`).join('\n') : 'No AI assistant usage in this period'}

TOP ACTIVE USERS:
${topUsers.map((u, i) => `${i + 1}. ${u.name} (${u.role}): ${u.messages} messages`).join('\n')}

RECENT MESSAGE SAMPLES (for context, DMs excluded):
${recentSamples.slice(0, 20).map((s) => `[${s.channel}] ${s.user} (${s.role})${s.isAI ? ' [AI]' : ''}: "${s.content}"`).join('\n')}

Use this data to answer the admin's question. Be specific, data-driven, and provide actionable insights.
`

    // Get the analytics AI persona config
    const personaConfig = AI_PERSONAS.analytics

    // Create Gemini model with system instruction
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: personaConfig.systemPrompt,
    })

    // Generate response
    const startTime = Date.now()
    const result = await model.generateContent(`${analyticsContext}\n\nADMIN QUESTION: ${message}`)
    const response = result.response
    const responseTime = Date.now() - startTime

    const aiResponse = response.text()

    return NextResponse.json({
      success: true,
      response: aiResponse,
      responseTime,
      dataContext: {
        period: `${days} days`,
        totalMessages,
        activeUsers: uniqueUsers,
        aiAssistants: aiUsage.length,
      },
    })
  } catch (error: any) {
    console.error('Analytics AI chat error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to generate analytics response', details: error.message },
      { status: 500 }
    )
  }
}
