import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getAISystemPrompt, AI_PERSONAS } from '@/lib/ai/prompts'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channelId, message, language = 'en' } = await request.json()

    // Get the channel and verify it's AI-enabled
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          where: { userId: user.id },
        },
      },
    })

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }

    if (!channel.isAiEnabled) {
      return NextResponse.json(
        { error: 'This channel does not have AI assistance enabled' },
        { status: 400 }
      )
    }

    // Verify user is a member of the channel
    if (channel.members.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this channel' },
        { status: 403 }
      )
    }

    // Get persona config
    const personaConfig = channel.aiPersona
      ? AI_PERSONAS[channel.aiPersona as keyof typeof AI_PERSONAS]
      : AI_PERSONAS.general

    // Check role-based access for the AI persona
    // SUPER_ADMIN always has access to all AI assistants
    if (user.role !== 'SUPER_ADMIN' && channel.aiPersona && personaConfig) {
      if (personaConfig.allowedRoles && !personaConfig.allowedRoles.includes(user.role)) {
        return NextResponse.json(
          { error: 'You do not have access to this AI assistant' },
          { status: 403 }
        )
      }
    }

    // Get recent conversation history for context
    const recentMessages = await prisma.message.findMany({
      where: {
        channelId,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        content: true,
        isAiGenerated: true,
        userId: true,
      },
    })

    // Build conversation history (reverse to chronological order)
    const conversationHistory = recentMessages
      .reverse()
      .map((msg) => ({
        role: msg.isAiGenerated ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

    // Get system prompt
    const systemPrompt = channel.aiSystemPrompt || getAISystemPrompt(
      (channel.aiPersona as keyof typeof AI_PERSONAS) || 'general',
      {
        companyName: user.company?.name,
      }
    )

    // Add language instruction if Spanish
    let enhancedMessage = message
    if (language === 'es') {
      enhancedMessage = `[User is communicating in Spanish. Please respond in Spanish.]\n\n${message}`
    }

    // Create Gemini model with system instruction
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemPrompt,
    })

    // Start chat with history
    const chat = model.startChat({
      history: conversationHistory,
    })

    // Generate response
    const startTime = Date.now()
    const result = await chat.sendMessage(enhancedMessage)
    const response = result.response
    const responseTime = Date.now() - startTime

    const aiResponse = response.text()

    // Save user message to database
    const userMessage = await prisma.message.create({
      data: {
        channelId,
        userId: user.id,
        content: message,
        contentType: 'text',
        isAiGenerated: false,
      },
    })

    // Save AI response to database
    const aiMessage = await prisma.message.create({
      data: {
        channelId,
        userId: user.id, // AI messages attributed to the requesting user
        content: aiResponse,
        contentType: 'ai_response',
        isAiGenerated: true,
        aiModel: 'gemini-2.0-flash-exp',
        aiMetadata: {
          responseTime,
          language,
          persona: channel.aiPersona,
        },
      },
    })

    return NextResponse.json({
      success: true,
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
        userId: user.id,
        isAiGenerated: false,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
        },
      },
      aiMessage: {
        id: aiMessage.id,
        content: aiMessage.content,
        createdAt: aiMessage.createdAt,
        isAiGenerated: true,
        aiModel: aiMessage.aiModel,
        user: {
          firstName: personaConfig.aiName,
          lastName: '',
          displayName: personaConfig.aiName,
        },
      },
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
