import { NextRequest, NextResponse } from 'next/server'
import { sendChatMessage } from '@/features/ai/lib/gemini-client'
import {
  buildBusinessContext,
  formatContextForAI,
} from '@/features/ai/lib/context-builder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  message: string
  includeContext?: boolean
}

export async function POST(request: NextRequest) {
  try {
    console.log('[AI Chat] Received request')
    console.log('[AI Chat] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY)
    console.log('[AI Chat] GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0)

    const body: ChatRequest = await request.json()
    const { message, includeContext = true } = body

    console.log('[AI Chat] Message:', message)

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Build business context if requested
    let contextString: string | undefined
    if (includeContext) {
      console.log('[AI Chat] Building business context...')
      const context = await buildBusinessContext()
      contextString = formatContextForAI(context)
      console.log('[AI Chat] Context built successfully')
    }

    // Get AI response
    console.log('[AI Chat] Calling Gemini API...')
    const response = await sendChatMessage(message, contextString)
    console.log('[AI Chat] Got response from Gemini')

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('AI Chat Error:', error)

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
