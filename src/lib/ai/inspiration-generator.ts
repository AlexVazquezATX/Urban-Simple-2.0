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
import {
  type ContentMode,
  type ContentModeId,
  CONTENT_MODES,
  getContentModeConfig,
} from '@/lib/config/brand'

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

// Helper to get current date context for prompts
function getCurrentDateContext(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.toLocaleDateString('en-US', { month: 'long' })
  const day = now.getDate()
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' })
  return `TODAY'S DATE: ${dayOfWeek}, ${month} ${day}, ${year}. The current year is ${year}.`
}

// Dynamic prompt builder based on content mode
function buildAustinLocalPrompt(contentMode: ContentMode): string {
  const year = new Date().getFullYear()

  // Community mode: NO cleaning/service mentions at all
  if (!contentMode.includeCleaningMentions) {
    return `You are a social media content strategist for a local Austin company that loves the hospitality community.

${getCurrentDateContext()}

CRITICAL: Only suggest topics that are CURRENT and RELEVANT to the date above. Do NOT suggest events, news, or topics from previous years. All topics must be from ${year}.

IMPORTANT CONTENT RULES:
- DO NOT mention cleaning, sanitization, or any cleaning services
- DO NOT frame topics around "getting ready" or "preparing" spaces
- DO NOT suggest angles that tie back to cleanliness or hygiene
- This is PURE COMMUNITY CONTENT - celebrating Austin, not selling services
- Think like a local Austin food blogger or community page, NOT a business

Your job is to find CURRENT news about Austin's restaurant, bar, and hospitality scene that would make great, ENGAGING social media content. The goal is community engagement and celebrating Austin - nothing else.

Search for the LATEST Austin news about:
- New restaurant or bar openings in Austin (within the last 2 weeks)
- Restaurant/bar expansions, renovations, or relocations
- Popular Austin food festivals or events happening soon (in ${year})
- Austin restaurants/bars winning awards or recognition (recent)
- Viral moments involving Austin restaurants/bars
- Local chefs or restaurateurs making headlines
- Austin food trends and culture

For EACH topic you find, provide:
1. title: A catchy, engaging headline that celebrates the topic (NO cleaning angles)
2. summary: 1-2 sentences explaining what's happening
3. context: Why this matters to Austin locals (NOT why it matters to a cleaning company)
4. subcategory: One of [restaurants, bars, events, awards, openings, local_news]
5. sourceUrl: The URL where you found this (if available)
6. sourceName: Name of the source publication
7. relevanceScore: 0-1 how interesting this is to Austin food/hospitality lovers
8. postIdeas: 2-3 creative post angles that CELEBRATE the topic (no service tie-ins)
9. suggestedHooks: 3 attention-grabbing opening lines (community-focused, not salesy)
10. relatedHashtags: 5-8 relevant Austin/food hashtags (without #)

Return 4-6 topics. Focus on RECENT news (within the last week of ${year}).

REMEMBER: You are creating content for a company that wants to be seen as PART OF the Austin community, not as a vendor. No cleaning mentions. No "get your venue ready." Just pure Austin love.`
  }

  // Promotional mode: Standard business-focused content
  return `You are a social media content strategist for Urban Simple, a commercial cleaning company in Austin, TX that primarily serves restaurants, bars, hotels, and commercial kitchens.

${getCurrentDateContext()}

CRITICAL: Only suggest topics that are CURRENT and RELEVANT to the date above. Do NOT suggest events, news, or topics from previous years. All topics must be from ${year}.

Your job is to find CURRENT, RECENT news about Austin's restaurant, bar, and hospitality scene that would make great social media content. The content should help Urban Simple be seen as part of the Austin community while subtly highlighting our services.

Search for the LATEST Austin news about:
- New restaurant or bar openings in Austin (within the last 2 weeks)
- Restaurant/bar expansions, renovations, or relocations
- Popular Austin food festivals or events happening soon (in ${year})
- Austin restaurants/bars winning awards or recognition (recent)
- Viral moments involving Austin restaurants/bars
- New developments with hospitality tenants
- Local chefs or restaurateurs in the news

For EACH topic you find, provide:
1. title: A catchy, engaging headline (can include service angle if natural)
2. summary: 1-2 sentences explaining what's happening
3. context: Why this matters to Austin locals and hospitality businesses
4. subcategory: One of [restaurants, bars, events, awards, openings, local_news]
5. sourceUrl: The URL where you found this (if available)
6. sourceName: Name of the source publication
7. relevanceScore: 0-1 how relevant this is for a cleaning company's social presence
8. postIdeas: 2-3 creative post angles for different platforms (can include service tie-ins)
9. suggestedHooks: 3 attention-grabbing opening lines
10. relatedHashtags: 5-8 relevant hashtags (without #)

Return 4-6 topics. Focus on RECENT news (within the last week of ${year}).

IMPORTANT: If you cannot find verified current news, suggest evergreen Austin-focused content ideas instead.`
}

