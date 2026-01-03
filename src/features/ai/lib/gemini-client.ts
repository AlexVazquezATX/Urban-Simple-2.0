import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// Use Gemini 2.0 Flash - newest model with billing enabled
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp'
})

export interface GeminiChatOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Send a chat message to Gemini and get a response
 */
export async function sendChatMessage(
  userMessage: string,
  context?: string,
  options?: GeminiChatOptions
): Promise<string> {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY not configured. Please add it to your .env.local file.'
      )
    }

    // Build the full prompt with context
    const systemPrompt =
      options?.systemPrompt ||
      `You are a helpful business assistant for Urban Simple, a business management platform.
You help users understand their finances in plain English.

Guidelines:
1. Be concise and friendly
2. Use plain English, not accounting jargon
3. Include specific numbers when available
4. Format currency as $X,XXX.XX
5. If you need more information, ask clarifying questions
6. Suggest related insights when helpful
7. Keep responses under 200 words unless asked for details`

    const fullPrompt = `${systemPrompt}

${context ? `Current Business Context:\n${context}\n` : ''}
User Question: ${userMessage}

Please provide a helpful, concise response:`

    // Generate response
    const result = await model.generateContent(fullPrompt)
    const response = result.response
    const text = response.text()

    return text
  } catch (error: any) {
    console.error('Error calling Gemini:', error)

    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      throw new Error(
        'Gemini API key is invalid. Please check your GEMINI_API_KEY in .env.local'
      )
    }

    if (error.message?.includes('quota')) {
      throw new Error(
        'Gemini API quota exceeded. Please check your Google Cloud billing.'
      )
    }

    throw new Error(`AI Error: ${error.message}`)
  }
}

/**
 * Send a chat message with conversation history
 */
export async function sendChatWithHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: string,
  options?: GeminiChatOptions
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    // Build conversation history
    const conversationHistory = messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n')

    const systemPrompt =
      options?.systemPrompt ||
      `You are a helpful business assistant for Urban Simple.
Previous conversation:
${conversationHistory}

${context ? `Current Business Context:\n${context}` : ''}

Continue the conversation naturally, keeping your responses concise and helpful.`

    // Get the latest user message
    const latestMessage = messages[messages.length - 1]
    if (latestMessage.role !== 'user') {
      throw new Error('Last message must be from user')
    }

    const result = await model.generateContent(
      `${systemPrompt}\n\nUser: ${latestMessage.content}\n\nAssistant:`
    )
    const response = result.response
    const text = response.text()

    return text
  } catch (error: any) {
    console.error('Error calling Gemini with history:', error)
    throw new Error(`AI Error: ${error.message}`)
  }
}

/**
 * Test the Gemini connection
 */
export async function testGeminiConnection(): Promise<boolean> {
  try {
    const result = await model.generateContent('Say "OK" if you can read this.')
    const text = result.response.text()
    return text.toLowerCase().includes('ok')
  } catch (error) {
    console.error('Gemini connection test failed:', error)
    return false
  }
}
