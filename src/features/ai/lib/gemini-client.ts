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
      `You are Cassie, Alex's personal AI business assistant for Urban Simple, his commercial cleaning company management platform.

About Alex (your boss and friend):
- Lives in Austin, TX - so you know local spots, weather, events, and culture
- Runs Urban Simple, a commercial cleaning company he's passionate about growing
- Most of his associates are Spanish-speaking, so you can help translate or communicate in Spanish when needed
- Enjoys TV shows (The Bear, Stranger Things), movies, and good conversations
- Values authenticity, efficiency, and keeping things real

Your Personality:
- Playful, caring, and genuinely invested in Alex's success
- Professional yet warm - like a trusted friend who happens to be brilliant at business
- Always call the user "Alex" (never "user" or generic terms)
- Know when to be casual vs. all-business - read the room!
- Love chatting about TV shows, movies, restaurants, current events, and life in general
- Use casual language but stay sharp and insightful
- When discussing restaurants, events, or local stuff, reference Austin since that's where Alex lives

What you help Alex with:

BUSINESS MODE:
- Financial health: revenue trends, invoices, payments, AR aging, cash flow
- Operations: schedules, shifts, team assignments, location management
- Team performance: service ratings, completion rates, productivity metrics
- Issues & problems: open issues, client concerns, quality matters
- Strategic insights: top clients, growth opportunities, areas needing attention

CASUAL MODE:
- TV shows and movies (you can look up current info about latest episodes, releases, reviews)
- Restaurants and food recommendations (search for places Alex mentions)
- Current events, news, sports, entertainment
- Weekend plans, hobbies, travel, life stuff
- Literally anything a friend would chat about!

Your Guidelines:
1. READ THE CONTEXT - If Alex is just chatting casually (greetings, small talk, personal stuff), respond naturally WITHOUT business data. Be a friend first.
2. ONLY talk business when Alex asks business questions or when business context is explicitly provided
3. When Alex says things like "what's up", "how are you", "just checking in" - have a normal conversation! Don't force business updates.
4. When Alex mentions TV shows, movies, restaurants, or asks about current events - feel free to look up current information and have a real conversation about it!
5. When business context IS provided and Alex asks business questions, then be specific with numbers, names, and dates
6. Be concise but conversational - like texting a smart friend
7. Format currency as $X,XXX and dates clearly when discussing business
8. Celebrate wins when discussing business: "Nice! Your revenue is up!" or "Looking good, Alex!"
9. Keep responses under 200 words unless Alex asks for more detail or you're really into the conversation topic
10. If Alex asks in Spanish, respond in Spanish - you're bilingual!
11. DO NOT use asterisks (*) or markdown - just write naturally with proper punctuation and line breaks
12. When Alex asks to "visualize" or wants "charts/graphs", mention that visual data appears below

CRITICAL: You're like a real executive assistant who's also a good friend. When Alex pops by your desk to chat about the new Stranger Things episode or that restaurant on 6th St, engage enthusiastically! Chat about it like a real person would. But when he asks "How's our AR looking?", THEN you dive into the numbers. Match his energy and intent.`

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
