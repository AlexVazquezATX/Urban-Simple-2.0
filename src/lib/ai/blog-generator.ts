/**
 * AI-Powered Blog Content Generator
 *
 * Generates engaging Austin-focused blog content about:
 * - New restaurant/hotel openings
 * - Local events and happenings
 * - Food scene reviews and guides
 * - Hospitality industry insights
 * - Pop culture and lifestyle content
 *
 * Uses Gemini 2.0 for text generation with web search for real data
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

// Lazy initialization of Gemini client to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

/**
 * Search the web for real Austin content using Gemini's grounding
 */
async function searchAustinContent(query: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  })

  const searchPrompt = `You are a research assistant. Search for and compile REAL, CURRENT information about: "${query}"

Focus on finding:
- Specific business names, addresses, and neighborhoods
- Chef/owner names when relevant
- Recent opening dates or event dates
- Specific menu items, prices, or features
- Real quotes or reviews if available
- Actual facts and details, not generic descriptions

IMPORTANT: Only include information you can verify is real and current. Include specific names, dates, locations, and details.

Return your findings as a structured summary with real data points.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
      generationConfig: {
        temperature: 0.3, // Lower temperature for factual accuracy
        topP: 0.8,
        maxOutputTokens: 4096,
      },
    })

    return result.response.text()
  } catch (error) {
    console.error('Search failed:', error)
    return ''
  }
}

/**
 * Build search queries based on content focus
 */
function buildSearchQueries(params: { targetArea: string; contentFocus: string; category: string }): string[] {
  const area = params.targetArea || 'Austin, TX'
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })

  const queryMap: Record<string, string[]> = {
    'new_openings': [
      `new restaurants opening ${area} ${currentMonth}`,
      `new bars hotels opening ${area} 2024 2025`,
      `upcoming restaurant openings ${area}`,
    ],
    'upcoming_events': [
      `food festivals events ${area} ${currentMonth}`,
      `restaurant week food events ${area}`,
      `hospitality events ${area} upcoming`,
    ],
    'best_of_lists': [
      `best restaurants ${area} 2024 2025`,
      `best tacos brunch BBQ ${area}`,
      `top rated restaurants ${area}`,
    ],
    'food_scene': [
      `${area} food scene news trends`,
      `popular restaurants ${area} right now`,
      `${area} dining news recent`,
    ],
    'industry_insights': [
      `restaurant industry news ${area}`,
      `hospitality trends Texas 2024 2025`,
      `restaurant business news ${area}`,
    ],
    'local_culture': [
      `${area} food culture neighborhoods`,
      `${area} local restaurants hidden gems`,
      `${area} food history culture`,
    ],
    'hospitality_tips': [
      `restaurant management tips trends`,
      `hospitality industry best practices`,
      `restaurant operations advice`,
    ],
    'pop_culture': [
      `celebrity restaurants ${area}`,
      `famous chefs ${area}`,
      `${area} food TV shows movies`,
    ],
  }

  return queryMap[params.contentFocus] || queryMap['food_scene']
}

// Content focus types for AI generation
export const CONTENT_FOCUS_TYPES = {
  NEW_OPENINGS: 'new_openings',
  UPCOMING_EVENTS: 'upcoming_events',
  BEST_OF_LISTS: 'best_of_lists',
  FOOD_SCENE: 'food_scene',
  INDUSTRY_INSIGHTS: 'industry_insights',
  LOCAL_CULTURE: 'local_culture',
  HOSPITALITY_TIPS: 'hospitality_tips',
  POP_CULTURE: 'pop_culture',
} as const

// Blog categories
export const BLOG_CATEGORIES = {
  AUSTIN_EVENTS: 'Austin Events',
  RESTAURANT_NEWS: 'Restaurant News',
  FOOD_SCENE: 'Food & Dining',
  HOSPITALITY: 'Hospitality Industry',
  LIFESTYLE: 'Austin Lifestyle',
  BUSINESS_TIPS: 'Business & Operations',
} as const

export type ContentFocusType = typeof CONTENT_FOCUS_TYPES[keyof typeof CONTENT_FOCUS_TYPES]
export type BlogCategory = typeof BLOG_CATEGORIES[keyof typeof BLOG_CATEGORIES]

export interface BlogGenerationParams {
  targetArea: string // e.g., "Austin, TX"
  category: BlogCategory
  contentFocus: ContentFocusType
  targetAudience: string // e.g., "Foodies", "Industry Pros", "General Austin Residents"
  tone: string // e.g., "Buzzy", "Professional", "Fun", "Informative"
}

export interface BlogIdea {
  title: string
  angle: string // Unique take or perspective
  hook: string // Opening hook to grab attention
  keywords: string[] // SEO keywords
}

export interface BlogPostContent {
  title: string
  excerpt: string
  content: string // HTML formatted
  keywords: string[]
  metaDescription: string
  readTime: number // estimated minutes
  imagePrompt: string // For AI image generation
}

/**
 * Generate 4 blog post ideas based on parameters with REAL research
 */
export async function generateBlogIdeas(
  params: BlogGenerationParams
): Promise<BlogIdea[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Step 1: Research real Austin content
  console.log('Researching real Austin content...')
  const searchQueries = buildSearchQueries(params)
  const researchResults: string[] = []

  for (const query of searchQueries) {
    const result = await searchAustinContent(query)
    if (result) {
      researchResults.push(result)
    }
  }

  const combinedResearch = researchResults.join('\n\n---\n\n')
  console.log('Research complete, generating ideas based on real data...')

  // Step 2: Generate ideas based on real research
  const prompt = `You are an expert content strategist for a local Austin business blog focused on the hospitality and food & beverage industry.

