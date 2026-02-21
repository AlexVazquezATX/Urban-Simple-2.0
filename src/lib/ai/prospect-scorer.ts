import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || ''
)

export interface ProspectScoringData {
  companyName: string
  businessType?: string
  industry?: string
  address?: {
    city?: string
    state?: string
  }
  website?: string
  priceLevel?: string
  employeeCount?: number
  estimatedSize?: string
  discoveryData?: any
}

export interface ProspectScore {
  score: number // 0-100
  priority: 'urgent' | 'high' | 'medium' | 'low'
  reasoning: string
  recommendedChannel?: 'email' | 'sms' | 'linkedin' | 'instagram_dm'
}

/**
 * Score a prospect using AI to determine fit and priority
 */
export async function scoreProspect(
  data: ProspectScoringData
): Promise<ProspectScore> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = buildScoringPrompt(data)

    const result = await model.generateContent(prompt)
    const response = result.response
    const text = response.text()

    return parseScoringResponse(text)
  } catch (error) {
    console.error('Error scoring prospect:', error)
    // Return default score on error
    return {
      score: 50,
      priority: 'medium',
      reasoning: 'Unable to score prospect automatically',
    }
  }
}

function buildScoringPrompt(data: ProspectScoringData): string {
  let context = `PROSPECT INFORMATION:
Company Name: ${data.companyName}
`

  if (data.businessType) {
    context += `Business Type: ${data.businessType}\n`
  }

  if (data.industry) {
    context += `Industry: ${data.industry}\n`
  }

  if (data.address?.city) {
    context += `Location: ${data.address.city}`
    if (data.address.state) {
      context += `, ${data.address.state}`
    }
    context += '\n'
  }

  if (data.priceLevel) {
    context += `Price Level: ${data.priceLevel}\n`
  }

  if (data.employeeCount) {
    context += `Employee Count: ${data.employeeCount}\n`
  }

  if (data.estimatedSize) {
    context += `Estimated Size: ${data.estimatedSize}\n`
  }

  if (data.website) {
    context += `Website: ${data.website}\n`
  }

  return `You are a sales intelligence AI for Urban Simple, a commercial cleaning company specializing in hospitality services (restaurants, hotels, bars, commercial kitchens).

${context}

TASK: Score this prospect on a scale of 0-100 and determine priority level.

SCORING CRITERIA:
1. Industry Fit (0-30 points): How well does this business type match our services?
   - Restaurants, hotels, bars, commercial kitchens = high fit
   - Retail, offices = medium fit
   - Other = low fit

2. Size Potential (0-25 points): Estimated monthly contract value
   - Large establishments ($$$$) = 20-25 points
   - Medium ($$$) = 15-20 points
   - Small ($$) = 10-15 points
   - Budget ($) = 5-10 points

3. Location (0-20 points): Geographic fit
   - In our service area = 15-20 points
   - Nearby = 10-15 points
   - Far = 5-10 points

4. Business Health (0-15 points): Indicators of stability
   - High ratings, active website = 10-15 points
   - Moderate indicators = 5-10 points
   - Limited info = 0-5 points

5. Contact Accessibility (0-10 points): Can we reach decision makers?
   - Email/phone available = 8-10 points
   - Limited contact info = 4-7 points
   - No contact info = 0-3 points

PRIORITY LEVELS:
- urgent (90-100): Perfect fit, high value, immediate opportunity
- high (70-89): Strong fit, good value, prioritize soon
- medium (50-69): Decent fit, moderate value, standard priority
- low (0-49): Weak fit or low value, nurture or skip

OUTPUT FORMAT (JSON only, no markdown):
{
  "score": <number 0-100>,
  "priority": "<urgent|high|medium|low>",
  "reasoning": "<2-3 sentence explanation of the score>",
  "recommendedChannel": "<email|sms|linkedin|instagram_dm>"
}

Provide ONLY the JSON object, no other text.`
}

function parseScoringResponse(text: string): ProspectScore {
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        priority: parsed.priority || 'medium',
        reasoning: parsed.reasoning || 'Scored automatically',
        recommendedChannel: parsed.recommendedChannel,
      }
    }
  } catch (error) {
    console.error('Error parsing scoring response:', error)
  }

  // Fallback parsing
  const scoreMatch = text.match(/score[":\s]+(\d+)/i)
  const priorityMatch = text.match(/priority[":\s]+(urgent|high|medium|low)/i)
  const reasoningMatch = text.match(/reasoning[":\s]+(.+?)(?:\n|$)/i)

  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : 50,
    priority: (priorityMatch?.[1] as any) || 'medium',
    reasoning: reasoningMatch?.[1] || 'Scored automatically',
  }
}
