/**
 * AI Conversation Manager
 * Handles saving, loading, and managing AI conversation history
 */

import { prisma } from '@/lib/db'

export interface SaveMessageParams {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  language?: string
  intent?: string
  confidence?: number
  timeframe?: string
  aiModel?: string
  responseTime?: number
}

/**
 * Get or create active conversation for user
 */
export async function getOrCreateConversation(userId: string): Promise<string> {
  // Try to find the most recent active conversation
  const activeConversation = await prisma.aIConversation.findFirst({
    where: {
      userId,
      isActive: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })

  if (activeConversation) {
    return activeConversation.id
  }

  // Create new conversation
  const newConversation = await prisma.aIConversation.create({
    data: {
      userId,
      title: 'New Conversation',
      isActive: true,
    },
  })

  return newConversation.id
}

/**
 * Save a message to conversation
 */
export async function saveMessage(params: SaveMessageParams) {
  const message = await prisma.aIConversationMessage.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      language: params.language || 'en',
      intent: params.intent,
      confidence: params.confidence,
      timeframe: params.timeframe,
      aiModel: params.aiModel,
      responseTime: params.responseTime,
    },
  })

  // Update conversation timestamp and auto-generate title if needed
  const conversation = await prisma.aIConversation.findUnique({
    where: { id: params.conversationId },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // Auto-generate title from first user message
  if (conversation && conversation.title === 'New Conversation' && params.role === 'user') {
    const title = params.content.length > 50
      ? params.content.substring(0, 50) + '...'
      : params.content

    await prisma.aIConversation.update({
      where: { id: params.conversationId },
      data: { title },
    })
  }

  return message
}

/**
 * Get conversation history
 */
export async function getConversationHistory(conversationId: string) {
  const messages = await prisma.aIConversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  })

  return messages
}

/**
 * Get all conversations for user
 */
export async function getUserConversations(userId: string) {
  const conversations = await prisma.aIConversation.findMany({
    where: { userId },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20, // Last 20 conversations
  })

  return conversations
}

/**
 * Create new conversation
 */
export async function createNewConversation(userId: string): Promise<string> {
  // Archive current active conversation if exists
  await prisma.aIConversation.updateMany({
    where: {
      userId,
      isActive: true,
    },
    data: {
      isActive: false,
    },
  })

  // Create new conversation
  const newConversation = await prisma.aIConversation.create({
    data: {
      userId,
      title: 'New Conversation',
      isActive: true,
    },
  })

  return newConversation.id
}

/**
 * Switch to a different conversation
 */
export async function switchConversation(userId: string, conversationId: string) {
  // Deactivate all conversations
  await prisma.aIConversation.updateMany({
    where: { userId },
    data: { isActive: false },
  })

  // Activate selected conversation
  await prisma.aIConversation.update({
    where: { id: conversationId },
    data: { isActive: true },
  })
}

/**
 * Delete conversation
 */
export async function deleteConversation(userId: string, conversationId: string) {
  await prisma.aIConversation.delete({
    where: {
      id: conversationId,
      userId, // Security: ensure user owns conversation
    },
  })
}

/**
 * Add feedback to a message
 */
export async function addMessageFeedback(
  messageId: string,
  feedback: 'thumbs_up' | 'thumbs_down',
  note?: string
) {
  await prisma.aIConversationMessage.update({
    where: { id: messageId },
    data: {
      feedback,
      feedbackNote: note,
    },
  })
}