REAL RESEARCH DATA (use this to create blog ideas with REAL names, places, and details):
${combinedResearch}

---

Based on the REAL research above, generate 4 unique, engaging blog post ideas with these parameters:
- Target Area: ${params.targetArea}
- Category: ${params.category}
- Content Focus: ${params.contentFocus}
- Target Audience: ${params.targetAudience}
- Tone: ${params.tone}

CRITICAL REQUIREMENTS:
- Every title MUST include REAL restaurant names, chef names, event names, or specific locations from the research
- Every hook MUST reference REAL, SPECIFIC details (addresses, dates, menu items, chef names)
- DO NOT use placeholders like "[Restaurant Name]" - use ACTUAL names from the research
- If the research mentions specific neighborhoods, dishes, prices, or people - USE THEM
- Make the content feel like insider knowledge about REAL Austin happenings

Return a JSON array of 4 blog ideas with this structure:
[
  {
    "title": "Compelling title with REAL business/event names",
    "angle": "What makes this story unique - reference REAL details",
    "hook": "Opening with REAL specific details that grab attention",
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
]

Examples of GOOD titles (with real names):
- "Loro's New East Austin Location is Finally Here—Here's What to Order First"
- "Franklin BBQ vs. la Barbecue: The Ultimate Austin Brisket Showdown"
- "Chef Tyson Cole's Latest Venture Brings Japanese Flavors to South Congress"

Examples of BAD titles (generic):
- "Austin's Hottest New Restaurant Opening Soon"
- "Best Tacos in [Neighborhood]"
- "Meet the Chef Behind [Restaurant Name]"

Generate ideas that reference REAL places, people, and events from the research.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  })

  const response = result.response
  const text = response.text()

  try {
    const ideas = JSON.parse(text)
    return ideas
  } catch (error) {
    console.error('Failed to parse blog ideas:', error)
    throw new Error('Failed to generate blog ideas')
  }
}

/**
 * Generate full blog post content from a selected idea with REAL research
 */
