/**
 * Creative Hub - AI Content Generator
 *
 * Generates marketing content for B2B commercial cleaning services:
 * - Social media posts (LinkedIn, Instagram, Facebook, Twitter)
 * - Ad creatives (Meta Ads, Google Display, LinkedIn Ads)
 *
 * Uses Gemini 2.0 Flash for text generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import { IMAGE_STYLES, type ImageStyleId } from '@/lib/config/brand'

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

export type Platform =
  | 'linkedin'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'meta_ad'
  | 'google_display'
  | 'linkedin_ad'

export type ContentType = 'social_post' | 'ad_creative'

export type Tone =
  | 'professional'
  | 'friendly'
  | 'authoritative'
  | 'casual'
  | 'funny'

export type ServiceHighlight =
  | 'kitchen_cleaning'
  | 'restaurant_deep_clean'
  | 'hotel_housekeeping'
  | 'office_cleaning'
  | 'post_construction'
  | 'floor_care'
  | 'general'

export interface ContentGenerationParams {
  contentType: ContentType
  platform: Platform
  serviceHighlight: ServiceHighlight
  tone: Tone
  targetAudience: string
  topic?: string
  includeStats?: boolean
  callToAction?: string
  imageStyle?: ImageStyleId // Controls content tone: lifestyle = community-focused, branded = promotional
}

export interface ContentIdea {
  headline: string
  hook: string
  keyPoints: string[]
  suggestedImage: string
  hashtags: string[]
}

export interface GeneratedContent {
  headline: string
  primaryText: string
  description?: string
  callToAction: string
  hashtags: string[]
}

// ============================================
// PLATFORM CONSTRAINTS
// ============================================

export const PLATFORM_CONSTRAINTS: Record<
  Platform,
  {
    name: string
    maxLength: number
    hashtagCount: { min: number; max: number }
    hasHeadline: boolean
    hasDescription: boolean
    format: string
  }
> = {
  linkedin: {
    name: 'LinkedIn',
    maxLength: 3000,
    hashtagCount: { min: 3, max: 5 },
    hasHeadline: false,
    hasDescription: false,
    format: 'professional_narrative',
  },
  instagram: {
    name: 'Instagram',
    maxLength: 2200,
    hashtagCount: { min: 15, max: 25 },
    hasHeadline: false,
    hasDescription: false,
    format: 'visual_story',
  },
  facebook: {
    name: 'Facebook',
    maxLength: 500,
    hashtagCount: { min: 1, max: 3 },
    hasHeadline: false,
    hasDescription: false,
    format: 'conversational',
  },
  twitter: {
    name: 'Twitter/X',
    maxLength: 280,
    hashtagCount: { min: 1, max: 2 },
    hasHeadline: false,
    hasDescription: false,
    format: 'punchy',
  },
  meta_ad: {
    name: 'Meta Ad',
    maxLength: 125,
    hashtagCount: { min: 0, max: 0 },
    hasHeadline: true,
    hasDescription: true,
    format: 'ad_copy',
  },
  google_display: {
    name: 'Google Display Ad',
    maxLength: 90,
    hashtagCount: { min: 0, max: 0 },
    hasHeadline: true,
    hasDescription: true,
    format: 'display_ad',
  },
  linkedin_ad: {
    name: 'LinkedIn Ad',
    maxLength: 150,
    hashtagCount: { min: 0, max: 0 },
    hasHeadline: true,
    hasDescription: false,
    format: 'sponsored_content',
  },
}

// ============================================
// SERVICE CONTEXT
// ============================================

const SERVICE_CONTEXT: Record<ServiceHighlight, string> = {
  kitchen_cleaning: `Commercial kitchen cleaning for restaurants, including hood cleaning, equipment sanitization, floor degreasing, and health code compliance. Focus on food safety, health inspections, and maintaining a clean cooking environment.`,
  restaurant_deep_clean: `Full restaurant deep cleaning including dining areas, kitchens, restrooms, and outdoor spaces. Focus on customer experience, health ratings, and maintaining a welcoming atmosphere.`,
  hotel_housekeeping: `Hotel and hospitality cleaning services including guest rooms, common areas, and back-of-house spaces. Focus on guest satisfaction, brand standards, and efficient turnover.`,
  office_cleaning: `Commercial office cleaning including workspaces, conference rooms, restrooms, and common areas. Focus on employee health, productivity, and professional appearance.`,
  post_construction: `Post-construction cleaning for new builds and renovations. Focus on detail work, debris removal, and move-in ready results.`,
  floor_care: `Commercial floor care including stripping, waxing, polishing, and carpet cleaning. Focus on extending floor life, safety, and professional appearance.`,
  general: `Commercial cleaning services for businesses of all types. Focus on reliability, professionalism, and customized cleaning solutions.`,
}

// ============================================
// CONTENT IDEAS GENERATION
// ============================================

// Determine if the style is community-focused (not promotional)
function isCommunityfocusedStyle(imageStyle?: ImageStyleId): boolean {
  if (!imageStyle) return false
  const style = IMAGE_STYLES[imageStyle]
  return style?.notAd === true
}

export async function generateContentIdeas(
  params: ContentGenerationParams
): Promise<ContentIdea[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  const constraints = PLATFORM_CONSTRAINTS[params.platform]
  const serviceContext = SERVICE_CONTEXT[params.serviceHighlight]

  // Check if this is a community/lifestyle style (NOT promotional)
  const isCommunityContent = isCommunityfocusedStyle(params.imageStyle)
  const styleConfig = params.imageStyle ? IMAGE_STYLES[params.imageStyle] : null

  // Different prompts for community-focused vs promotional content
  const prompt = isCommunityContent
    ? `You are a social media content strategist for Urban Simple, a commercial cleaning company based in Austin, TX. However, this post is NOT about promoting cleaning services.

CONTENT STYLE: ${styleConfig?.name || 'Community-focused'}
${styleConfig?.description ? `STYLE DESCRIPTION: ${styleConfig.description}` : ''}

${params.topic ? `TOPIC TO FOCUS ON: ${params.topic}` : ''}

TARGET PLATFORM: ${constraints.name}
- Max characters: ${constraints.maxLength}
- Hashtag count: ${constraints.hashtagCount.min}-${constraints.hashtagCount.max}
- Format style: ${constraints.format}

TARGET AUDIENCE: ${params.targetAudience}
TONE: ${params.tone}

CRITICAL INSTRUCTIONS:
1. This is a COMMUNITY ENGAGEMENT post, NOT a sales pitch
2. DO NOT mention cleaning services, commercial cleaning, or anything about what Urban Simple does
3. DO NOT include any call-to-action about getting quotes, contacting the company, or hiring services
4. The goal is to position Urban Simple as a LOCAL AUSTIN COMMUNITY MEMBER, not as a vendor trying to sell something
5. Focus on celebrating Austin culture, local businesses, community events, or the hospitality industry in general

${params.topic ? `
Focus this content on the topic: "${params.topic}"
- Share genuine appreciation for this topic
- Connect with the Austin community around this topic
- Be conversational and authentic, like a local business owner sharing something they care about
` : `
Generate content about:
- Celebrating local Austin restaurants, bars, or hospitality businesses
- Austin community events, culture, or local happenings
- Shout-outs to the hardworking people in the hospitality industry
- Fun Austin-specific content that locals would enjoy
- Industry insights that add value (not about selling cleaning)
`}

Generate 4 unique content ideas. Each idea should:
- Feel like it's coming from a company that's PART OF the Austin community, not just selling to it
- Be genuinely interesting and engaging, not marketing-focused
- NOT mention cleaning, sanitization, or Urban Simple's services

Return a JSON array with this structure:
[
  {
    "headline": "Attention-grabbing headline (40 chars max)",
    "hook": "Opening line that hooks the reader - NO sales pitch",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "suggestedImage": "Description of ideal accompanying image - should be lifestyle/community focused, NOT a promotional graphic",
    "hashtags": ["hashtag1", "hashtag2", ...]
  }
]

Remember: This is about building community presence and brand affinity, NOT selling services.`
    : `You are an expert B2B marketing content strategist for Urban Simple, a commercial cleaning company in Austin, TX.

CONTENT STYLE: ${styleConfig?.name || 'Promotional'}
${styleConfig?.description ? `STYLE DESCRIPTION: ${styleConfig.description}` : ''}

BUSINESS CONTEXT:
Urban Simple provides ${serviceContext}

TARGET PLATFORM: ${constraints.name}
- Max characters: ${constraints.maxLength}
- Hashtag count: ${constraints.hashtagCount.min}-${constraints.hashtagCount.max}
- Format style: ${constraints.format}

TARGET AUDIENCE: ${params.targetAudience}
TONE: ${params.tone}
CONTENT TYPE: ${params.contentType === 'social_post' ? 'Organic social media post' : 'Paid advertisement'}
${params.topic ? `SPECIFIC TOPIC: ${params.topic}` : ''}
${params.callToAction ? `CALL TO ACTION: ${params.callToAction}` : ''}

Generate 4 unique content ideas for ${constraints.name}. Each idea should:
- Be tailored to the platform's format and audience
- Highlight the value of professional commercial cleaning
- Appeal to business owners/managers who make purchasing decisions
- ${params.contentType === 'ad_creative' ? 'Include a clear value proposition and urgency' : 'Provide value and build brand awareness'}

Return a JSON array with this structure:
[
  {
    "headline": "Attention-grabbing headline (40 chars max)",
    "hook": "Opening line that hooks the reader",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "suggestedImage": "Description of ideal accompanying image",
    "hashtags": ["hashtag1", "hashtag2", ...]
  }
]

Make the content feel authentic, not overly salesy. Focus on pain points like:
- Failed health inspections
- Staff overwhelmed with cleaning duties
- Inconsistent cleanliness affecting customer reviews
- Hidden costs of DIY cleaning
- The value of first impressions`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to generate content ideas:', error)
    throw new Error('Failed to generate content ideas')
  }
}

// ============================================
// FULL CONTENT GENERATION
// ============================================

export async function generateContent(
  params: ContentGenerationParams,
  selectedIdea: ContentIdea
): Promise<GeneratedContent> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  const constraints = PLATFORM_CONSTRAINTS[params.platform]
  const serviceContext = SERVICE_CONTEXT[params.serviceHighlight]

  // Check if this is a community/lifestyle style (NOT promotional)
  const isCommunityContent = isCommunityfocusedStyle(params.imageStyle)
  const styleConfig = params.imageStyle ? IMAGE_STYLES[params.imageStyle] : null

  // For community content, use a different prompt that doesn't push sales
  const prompt = isCommunityContent
    ? `You are a social media content writer for Urban Simple, a company that's PART OF the Austin community. However, this post is NOT about promoting any services.

CONTENT STYLE: ${styleConfig?.name || 'Community-focused'}

SELECTED IDEA:
- Headline: ${selectedIdea.headline}
- Hook: ${selectedIdea.hook}
- Key Points: ${selectedIdea.keyPoints.join(', ')}

TARGET PLATFORM: ${constraints.name}
CONSTRAINTS:
- Primary text max: ${constraints.maxLength} characters
- Hashtags: ${constraints.hashtagCount.min}-${constraints.hashtagCount.max}

TARGET AUDIENCE: ${params.targetAudience}
TONE: ${params.tone}

CRITICAL INSTRUCTIONS:
1. This is COMMUNITY ENGAGEMENT content - NOT a sales pitch
2. DO NOT mention cleaning services, commercial cleaning, sanitization, or anything about what Urban Simple offers
3. DO NOT include any call-to-action about getting quotes, contacting the company, or hiring services
4. Write as if you're a local Austin business owner sharing something they genuinely care about
5. The CTA should be engagement-focused like "What's your favorite spot?" or "Drop a ❤️ if you agree" - NOT "Contact us" or "Get a quote"

${
  params.platform === 'linkedin'
    ? `
For LinkedIn:
- Professional but warm tone
- Share an insight or appreciation
- End with a question to spark conversation
- NO business pitch`
    : ''
}

${
  params.platform === 'instagram'
    ? `
For Instagram:
- Casual, friendly language
- Emojis welcome but don't overdo it
- End with an engagement question
- Hashtags should be Austin/community focused`
    : ''
}

${
  params.platform === 'facebook'
    ? `
For Facebook:
- Conversational and community-focused
- Celebrate Austin or local businesses
- Encourage comments and sharing
- Feel like a local neighbor, not a business`
    : ''
}

Return a JSON object:
{
  "headline": "",
  "primaryText": "Main content body - community/lifestyle focused, NO sales pitch",
  "description": "",
  "callToAction": "Engagement-focused CTA like 'What do you think?' or simply leave empty",
  "hashtags": ["hashtag1", "hashtag2", ...]
}

IMPORTANT: Ensure primaryText is under ${constraints.maxLength} characters. NO SALES LANGUAGE.`
    : `You are an expert B2B marketing copywriter for Urban Simple, a commercial cleaning company in Austin, TX.

CONTENT STYLE: ${styleConfig?.name || 'Promotional'}

BUSINESS CONTEXT:
Urban Simple provides ${serviceContext}

SELECTED IDEA:
- Headline: ${selectedIdea.headline}
- Hook: ${selectedIdea.hook}
- Key Points: ${selectedIdea.keyPoints.join(', ')}

TARGET PLATFORM: ${constraints.name}
CONSTRAINTS:
- Primary text max: ${constraints.maxLength} characters
${constraints.hasHeadline ? '- Needs a headline (40 chars max)' : ''}
${constraints.hasDescription ? '- Needs a description (30 chars max)' : ''}
- Hashtags: ${constraints.hashtagCount.min}-${constraints.hashtagCount.max}

TARGET AUDIENCE: ${params.targetAudience}
TONE: ${params.tone}
${params.callToAction ? `CALL TO ACTION: ${params.callToAction}` : 'CALL TO ACTION: Contact us for a free quote'}

Write the full ${params.contentType === 'social_post' ? 'social media post' : 'ad copy'}.

${
  params.platform === 'linkedin'
    ? `
For LinkedIn:
- Start with a hook that stops the scroll
- Use line breaks for readability
- Share a specific insight or story
- End with a question or soft CTA
- Professional but approachable tone`
    : ''
}

${
  params.platform === 'instagram'
    ? `
For Instagram:
- Visual, emoji-friendly language
- Break into short paragraphs
- Strong call to action
- Hashtags at the end (mix of popular and niche)`
    : ''
}

${
  params.platform === 'facebook'
    ? `
For Facebook:
- Conversational and relatable
- Focus on local Austin community
- Encourage engagement (questions, comments)
- Keep it concise and scannable`
    : ''
}

${
  params.platform === 'twitter'
    ? `
For Twitter/X:
- Punchy and memorable
- Single clear message
- Use every character wisely
- 1-2 relevant hashtags only`
    : ''
}

${
  params.contentType === 'ad_creative'
    ? `
For Paid Ads:
- Clear value proposition in headline
- Benefit-focused primary text
- Strong, specific CTA
- Create urgency without being pushy
- Focus on ROI and business outcomes`
    : ''
}

Return a JSON object:
{
  "headline": "Headline text (if applicable, otherwise empty string)",
  "primaryText": "Main content body",
  "description": "Short description (if applicable, otherwise empty string)",
  "callToAction": "CTA text",
  "hashtags": ["hashtag1", "hashtag2", ...]
}

IMPORTANT: Ensure primaryText is under ${constraints.maxLength} characters.`

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
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to generate content:', error)
    throw new Error('Failed to generate content')
  }
}

// ============================================
// CONTENT VARIATIONS (A/B Testing)
// ============================================

export async function generateVariations(
  params: ContentGenerationParams,
  baseContent: GeneratedContent,
  variationCount: number = 3
): Promise<Array<GeneratedContent & { variationLabel: string }>> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  const constraints = PLATFORM_CONSTRAINTS[params.platform]

  const prompt = `You are an expert marketing copywriter. Create ${variationCount} variations of this content for A/B testing.

ORIGINAL CONTENT:
${JSON.stringify(baseContent, null, 2)}

PLATFORM: ${constraints.name}
MAX LENGTH: ${constraints.maxLength} characters

Create ${variationCount} variations that:
1. Test different hooks/openings
2. Test different emotional appeals (logic vs emotion vs urgency)
3. Test different CTAs

Return a JSON array where each variation has a "variationLabel" (A, B, C, etc.):
[
  {
    "variationLabel": "A",
    "headline": "...",
    "primaryText": "...",
    "description": "...",
    "callToAction": "...",
    "hashtags": [...]
  }
]`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    })

    const text = result.response.text()
    return JSON.parse(text)
  } catch (error) {
    console.error('Failed to generate variations:', error)
    throw new Error('Failed to generate content variations')
  }
}

// ============================================
// CONTENT ENHANCEMENT
// ============================================

export async function improveContent(
  content: string,
  platform: Platform,
  instructions: string
): Promise<string> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  const constraints = PLATFORM_CONSTRAINTS[platform]

  const prompt = `Improve this ${constraints.name} content based on the instructions.

CURRENT CONTENT:
${content}

INSTRUCTIONS:
${instructions}

MAX LENGTH: ${constraints.maxLength} characters

Return only the improved text, nothing else.`

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    })

    return result.response.text().trim()
  } catch (error) {
    console.error('Failed to improve content:', error)
    throw new Error('Failed to improve content')
  }
}

// ============================================
// HASHTAG GENERATION
// ============================================

export async function generateHashtags(
  content: string,
  platform: Platform
): Promise<string[]> {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  const constraints = PLATFORM_CONSTRAINTS[platform]

  if (constraints.hashtagCount.max === 0) {
    return []
  }

  const prompt = `Generate ${constraints.hashtagCount.min}-${constraints.hashtagCount.max} relevant hashtags for this ${constraints.name} post about commercial cleaning services.

CONTENT:
${content}

Requirements:
- Mix of popular hashtags (for reach) and niche hashtags (for targeting)
- Relevant to commercial cleaning, B2B services, Austin TX
- No # symbol in the response

Return a JSON array of hashtag strings:
["hashtag1", "hashtag2", ...]`

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
    console.error('Failed to generate hashtags:', error)
    return []
  }
}

// ============================================
// HELPERS
// ============================================

export function getPlatformAspectRatio(
  platform: Platform
): '1:1' | '4:3' | '16:9' | '9:16' | '3:4' {
  switch (platform) {
    case 'instagram':
      return '1:1' // or 4:5 for feed, 9:16 for stories
    case 'facebook':
      return '1:1'
    case 'linkedin':
      return '16:9'
    case 'twitter':
      return '16:9'
    case 'meta_ad':
      return '1:1'
    case 'google_display':
      return '16:9'
    case 'linkedin_ad':
      return '16:9'
    default:
      return '1:1'
  }
}

export function validateContentLength(
  content: string,
  platform: Platform
): { valid: boolean; currentLength: number; maxLength: number } {
  const maxLength = PLATFORM_CONSTRAINTS[platform].maxLength
  const currentLength = content.length
  return {
    valid: currentLength <= maxLength,
    currentLength,
    maxLength,
  }
}