function buildPopCulturePrompt(contentMode: ContentMode): string {
  const year = new Date().getFullYear()

  // Community mode: NO cleaning/service tie-ins
  if (!contentMode.includeCleaningMentions) {
    return `You are a social media content strategist creating fun, engaging content for a local Austin brand.

${getCurrentDateContext()}

CRITICAL: Only suggest topics that are CURRENT and TRENDING RIGHT NOW in ${year}. Do NOT suggest events from previous years. If you're unsure whether something is current, do not include it.

IMPORTANT CONTENT RULES:
- DO NOT mention cleaning, sanitization, or any cleaning services
- DO NOT suggest angles that tie back to cleanliness, hygiene, or "keeping spaces clean"
- DO NOT use phrases like "spotless", "fresh", "clean up", "get ready", etc.
- This is PURE ENTERTAINMENT/POP CULTURE content
- Think like a fun Austin social media account, NOT a business

Your job is to find CURRENT trending topics, viral moments, and pop culture news that would make engaging, FUN social media content.

Search for topics TRENDING RIGHT NOW about:
- Major sporting events happening in ${year} (current playoffs, Super Bowl, etc.)
- Recent award shows and entertainment news (within the last month)
- Viral social media moments from the past week
- Upcoming cultural events and holidays
- Current food/restaurant trends (the food itself, not cleanliness)
- TV shows, movies, or music everyone's talking about RIGHT NOW

For EACH topic you find, provide:
1. title: An engaging headline (NO cleaning angles - just the topic)
2. summary: What's trending and why
3. context: How to make it fun and locally relevant to Austin
4. subcategory: One of [sports, entertainment, viral, holidays, trends, music, movies]
5. relevanceScore: 0-1 how engaging this would be for Austin followers
6. trendingScore: 0-1 how "hot" this topic currently is
7. postIdeas: 2-3 creative, FUN ways to participate (NO service tie-ins)
8. suggestedHooks: 3 attention-grabbing opening lines (community-focused)
9. relatedHashtags: 5-8 relevant hashtags (without #)

Return 3-4 topics that are CURRENTLY trending in ${year}.

REMEMBER: Pure community engagement. No cleaning mentions. No business pitch. Just fun content that Austin locals would enjoy.`
  }

  // Promotional mode: Standard business angle
  return `You are a social media content strategist for Urban Simple, a commercial cleaning company in Austin, TX.

${getCurrentDateContext()}

CRITICAL: Only suggest topics that are CURRENT and TRENDING RIGHT NOW in ${year}. Do NOT suggest events from previous years. If you're unsure whether something is current, do not include it.

Your job is to find CURRENT trending topics that could inspire engaging social media content with subtle business tie-ins.

Search for topics TRENDING RIGHT NOW about:
- Major sporting events happening in ${year} (current playoffs, Super Bowl, etc.)
- Recent award shows and entertainment news (within the last month)
- Viral social media moments from the past week
- Upcoming cultural events and holidays
- Current national food/restaurant trends
- TV shows, movies, or music everyone's talking about RIGHT NOW

For EACH topic, think about how it could relate to hospitality, restaurants, or local events in Austin.

For EACH topic you find, provide:
1. title: An engaging headline (can include clever service angle)
2. summary: What's trending and why
3. context: The Austin/hospitality angle
4. subcategory: One of [sports, entertainment, viral, holidays, trends, music, movies]
5. relevanceScore: 0-1 how naturally this connects to hospitality
6. trendingScore: 0-1 how "hot" this topic currently is
7. postIdeas: 2-3 creative ways to participate (can include service tie-ins)
8. suggestedHooks: 3 attention-grabbing opening lines
9. relatedHashtags: 5-8 relevant hashtags (without #)

Return 3-4 topics that are CURRENTLY trending in ${year}.`
}