export async function generateBlogPost(
  params: BlogGenerationParams,
  selectedIdea: BlogIdea
): Promise<BlogPostContent> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Research specific details about the topic
  console.log('Researching specific details for article...')
  const specificResearch = await searchAustinContent(
    `${selectedIdea.title} ${selectedIdea.keywords.join(' ')} Austin TX details reviews`
  )

  const prompt = `You are an expert content writer for a local Austin business blog focused on the hospitality and food & beverage industry.

REAL RESEARCH DATA (use specific details from this in your article):
${specificResearch}

---

Write a full, engaging blog post based on this idea:

Title: ${selectedIdea.title}
Angle: ${selectedIdea.angle}
Hook: ${selectedIdea.hook}
Keywords: ${selectedIdea.keywords.join(', ')}

Parameters:
- Target Area: ${params.targetArea}
- Category: ${params.category}
- Content Focus: ${params.contentFocus}
- Target Audience: ${params.targetAudience}
- Tone: ${params.tone}

CRITICAL - USE REAL DETAILS:
- Include REAL addresses (e.g., "1503 S Congress Ave")
- Include REAL chef/owner names from the research
- Include REAL menu items and prices if available
- Include REAL neighborhood names (East Austin, South Congress, Rainey Street, etc.)
- Include REAL opening dates, hours, or event times
- DO NOT make up facts - only use information from the research
- If you don't have specific details, be vague rather than fabricating

CONTENT GUIDELINES:
- Write 600-1000 words
- Use engaging, conversational language
- Include specific Austin references and local flavor
- Make it informative and valuable, not a sales pitch
- Use HTML formatting with <h2>, <h3>, <p>, <ul>, <ol> tags as appropriate
- Start with the compelling hook provided
- Include interesting facts, tips, or insights
- End with a call-to-action (could be to try a restaurant, attend an event, explore Austin, etc.)
- Make it shareable and memorable

IMPORTANT - PULL QUOTES:
- Include 1-2 pull quotes throughout the article using <blockquote> tags
- Pull quotes should be memorable, impactful statements that capture the essence of a section
- They should be short (1-2 sentences max) and punchy
- Example: <blockquote>"This isn't just brunch—it's a religious experience for your taste buds."</blockquote>
- Place them strategically between paragraphs to break up the text and add visual interest
- Make them quotable and shareable - the kind of line someone would screenshot

Return a JSON object with this structure:
{
  "title": "Final polished title with REAL names",
  "excerpt": "Compelling 2-3 sentence summary with REAL details for preview/SEO",
  "content": "Full HTML-formatted article content with REAL names, addresses, and details",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "metaDescription": "SEO-optimized meta description (150-160 characters)",
  "readTime": 5,
  "imagePrompt": "Detailed prompt for featured image - include specific Austin location or restaurant name from the article"
}

IMPORTANT: Every name, place, and detail in the article must be REAL and verifiable. This is journalism, not creative writing.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  })

  const response = result.response
  const text = response.text()

  try {
    const post = JSON.parse(text)
    return post
  } catch (error) {
    console.error('Failed to parse blog post:', error)
    throw new Error('Failed to generate blog post')
  }
}

/**
 * Curated high-quality Unsplash images by topic
 * These are direct image URLs that reliably work
 */
const CURATED_IMAGES: Record<string, string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=800&fit=crop', // restaurant interior
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=800&fit=crop', // restaurant ambiance
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=800&fit=crop', // fine dining
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=800&fit=crop', // elegant restaurant
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop', // beautiful food
    'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&h=800&fit=crop', // colorful dish
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&h=800&fit=crop', // pizza
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=800&fit=crop', // healthy bowl
  ],
  brunch: [
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&h=800&fit=crop', // brunch spread
    'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&h=800&fit=crop', // pancakes
    'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=1200&h=800&fit=crop', // french toast
    'https://images.unsplash.com/photo-1496412705862-e0088f16f791?w=1200&h=800&fit=crop', // eggs benedict
  ],
  bar: [
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1200&h=800&fit=crop', // bar interior
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&h=800&fit=crop', // cocktail bar
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1200&h=800&fit=crop', // neon bar
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1200&h=800&fit=crop', // speakeasy
  ],
  cocktail: [
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&h=800&fit=crop', // cocktail
    'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=1200&h=800&fit=crop', // margarita
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200&h=800&fit=crop', // craft cocktail
    'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=1200&h=800&fit=crop', // mixology
  ],
  coffee: [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&h=800&fit=crop', // coffee shop
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200&h=800&fit=crop', // latte art
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&h=800&fit=crop', // cozy cafe
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1200&h=800&fit=crop', // coffee cup
  ],
  taco: [
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&h=800&fit=crop', // tacos
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&h=800&fit=crop', // street tacos
    'https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?w=1200&h=800&fit=crop', // taco plate
    'https://images.unsplash.com/photo-1624300629298-e9de39c13be5?w=1200&h=800&fit=crop', // birria tacos
  ],
  bbq: [
    'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=1200&h=800&fit=crop', // bbq ribs
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&h=800&fit=crop', // brisket
    'https://images.unsplash.com/photo-1558030006-450675393462?w=1200&h=800&fit=crop', // smoker
    'https://images.unsplash.com/photo-1606502973842-f64bc2785fe5?w=1200&h=800&fit=crop', // bbq spread
  ],
  hotel: [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop', // luxury hotel
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&h=800&fit=crop', // hotel lobby
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&h=800&fit=crop', // resort pool
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&h=800&fit=crop', // boutique hotel
  ],
  event: [
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=800&fit=crop', // conference
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=800&fit=crop', // festival
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1200&h=800&fit=crop', // celebration
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&h=800&fit=crop', // concert
  ],
  austin: [
    'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1200&h=800&fit=crop', // austin skyline
    'https://images.unsplash.com/photo-1588993608405-1c79c9b75e9c?w=1200&h=800&fit=crop', // austin city
    'https://images.unsplash.com/photo-1557424493-e1c7ca1a3e18?w=1200&h=800&fit=crop', // texas capitol
    'https://images.unsplash.com/photo-1580407196238-dac33f57c410?w=1200&h=800&fit=crop', // austin sunset
  ],
  default: [
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=800&fit=crop', // restaurant
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop', // food
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=800&fit=crop', // dining
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=800&fit=crop', // ambiance
  ],
}

/**
 * Generate featured image URL
 * Uses curated Unsplash images for reliable, high-quality results
 */
export async function generateBlogImage(
  imagePrompt: string
): Promise<string> {
  const prompt = imagePrompt.toLowerCase()

  // Priority order for topic matching
  const topicPriority = [
    'taco', 'bbq', 'brunch', 'cocktail', 'coffee',
    'bar', 'restaurant', 'hotel', 'event', 'food', 'austin'
  ]

  // Find the best matching topic
  let matchedTopic = 'default'
  for (const topic of topicPriority) {
    if (prompt.includes(topic)) {
      matchedTopic = topic
      break
    }
  }

  // Get images for the matched topic
  const images = CURATED_IMAGES[matchedTopic] || CURATED_IMAGES.default

  // Return a random image from the curated list
  const randomIndex = Math.floor(Math.random() * images.length)
  return images[randomIndex]
}

/**
 * AI Enhancement: Make content longer / expand a section
 */
export async function expandContent(
  content: string,
  focusArea?: string
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `You are an expert content editor. Expand and enrich the following blog content while maintaining its voice and style.

