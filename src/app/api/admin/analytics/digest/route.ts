import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * POST /api/admin/analytics/digest
 * Generate a daily or weekly digest of team activity
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can generate digests
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super admin privileges required.' },
        { status: 403 }
      )
    }

    const { type = 'daily', days } = await request.json()

    // Determine time period
    const daysToAnalyze = days || (type === 'daily' ? 1 : 7)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysToAnalyze)

    // Fetch messages for the period
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
          },
        },
      },
    })

    // Build digest data
    const totalMessages = messages.length
    const aiMessages = messages.filter((m) => m.isAiGenerated).length
    const userMessages = totalMessages - aiMessages
    const uniqueUsers = new Set(messages.map((m) => m.userId)).size

    // Channel activity
    const channelActivity = channels.map((ch) => {
      const channelMsgs = messages.filter((m) => m.channelId === ch.id)
      return {
        name: ch.name,
        type: ch.type,
        isAiEnabled: ch.isAiEnabled,
        aiPersona: ch.aiPersona,
        messageCount: channelMsgs.length,
        uniqueUsers: new Set(channelMsgs.map((m) => m.userId)).size,
      }
    }).filter((ch) => ch.messageCount > 0)
      .sort((a, b) => b.messageCount - a.messageCount)

    // AI assistant interactions
    const aiChannels = channelActivity.filter((ch) => ch.isAiEnabled)
    const aiInteractions = aiChannels.map((ch) => {
      const channelMsgs = messages.filter((m) => m.channelId === ch.name)
      const questions = channelMsgs.filter((m) => !m.isAiGenerated).length
      return {
        assistant: ch.name,
        persona: ch.aiPersona,
        questions,
        users: ch.uniqueUsers,
      }
    })

    // Most active users
    const userActivity: Record<string, { name: string; role: string; messages: number }> = {}
    messages.forEach((m) => {
      if (!m.isAiGenerated) {
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
          userActivity[m.userId].messages++
        }
      }
    })

    const topUsers = Object.values(userActivity)
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 5)

    // Sample interesting conversations (non-DM, longer messages)
    const interestingMessages = messages
      .filter((m) =>
        m.channel.type !== 'direct_message' &&
        !m.isAiGenerated &&
        m.content.length > 50
      )
      .slice(0, 10)
      .map((m) => {
        const messageUser = users.find((u) => u.id === m.userId)
        return {
          channel: m.channel.name,
          user: messageUser ? `${messageUser.firstName} ${messageUser.lastName}` : 'Unknown User',
          role: messageUser?.role || 'UNKNOWN',
          content: m.content.substring(0, 200),
          timestamp: m.createdAt,
        }
      })

    // Create digest prompt
    const digestPrompt = `
You are creating a ${type} digest for Urban Simple's team communication.

TIME PERIOD: ${startDate.toLocaleDateString()} to ${new Date().toLocaleDateString()} (${daysToAnalyze} day${daysToAnalyze > 1 ? 's' : ''})

ACTIVITY SUMMARY:
- Total Messages: ${totalMessages}
- User Messages: ${userMessages}
- AI Assistant Interactions: ${aiMessages}
- Active Team Members: ${uniqueUsers}

CHANNEL ACTIVITY (Top channels by messages):
${channelActivity.slice(0, 5).map((ch, i) => `${i + 1}. ${ch.name} (${ch.type}): ${ch.messageCount} messages from ${ch.uniqueUsers} users`).join('\n')}

AI ASSISTANT USAGE:
${aiInteractions.length > 0 ? aiInteractions.map((ai) => `- ${ai.assistant}: ${ai.questions} questions from ${ai.users} users`).join('\n') : 'No AI assistant usage this period'}

TOP CONTRIBUTORS:
${topUsers.map((u, i) => `${i + 1}. ${u.name} (${u.role}): ${u.messages} messages`).join('\n')}

SAMPLE CONVERSATIONS (for context):
${interestingMessages.slice(0, 5).map((m) => `[${m.channel}] ${m.user}: "${m.content}..."`).join('\n\n')}

TASK: Create a friendly, professional digest summary for the administrator. Include:
1. Overview: Brief summary of overall activity
2. Highlights: Notable conversations, trends, or engagement patterns
3. AI Insights: How employees are using AI assistants and common questions
4. Engagement: Which channels and team members are most active
5. Recommendations: Any suggestions for improving communication or addressing concerns

FORMATTING INSTRUCTIONS:
- Use plain text only - NO markdown formatting
- Do not use asterisks, hashtags, or other formatting symbols
- Write naturally in clear, conversational English
- Use proper paragraphs and line breaks for readability
- Use section labels followed by colons (e.g., "Overview:" instead of "## Overview")

Keep it concise but informative (300-500 words). Focus on actionable insights.
`

    // Generate digest using Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    })

    const result = await model.generateContent(digestPrompt)
    const response = result.response
    const digest = response.text()

    return NextResponse.json({
      success: true,
      digest: {
        type,
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days: daysToAnalyze,
        },
        content: digest,
        metrics: {
          totalMessages,
          userMessages,
          aiMessages,
          activeUsers: uniqueUsers,
          activeChannels: channelActivity.length,
        },
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Digest generation error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Failed to generate digest', details: error.message },
      { status: 500 }
    )
  }
}