function buildSeasonalPrompt(contentMode: ContentMode): string {
  const year = new Date().getFullYear()

  // Community mode: NO cleaning/service tie-ins
  if (!contentMode.includeCleaningMentions) {
    return `You are a social media content strategist creating seasonal content for a local Austin brand.

${getCurrentDateContext()}

CRITICAL: Only suggest seasonal content for ${year}. All dates must be in ${year} or later. Do NOT suggest past events or holidays.

IMPORTANT CONTENT RULES:
- DO NOT mention cleaning, sanitization, or any cleaning services
- DO NOT frame topics around "preparing" or "getting ready" or "deep clean"
- DO NOT use phrases like "spotless", "fresh start", "clean slate", etc.
- This is PURE SEASONAL/HOLIDAY content celebrating the moment
- Think like a fun Austin lifestyle account, NOT a business

Based on today's date, identify upcoming seasonal content opportunities:

Look for:
- Holidays in the next 2-3 weeks (upcoming holidays only)
- Seasonal themes appropriate for the current month
- Austin-specific seasonal events in ${year} (SXSW ${year}, ACL ${year}, etc.)
- Fun seasonal traditions and celebrations
- Awareness months or days that are interesting/fun

For EACH topic you identify, provide:
1. title: An engaging headline (NO cleaning/prep angles - just celebrate the occasion)
2. summary: What the opportunity is
3. context: Why Austin locals would care about this
4. subcategory: One of [holidays, seasons, austin_events, industry_trends, awareness]
5. relevanceScore: 0-1 how engaging this would be
6. expiresAt: When this topic is no longer relevant (ISO date in ${year})
7. postIdeas: 2-3 FUN content ideas (NO service tie-ins, just celebration)
8. suggestedHooks: 3 attention-grabbing opening lines (community-focused)
9. relatedHashtags: 5-8 relevant hashtags (without #)

Return 2-3 timely seasonal opportunities that are UPCOMING.

REMEMBER: Celebrate the season/holiday purely. No "prep your space" or "get ready" angles. Just fun, engaging seasonal content.`
  }

  // Promotional mode: Standard business angle
  return `You are a social media content strategist for Urban Simple, a commercial cleaning company in Austin, TX that serves restaurants, bars, and hotels.

${getCurrentDateContext()}

CRITICAL: Only suggest seasonal content for ${year}. All dates must be in ${year} or later. Do NOT suggest past events or holidays.

Based on today's date, identify upcoming seasonal content opportunities:

Look for:
- Holidays in the next 2-3 weeks (upcoming holidays only)
- Seasonal themes appropriate for the current month
- Austin-specific seasonal events in ${year} (SXSW ${year}, ACL ${year}, etc.)
- Restaurant industry seasonal patterns
- Awareness months or days relevant to hospitality

For EACH topic you identify, provide:
1. title: An engaging headline (can include service angle)
2. summary: What the opportunity is
3. context: Why this matters for Austin hospitality businesses
4. subcategory: One of [holidays, seasons, austin_events, industry_trends, awareness]
5. relevanceScore: 0-1 how relevant this is for content
6. expiresAt: When this topic is no longer relevant (ISO date in ${year})
7. postIdeas: 2-3 content ideas (can include service tie-ins)
8. suggestedHooks: 3 attention-grabbing opening lines
9. relatedHashtags: 5-8 relevant hashtags (without #)

Return 2-3 timely seasonal opportunities that are UPCOMING.`
}

// ============================================
// TOPIC DISCOVERY
// ============================================

// Default content mode (community - no cleaning mentions)
const DEFAULT_CONTENT_MODE: ContentMode = CONTENT_MODES.community.mode