CURRENT CONTENT:
${content}

${focusArea ? `FOCUS AREA: Specifically expand the section about "${focusArea}"` : 'Expand the entire article naturally, adding more depth, examples, and details.'}

REQUIREMENTS:
- Add approximately 200-400 more words
- Maintain the same tone and writing style
- Add more specific details, examples, or insights
- Include additional Austin-specific references where appropriate
- Keep the same HTML structure (<h2>, <h3>, <p>, <ul>, etc.)
- Add another pull quote if appropriate using <blockquote> tags
- DO NOT change the core message or facts
- DO NOT add filler content - everything should add value

Return ONLY the expanded HTML content, nothing else.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 8192,
    },
  })

  return result.response.text()
}

/**
 * AI Enhancement: Improve writing quality
 */
export async function improveWriting(content: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `You are an expert content editor specializing in engaging, magazine-style blog writing.

CURRENT CONTENT:
${content}

IMPROVE THIS CONTENT BY:
- Making the language more vivid and engaging
- Improving sentence flow and readability
- Adding more compelling transitions between sections
- Making the opening more attention-grabbing
- Strengthening the call-to-action at the end
- Ensuring pull quotes are impactful and quotable

REQUIREMENTS:
- Keep the same overall length (don't make it shorter or significantly longer)
- Maintain the same facts and structure
- Keep the same HTML formatting
- Preserve all specific names, addresses, and details
- Make it feel like premium magazine content

Return ONLY the improved HTML content, nothing else.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 8192,
    },
  })

  return result.response.text()
}

/**
 * AI Enhancement: Regenerate a specific section
 */
export async function regenerateSection(
  fullContent: string,
  sectionToReplace: string,
  instructions: string
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `You are an expert content editor. Rewrite a specific section of this blog post.

FULL ARTICLE:
${fullContent}

SECTION TO REWRITE:
${sectionToReplace}

INSTRUCTIONS:
${instructions}

REQUIREMENTS:
- Rewrite ONLY the specified section
- Follow the given instructions
- Maintain the same HTML formatting
- Keep the same tone and style as the rest of the article
- Make sure it flows naturally with surrounding content

Return ONLY the new version of that section (just that HTML snippet), nothing else.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      topP: 0.9,
      maxOutputTokens: 2048,
    },
  })

  return result.response.text()
}

