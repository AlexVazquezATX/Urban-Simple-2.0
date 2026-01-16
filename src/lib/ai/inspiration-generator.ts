/**
 * Daily Inspiration - AI Topic Discovery
 *
 * Uses Gemini 2.0 Flash with Google Search grounding to discover:
 * 1. Austin local news (restaurants, bars, events, openings)
 * 2. Pop culture / national trending topics
 * 3. Seasonal and holiday content opportunities
 *
 * Each topic is scored for relevance and includes pre-generated post angles.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { InspirationCategory } from '@prisma/client'

// Lazy initialization of Gemini client
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey =
      process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

// ============================================
// TYPES
// ============================================

export interface DiscoveredTopic {
  title: string
  summary: string
  context: string
  category: InspirationCategory
  subcategory: string
  sourceUrl?: string
  sourceName?: string
  relevanceScore: number
  trendingScore?: number
  expiresAt?: Date
  postIdeas: PostIdea[]
  suggestedHooks: string[]
  relatedHashtags: string[]
}

export interface PostIdea {
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter'
  angle: string
  headline: string
  hook: string
  hashtags: string[]
}

export interface GenerationResult {
  success: boolean
  topics: DiscoveredTopic[]
  errors: string[]
  generationTime: number
}

// ============================================
// PROMPTS
// ============================================

const AUSTIN_LOCAL_PROMPT = `You are a social media content strategist for Urban Simple, a commercial cleaning company in Austin, TX that primarily serves restaurants, bars, hotels, and commercial kitchens.

Your job is to find CURRENT, RECENT news about Austin's restaurant, bar, and hospitality scene that would make great social media content. The content should help Urban Simple be seen as part of the Austin community - NOT as a cleaning company pushing services.

Search for the LATEST Austin news about:
- New restaurant or bar openings in Austin (last 2 weeks)
- Restaurant/bar expansions, renovations, or relocations
- Popular Austin food festivals or events happening soon
- Austin restaurants/bars winning awards or recognition
- Viral moments involving Austin restaurants/bars
- New developments with hospitality tenants
- Local chefs or restaurateurs in the news

For EACH topic you find, provide:
1. title: A catchy, engaging headline (not clickbait)
2. summary: 1-2 sentences explaining what's happening
3. context: Why this matters to Austin locals
4. subcategory: One of [restaurants, bars, events, awards, openings, local_news]
5. sourceUrl: The URL where you found this (if available)
6. sourceName: Name of the source publication
7. relevanceScore: 0-1 how relevant this is for a cleaning company's social presence
8. postIdeas: 2-3 creative post angles for different platforms
9. suggestedHooks: 3 attention-grabbing opening lines
10. relatedHashtags: 5-8 relevant hashtags (without #)

Return 4-6 topics. Focus on RECENT news (within the last week). Prioritize topics that:
- Celebrate local businesses (community support)
- Can naturally tie into cleanliness/hospitality (without being salesy)
- Are genuinely interesting to Austin locals`

const POP_CULTURE_PROMPT = `You are a social media content strategist for Urban Simple, a commercial cleaning company in Austin, TX.

Your job is to find CURRENT trending topics, viral moments, and pop culture news that could inspire engaging social media content. The goal is to participate in cultural conversations that Austin locals care about.

Search for TRENDING topics about:
- Major sporting events (Super Bowl, March Madness, playoffs)
- Award shows and entertainment news
- Viral social media moments
- Cultural events and holidays
- National food/restaurant trends
- TV shows, movies, or music everyone's talking about

For EACH topic, think about how it could relate to hospitality, restaurants, or local events in Austin. Avoid forced connections - only include topics that have a natural tie-in.

For EACH topic you find, provide:
1. title: An engaging headline
2. summary: What's trending and why
3. context: The Austin/hospitality angle (how to make it locally relevant)
4. subcategory: One of [sports, entertainment, viral, holidays, trends, music, movies]
5. relevanceScore: 0-1 how naturally this connects to hospitality
6. trendingScore: 0-1 how "hot" this topic currently is
7. postIdeas: 2-3 creative ways to participate in this conversation
8. suggestedHooks: 3 attention-grabbing opening lines
9. relatedHashtags: 5-8 relevant hashtags (without #)

Return 3-4 topics. Only include topics that are CURRENTLY trending and have a natural connection to Austin, hospitality, or local businesses.`

const SEASONAL_PROMPT = `You are a social media content strategist for Urban Simple, a commercial cleaning company in Austin, TX that serves restaurants, bars, and hotels.

Based on today's date, identify upcoming seasonal content opportunities:

Look for:
- Holidays in the next 2-3 weeks (Valentine's Day, St. Patrick's Day, Easter, etc.)
- Seasonal themes (spring cleaning, summer patio season, etc.)
- Austin-specific seasonal events (SXSW, ACL, UT football season, etc.)
- Restaurant industry seasonal patterns (brunch season, patio weather, etc.)
- Awareness months or days relevant to hospitality

For EACH topic you identify, provide:
1. title: An engaging headline
2. summary: What the opportunity is
3. context: Why this matters for Austin hospitality businesses
4. subcategory: One of [holidays, seasons, austin_events, industry_trends, awareness]
5. relevanceScore: 0-1 how relevant this is for content
6. expiresAt: When this topic is no longer relevant (ISO date)
7. postIdeas: 2-3 content ideas for this theme
8. suggestedHooks: 3 attention-grabbing opening lines
9. relatedHashtags: 5-8 relevant hashtags (without #)

Return 2-3 timely seasonal opportunities.`

// ============================================
// TOPIC DISCOVERY
// ============================================

export async function discoverAustinLocalTopics(): Promise<DiscoveredTopic[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: AUSTIN_LOCAL_PROMPT }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    const parsed = JSON.parse(text)
    const topics = Array.isArray(parsed) ? parsed : parsed.topics || []

    return topics.map((t: Record<string, unknown>) => ({
      ...t,
      category: 'AUSTIN_LOCAL' as InspirationCategory,
      postIdeas: t.postIdeas || [],
      suggestedHooks: t.suggestedHooks || [],
      relatedHashtags: t.relatedHashtags || [],
    }))
  } catch (error) {
    console.error('Failed to discover Austin local topics:', error)
    return []
  }
}

export async function discoverPopCultureTopics(): Promise<DiscoveredTopic[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: POP_CULTURE_PROMPT }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    const parsed = JSON.parse(text)
    const topics = Array.isArray(parsed) ? parsed : parsed.topics || []

    return topics.map((t: Record<string, unknown>) => ({
      ...t,
      category: 'POP_CULTURE' as InspirationCategory,
      postIdeas: t.postIdeas || [],
      suggestedHooks: t.suggestedHooks || [],
      relatedHashtags: t.relatedHashtags || [],
    }))
  } catch (error) {
    console.error('Failed to discover pop culture topics:', error)
    return []
  }
}

export async function discoverSeasonalTopics(): Promise<DiscoveredTopic[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const prompt = `Today is ${today}.\n\n${SEASONAL_PROMPT}`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    const parsed = JSON.parse(text)
    const topics = Array.isArray(parsed) ? parsed : parsed.topics || []

    return topics.map((t: Record<string, unknown>) => ({
      ...t,
      category: 'SEASONAL' as InspirationCategory,
      postIdeas: t.postIdeas || [],
      suggestedHooks: t.suggestedHooks || [],
      relatedHashtags: t.relatedHashtags || [],
      expiresAt: t.expiresAt ? new Date(t.expiresAt as string) : undefined,
    }))
  } catch (error) {
    console.error('Failed to discover seasonal topics:', error)
    return []
  }
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export async function generateDailyTopics(): Promise<GenerationResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const allTopics: DiscoveredTopic[] = []

  // Run all discovery functions in parallel
  const [austinTopics, popCultureTopics, seasonalTopics] = await Promise.all([
    discoverAustinLocalTopics().catch((e) => {
      errors.push(`Austin Local: ${e.message}`)
      return []
    }),
    discoverPopCultureTopics().catch((e) => {
      errors.push(`Pop Culture: ${e.message}`)
      return []
    }),
    discoverSeasonalTopics().catch((e) => {
      errors.push(`Seasonal: ${e.message}`)
      return []
    }),
  ])

  allTopics.push(...austinTopics, ...popCultureTopics, ...seasonalTopics)

  const generationTime = Date.now() - startTime

  return {
    success: allTopics.length > 0,
    topics: allTopics,
    errors,
    generationTime,
  }
}

// ============================================
// QUICK POST GENERATION
// ============================================

export async function generateQuickPostIdeas(
  topic: {
    title: string
    summary: string
    context?: string
    category: string
  },
  platform?: string
): Promise<PostIdea[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const platformInstructions = platform
    ? `Focus on ${platform} specifically.`
    : 'Generate ideas for Instagram, LinkedIn, and Facebook.'

  const prompt = `You are a social media content creator for Urban Simple, a commercial cleaning company in Austin, TX.

TOPIC: "${topic.title}"
DETAILS: ${topic.summary}
${topic.context ? `CONTEXT: ${topic.context}` : ''}
CATEGORY: ${topic.category}

Generate 3-4 creative social media post ideas based on this topic. ${platformInstructions}

The posts should:
- Be engaging and authentic, NOT salesy
- Celebrate local Austin culture and businesses
- Feel like they're from a company that's part of the community
- Occasionally (but not always) subtly connect to hospitality/cleanliness

For each idea, provide:
- platform: instagram, linkedin, facebook, or twitter
- angle: The creative approach/concept in one sentence
- headline: A catchy headline or caption opener
- hook: The attention-grabbing first line
- hashtags: 4-6 relevant hashtags (without #)

Return as a JSON array.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : parsed.ideas || []
  } catch (error) {
    console.error('Failed to generate quick post ideas:', error)
    return []
  }
}

// ============================================
// BRIEFING GENERATION
// ============================================

export async function generateBriefingSummary(
  topics: DiscoveredTopic[],
  userName?: string
): Promise<{ headline: string; greeting: string; summary: string }> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const today = new Date()
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

  const austinCount = topics.filter((t) => t.category === 'AUSTIN_LOCAL').length
  const popCount = topics.filter((t) => t.category === 'POP_CULTURE').length
  const seasonalCount = topics.filter((t) => t.category === 'SEASONAL').length

  const prompt = `Generate a brief, inspiring morning briefing for a social media content creator.

Today is ${dayOfWeek}, ${dateStr}.
${userName ? `The user's name is ${userName}.` : ''}

Today's content topics:
- ${austinCount} Austin local topics (restaurants, bars, events)
- ${popCount} pop culture/trending topics
- ${seasonalCount} seasonal/holiday topics

Top topics:
${topics.slice(0, 3).map((t) => `- "${t.title}"`).join('\n')}

Generate:
1. headline: A catchy 4-6 word headline for today's briefing (like "Austin's Buzzing This Week")
2. greeting: A friendly, energizing morning greeting (1 sentence)
3. summary: A quick 2-3 sentence overview of today's content opportunities

Keep it upbeat, concise, and focused on the creative opportunity. No corporate speak.

Return as JSON: { headline, greeting, summary }`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to generate briefing summary:', error)
    return {
      headline: "Today's Creative Inspiration",
      greeting: `Good morning! You have ${topics.length} content ideas waiting for you.`,
      summary: `We found ${austinCount} Austin local topics, ${popCount} trending topics, and ${seasonalCount} seasonal opportunities to inspire your content today.`,
    }
  }
}