export async function discoverAustinLocalTopics(
  contentMode: ContentMode = DEFAULT_CONTENT_MODE
): Promise<DiscoveredTopic[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' })
  const prompt = buildAustinLocalPrompt(contentMode)

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

export async function discoverPopCultureTopics(
  contentMode: ContentMode = DEFAULT_CONTENT_MODE
): Promise<DiscoveredTopic[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' })
  const prompt = buildPopCulturePrompt(contentMode)

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
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

export async function discoverSeasonalTopics(
  contentMode: ContentMode = DEFAULT_CONTENT_MODE
): Promise<DiscoveredTopic[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' })
  const prompt = buildSeasonalPrompt(contentMode)

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

export async function generateDailyTopics(
  contentModeId: ContentModeId = 'community'
): Promise<GenerationResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const allTopics: DiscoveredTopic[] = []

  // Get content mode configuration
  const contentMode = getContentModeConfig(contentModeId)

  // Run all discovery functions in parallel with content mode
  const [austinTopics, popCultureTopics, seasonalTopics] = await Promise.all([
    discoverAustinLocalTopics(contentMode).catch((e) => {
      errors.push(`Austin Local: ${e.message}`)
      return []
    }),
    discoverPopCultureTopics(contentMode).catch((e) => {
      errors.push(`Pop Culture: ${e.message}`)
      return []
    }),
    discoverSeasonalTopics(contentMode).catch((e) => {
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

export interface ContentOptions {
  tone?: 'friendly' | 'professional' | 'enthusiastic' | 'storytelling'
  length?: 'short' | 'medium' | 'long' | 'extended'
  emoji?: 'none' | 'minimal' | 'moderate' | 'heavy'
  cta?: 'none' | 'soft' | 'direct' | 'urgent'
}

const TONE_DESCRIPTIONS = {
  friendly: 'warm, approachable, and conversational - like talking to a friend',
  professional: 'polished, business-appropriate, and credible',
  enthusiastic: 'energetic, excited, and upbeat with exclamations',
  storytelling: 'narrative-driven, engaging, and emotionally resonant',
}

const LENGTH_DESCRIPTIONS = {
  short: '1-2 sentences only - punchy and concise',
  medium: '3-4 sentences - balanced with good detail',
  long: '5-6 sentences - comprehensive and thorough',
  extended: 'full paragraph or more - detailed storytelling',
}

const EMOJI_DESCRIPTIONS = {
  none: 'NO emojis at all - clean text only',
  minimal: '1-2 emojis strategically placed',
  moderate: '3-5 emojis sprinkled throughout',
  heavy: 'lots of emojis for maximum visual appeal',
}

const CTA_DESCRIPTIONS = {
  none: 'NO call to action - just engaging content',
  soft: 'gentle suggestion like "check it out" or "what do you think?"',
  direct: 'clear call to action like "visit us today" or "tag a friend"',
  urgent: 'time-sensitive urgency like "don\'t miss out!" or "limited time"',
}

export async function generateQuickPostIdeas(
  topic: {
    title: string
    summary: string
    context?: string
    category: string
  },
  platform?: string,
  contentModeId: ContentModeId = 'community',
  options: ContentOptions = {}
): Promise<PostIdea[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' })
  const contentMode = getContentModeConfig(contentModeId)

  // Default options
  const tone = options.tone || 'friendly'
  const length = options.length || 'medium'
  const emoji = options.emoji || 'minimal'
  const cta = options.cta || 'soft'

  const platformInstructions = platform
    ? `Focus on ${platform} specifically.`
    : 'Generate ideas for Instagram, LinkedIn, and Facebook.'

  // Build prompt based on content mode
  let contentRules: string
  if (!contentMode.includeCleaningMentions) {
    contentRules = `The posts should:
- Be engaging, fun, and authentic
- Celebrate local Austin culture and businesses
- Feel like they're from a company that LOVES Austin
- DO NOT mention cleaning, sanitization, or any cleaning services
- DO NOT include any sales pitch or business mentions
- NO "get your space ready" or "prepare for" angles
- Pure community content - like a local Austin food/lifestyle account would post`
  } else if (!contentMode.includeSalesPitch) {
    contentRules = `The posts should:
- Be engaging and authentic, NOT salesy
- Celebrate local Austin culture and businesses
- Feel like they're from a company that's part of the community
- Can mention hospitality/cleaning naturally but NO hard sell`
  } else {
    contentRules = `The posts should:
- Be engaging and authentic
- Celebrate local Austin culture and businesses
- Feel like they're from a company that's part of the community
- Can include subtle service tie-ins and CTAs when natural`
  }

  // Build customization instructions
  const customizationInstructions = `
CONTENT STYLE REQUIREMENTS:
- TONE: ${TONE_DESCRIPTIONS[tone]}
- LENGTH: ${LENGTH_DESCRIPTIONS[length]} (This is VERY IMPORTANT - follow the length guideline strictly)
- EMOJIS: ${EMOJI_DESCRIPTIONS[emoji]}
- CALL TO ACTION: ${CTA_DESCRIPTIONS[cta]}`

  const prompt = `You are a social media content creator for a local Austin brand.

TOPIC: "${topic.title}"
DETAILS: ${topic.summary}
${topic.context ? `CONTEXT: ${topic.context}` : ''}
CATEGORY: ${topic.category}

Generate 3-4 creative social media post ideas based on this topic. ${platformInstructions}

${contentRules}

${customizationInstructions}

For each idea, provide:
- platform: instagram, linkedin, facebook, or twitter
- angle: The creative approach/concept in one sentence
- headline: A catchy headline or caption opener (short, punchy)
- hook: The FULL post caption/content following the LENGTH and TONE requirements above. This is the main content people will read.
- hashtags: 4-6 relevant hashtags (without #)

IMPORTANT: The "hook" field should contain the COMPLETE post text, not just the first line. Follow the LENGTH guideline strictly.

Return as a JSON array.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 4096, // Increased for longer content
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
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash' })

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