/**
 * AI Enhancement: Generate new title options
 */
export async function generateTitleOptions(
  content: string,
  currentTitle: string
): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `You are an expert headline writer for a local Austin magazine blog.

CURRENT TITLE: ${currentTitle}

ARTICLE CONTENT:
${content}

Generate 5 alternative title options that are:
- Attention-grabbing and clickable (but not clickbait)
- SEO-friendly
- Include specific names/places when relevant
- Varied in style (some punchy, some descriptive, some question-based)

Return ONLY a JSON array of 5 strings, nothing else.
Example: ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 1.0,
      topP: 0.95,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  })

  try {
    return JSON.parse(result.response.text())
  } catch {
    return []
  }
}

/**
 * AI Enhancement: Update excerpt
 */
export async function generateExcerpt(content: string, title: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `Write a compelling 2-3 sentence excerpt/preview for this blog post.

TITLE: ${title}

CONTENT:
${content}

REQUIREMENTS:
- Hook the reader immediately
- Summarize the key value of reading the full article
- Include a specific detail or name from the article
- Keep it under 200 characters
- Make it shareable

Return ONLY the excerpt text, nothing else.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 256,
    },
  })

  return result.response.text().trim()
}

/**
 * AI Enhancement: Generate meta description
 */
export async function generateMetaDescription(content: string, title: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  const prompt = `Write an SEO-optimized meta description for this blog post.

TITLE: ${title}

CONTENT:
${content}

REQUIREMENTS:
- Exactly 150-160 characters
- Include primary keyword naturally
- Compelling enough to improve click-through rate
- Action-oriented when possible

Return ONLY the meta description, nothing else.`

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 128,
    },
  })

  return result.response.text().trim()
}

/**
 * Helper to estimate reading time based on word count
 */
export function estimateReadingTime(content: string): number {
  // Strip HTML tags for accurate word count
  const text = content.replace(/<[^>]*>/g, '')
  const words = text.trim().split(/\s+/).length
  const wordsPerMinute = 200
  return Math.ceil(words / wordsPerMinute)
}

/**
 * Helper to generate URL-friendly slug from title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}
