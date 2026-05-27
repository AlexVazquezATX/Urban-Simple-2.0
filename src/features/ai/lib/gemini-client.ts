import { GoogleGenerativeAI, type Content } from '@google/generative-ai'
import { ACTION_TOOLS } from './action-tools'

// Accept either env var name. GOOGLE_GEMINI_API_KEY is the project's
// canonical name (used in Vercel and by src/lib/ai/creative-generator.ts);
// GEMINI_API_KEY is supported as a fallback for older local setups.
export const GEMINI_API_KEY =
  process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// Cassie's model id. Override at runtime with the GEMINI_MODEL env var if a
// newer/different model is released — no code change needed. Default is the
// latest fast Flash model. If the chosen id is wrong the API returns a clean
// "model not found" error and you can swap it via env.
export const GEMINI_MODEL_ID =
  process.env.GEMINI_MODEL || 'gemini-3.5-flash'

const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL_ID,
})

// Same model with action-taking tools attached. Used for chat turns where the
// user might be asking for a record change; the model can either call a tool
// (action path) or return plain text (question path). Reused across turns.
const modelWithTools = genAI.getGenerativeModel({
  model: GEMINI_MODEL_ID,
  // The Gemini SDK accepts a list of Tool objects; we structure tools in
  // action-tools.ts using SchemaType. Cast through unknown to satisfy the
  // strict SDK type without losing the schema's structure at runtime.
  tools: ACTION_TOOLS as unknown as Parameters<
    typeof genAI.getGenerativeModel
  >[0]['tools'],
})

export interface GeminiChatOptions {
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
}

export type GeminiToolOrAnswer =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool_call'
      name: string
      args: Record<string, unknown>
      /**
       * Verbatim model content from the SDK response. Echo this back into the
       * `contents` array on the next turn so unknown fields like
       * `thoughtSignature` (required by Gemini 3.x for multi-turn function
       * calling) round-trip correctly. The SDK type (Content) doesn't declare
       * thoughtSignature, but the raw object preserves it.
       */
      modelContent: Content
    }

/**
 * Cassie's personality string — the existing chat's default system prompt,
 * exported so the chat route can compose larger prompts (e.g. with the
 * action-tools addendum) without duplicating it.
 */
export const CASSIE_SYSTEM_PROMPT = `You are Cassie, Alex's personal AI business assistant for Urban Simple, his commercial cleaning company management platform.

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
    if (!GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY not configured. Set GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY) in .env.local.'
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
    if (!GEMINI_API_KEY) {
      throw new Error(
        'GEMINI_API_KEY not configured. Set GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY) in .env.local.'
      )
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

/**
 * Unified action-or-answer chat turn. Sends the assembled prompt to Gemini
 * with the action tools attached. If the model chose to call a tool (e.g.
 * propose_action_chain or ask_clarification), returns the tool call. Otherwise
 * returns the plain-text answer.
 *
 * Accepts either a single string (one-shot) or a Content[] (multi-turn — the
 * caller drives the loop, appending model functionCall + user functionResponse
 * parts and calling again until a terminal answer is returned).
 */
export async function sendChatWithTools(
  input: string | Content[]
): Promise<GeminiToolOrAnswer> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY not configured. Set GOOGLE_GEMINI_API_KEY (or GEMINI_API_KEY) in .env.local.'
    )
  }

  try {
    const request =
      typeof input === 'string'
        ? input
        : { contents: input }
    const result = await modelWithTools.generateContent(request as any)
    const response = result.response

    // Function calls take precedence over text. The SDK exposes them via a
    // method; guard in case future versions change the shape.
    const fnCalls =
      typeof response.functionCalls === 'function'
        ? response.functionCalls()
        : undefined
    if (Array.isArray(fnCalls) && fnCalls.length > 0) {
      const call = fnCalls[0]
      // Pull the raw model Content from the response so the caller can echo
      // it back verbatim (with all SDK-unknown fields intact, including the
      // thoughtSignature that Gemini 3.x requires for multi-turn function
      // calling). Fall back to a synthesized minimal Content if the candidate
      // shape is unexpected.
      const candidateContent: Content | undefined = (response as any)?.candidates?.[0]?.content
      const modelContent: Content =
        candidateContent && Array.isArray(candidateContent.parts)
          ? candidateContent
          : {
              role: 'model',
              parts: [{ functionCall: { name: call.name, args: call.args ?? {} } }],
            }
      return {
        kind: 'tool_call',
        name: call.name,
        args: (call.args as Record<string, unknown>) ?? {},
        modelContent,
      }
    }

    // No tool call — fall back to text. Wrap in try/catch because text() may
    // throw if the response was a pure (empty) function-call envelope.
    let text = ''
    try {
      text = response.text()
    } catch {
      text = ''
    }
    return { kind: 'text', text }
  } catch (error: any) {
    // Log the full error verbatim so dev server output shows the actual cause
    // (auth, schema rejection, model id mismatch, etc.) rather than the
    // sanitized re-thrown message swallowing the detail.
    console.error('[sendChatWithTools] Gemini SDK error:', error?.message, error?.stack)
    // Only treat as an auth issue if the message is unambiguously about the key.
    // Many unrelated errors include the substring "API key" (e.g. quota text);
    // don't rewrite them into the misleading "key invalid" message.
    if (
      typeof error?.message === 'string' &&
      /api[_\s]?key not valid|invalid api key|API_KEY_INVALID/i.test(error.message)
    ) {
      throw new Error(
        'Gemini API key is invalid. Please check your GOOGLE_GEMINI_API_KEY in .env.local'
      )
    }
    if (typeof error?.message === 'string' && /quota|rate.?limit/i.test(error.message)) {
      throw new Error('Gemini API quota exceeded. Please check your Google Cloud billing.')
    }
    throw new Error(`Gemini tools error: ${error?.message ?? String(error)}`)
  }
}
