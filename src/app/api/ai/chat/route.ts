import { NextRequest, NextResponse } from 'next/server'
import {
  sendChatMessage,
  sendChatWithTools,
  CASSIE_SYSTEM_PROMPT,
  GEMINI_MODEL_ID,
  GEMINI_API_KEY,
} from '@/features/ai/lib/gemini-client'
import {
  buildBusinessContext,
  formatContextForAI,
} from '@/features/ai/lib/context-builder'
import {
  classifyQuery,
  enhancePromptWithClassification,
} from '@/features/ai/lib/query-classifier'
import {
  detectLanguage,
  addLanguageInstruction,
  getLanguageSystemPrompt,
} from '@/features/ai/lib/language-detector'
import { getCurrentUser } from '@/lib/auth'
import {
  getOrCreateConversation,
  saveMessage,
  getConversationHistory,
} from '@/features/ai/lib/conversation-manager'
import { generateAttachments } from '@/features/ai/lib/attachment-generator'
import {
  actionToolsSystemPromptAddendum,
  parseToolCall,
} from '@/features/ai/lib/action-tools'
import {
  buildActionContext,
  formatActionContextForLLM,
} from '@/features/ai/lib/action-context'
import type { MessageAttachment } from '@/features/ai/types/ai-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  message: string
  includeContext?: boolean
  conversationId?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AI Chat] Received request')

    // IMPORTANT: Require authentication and SUPER_ADMIN role
    const user = await getCurrentUser()

    if (!user) {
      console.log('[AI Chat] Unauthorized - no user found')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (user.role !== 'SUPER_ADMIN') {
      console.log('[AI Chat] Forbidden - user role:', user.role)
      return NextResponse.json(
        {
          error: 'Forbidden: AI Assistant is currently only available to super administrators',
          userRole: user.role,
        },
        { status: 403 }
      )
    }

    console.log('[AI Chat] Authorized user:', user.email, '(SUPER_ADMIN)')
    console.log('[AI Chat] Gemini key resolved:', !!GEMINI_API_KEY, '(length:', GEMINI_API_KEY.length, ')')

    const body: ChatRequest = await request.json()
    const { message, includeContext = true, conversationId: providedConversationId } = body

    console.log('[AI Chat] Message:', message)

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Get or create conversation
    const conversationId = providedConversationId || await getOrCreateConversation(user.id)
    console.log('[AI Chat] Conversation ID:', conversationId)

    // Load conversation history for context
    console.log('[AI Chat] Loading conversation history...')
    const conversationHistory = await getConversationHistory(conversationId)
    console.log('[AI Chat] Loaded', conversationHistory.length, 'previous messages')

    // Detect language
    console.log('[AI Chat] Detecting language...')
    const detectedLanguage = detectLanguage(message)
    console.log('[AI Chat] Language detected:', detectedLanguage)

    // Classify the query to understand intent
    console.log('[AI Chat] Classifying query...')
    const classification = classifyQuery(message)
    console.log('[AI Chat] Query classified:', classification.intent, `(${(classification.confidence * 100).toFixed(0)}% confidence)`)

    // Only include business context for business-related queries
    const needsBusinessContext = classification.intent !== 'general'

    // Build business context if needed
    let contextString: string | undefined
    let businessContext: any = null
    if (includeContext && needsBusinessContext) {
      console.log('[AI Chat] Building business context...')
      businessContext = await buildBusinessContext()
      contextString = formatContextForAI(businessContext)
      console.log('[AI Chat] Context built successfully')
    } else if (!needsBusinessContext) {
      console.log('[AI Chat] Skipping context - general conversation query')
    }

    // Build conversation history context (last 10 messages for context)
    const recentHistory = conversationHistory.slice(-10)
    let historyContext = ''
    if (recentHistory.length > 0) {
      historyContext = '\n\nRecent Conversation History:\n' +
        recentHistory.map(msg => `${msg.role === 'user' ? 'Alex' : 'You'}: ${msg.content}`).join('\n')
    }

    // Enhance the prompt with classification insights
    let enhancedMessage = contextString
      ? enhancePromptWithClassification(message, classification, contextString)
      : message

    // Add conversation history
    if (historyContext) {
      enhancedMessage = historyContext + '\n\n' + enhancedMessage
    }

    // Add language instruction if Spanish
    enhancedMessage = addLanguageInstruction(enhancedMessage, detectedLanguage)

    // Build action context (compact lists with ids the LLM uses to resolve
    // names → records when proposing changes). Skipped for casual chat.
    let actionContextString: string | undefined
    if (needsBusinessContext) {
      console.log('[AI Chat] Building action context...')
      const actionContext = await buildActionContext({
        companyId: user.companyId,
        branchId: user.branchId,
      })
      actionContextString = formatActionContextForLLM(actionContext)
    }

    // Path decision: business-y turns go through the tools-enabled call (the
    // model can either answer in text OR propose an action chain / ask for a
    // clarification). Casual turns stay on the simple chat call for speed.
    const useTools = needsBusinessContext
    let response: string
    let attachments: MessageAttachment[] = []

    console.log(
      '[AI Chat] Calling Gemini API with',
      recentHistory.length,
      'messages of history...',
      useTools ? '(tools enabled)' : '(text only)'
    )
    const startTime = Date.now()

    if (useTools) {
      const fullPrompt = [
        CASSIE_SYSTEM_PROMPT,
        actionToolsSystemPromptAddendum(),
        actionContextString,
        contextString ? `BUSINESS CONTEXT:\n${contextString}` : '',
        historyContext,
        `User: ${message}`,
        'Respond with EITHER a tool call (propose_action_chain or ask_clarification) OR plain text. Use a tool only when the user wants to make a change or you genuinely need to clarify. For questions or casual chat, respond with text.',
      ]
        .filter(Boolean)
        .join('\n\n')

      const toolResult = await sendChatWithTools(fullPrompt)
      if (toolResult.kind === 'tool_call') {
        try {
          const parsed = parseToolCall({
            name: toolResult.name,
            args: toolResult.args,
          })
          if (parsed.kind === 'actions') {
            response = `I'll set up: ${parsed.data.summary}. Review the preview below and hit Apply when ready.`
            attachments = [
              {
                type: 'proposed_action',
                data: { set: parsed.data, userPrompt: message },
              },
            ]
          } else {
            // clarification
            response = parsed.data.question
            attachments = [{ type: 'clarification', data: parsed.data }]
          }
        } catch (parseErr: any) {
          console.error('[AI Chat] Failed to parse tool call:', parseErr)
          response =
            "Hmm, I had trouble turning that into a concrete change. Could you rephrase what you'd like to do?"
        }
      } else {
        response = toolResult.text
      }
    } else {
      response = await sendChatMessage(enhancedMessage, undefined, {
        systemPrompt: undefined,
      })
    }

    const responseTime = Date.now() - startTime
    console.log('[AI Chat] Got response from Gemini in', responseTime, 'ms')

    // Save user message to conversation
    const userMessage = await saveMessage({
      conversationId,
      role: 'user',
      content: message,
      language: detectedLanguage,
      intent: classification.intent,
      confidence: classification.confidence,
      timeframe: classification.timeframe,
    })

    // Save AI response to conversation
    const assistantMessage = await saveMessage({
      conversationId,
      role: 'assistant',
      content: response,
      language: detectedLanguage,
      aiModel: GEMINI_MODEL_ID,
      responseTime,
    })

    console.log('[AI Chat] Messages saved to conversation')

    // For text-answer turns, run the existing rich-attachments generator
    // (charts/tables). Action/clarification turns supply their own attachment.
    if (attachments.length === 0 && businessContext) {
      attachments = generateAttachments(
        classification.intent,
        businessContext,
        message
      )
    }

    console.log('[AI Chat] Generated', attachments.length, 'attachments')

    return NextResponse.json({
      success: true,
      response,
      attachments,
      conversationId,
      userMessageId: userMessage.id,
      assistantMessageId: assistantMessage.id,
      timestamp: new Date().toISOString(),
      language: detectedLanguage,
      classification: {
        intent: classification.intent,
        confidence: classification.confidence,
        timeframe: classification.timeframe,
      },
    })
  } catch (error: any) {
    console.error('AI Chat Error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      cause: error.cause,
    })

    // Provide helpful error messages
    if (error.message?.includes('GEMINI_API_KEY')) {
      return NextResponse.json(
        {
          error:
            'AI assistant not configured. Please add GEMINI_API_KEY to your environment variables.',
          details: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to get AI response',
        details: error.message,
        errorType: error.constructor.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Chat API',
    model: 'Gemini 2.0 Flash',
  })
}
