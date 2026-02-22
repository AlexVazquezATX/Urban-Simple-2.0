/**
 * Prospect Enricher Service
 *
 * Extracted from the /api/growth/prospects/[id]/enrich route so both the
 * API endpoint and the Growth Agent can call it without HTTP overhead.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

export interface EnrichmentInput {
  companyName: string
  legalName?: string | null
  industry?: string | null
  businessType?: string | null
  address?: any
  website?: string | null
  phone?: string | null
  contacts?: Array<{
    firstName: string
    lastName: string
    title?: string | null
  }>
}

export interface ExternalData {
  phone?: string
  website?: string
  googleRating?: number
  googleReviewCount?: number
  googleTypes?: string[]
  googlePriceLevel?: string
  yelpRating?: number
  yelpReviewCount?: number
  yelpPrice?: string
  yelpCategories?: string[]
  addressFromGoogle?: string
  yelpAddress?: any
}

export interface AIEnrichment {
  estimatedSize?: string
  industry?: string
  businessType?: string
  estimatedRevenue?: string
  decisionMakerTitle?: string
  potentialValue?: string
  outreachSuggestion?: string
  insights?: string
  estimatedValue?: number
}

export interface EnrichmentResult {
  externalData: ExternalData
  aiEnrichment: AIEnrichment
  googleData: any
  yelpData: any
}

// Search Google Places for a single business
async function searchGooglePlaces(businessName: string, location: string): Promise<any | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  try {
    const searchQuery = `${businessName} ${location}`
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${apiKey}`
    )

    if (!placesResponse.ok) return null

    const placesData = await placesResponse.json()
    if (!placesData.results || placesData.results.length === 0) return null

    const place = placesData.results[0]

    if (place.place_id) {
      const detailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,business_status,opening_hours,price_level&key=${apiKey}`
      )

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json()
        return { source: 'google_places', ...place, ...detailsData.result }
      }
    }

    return { source: 'google_places', ...place }
  } catch (error) {
    console.error('Error searching Google Places:', error)
    return null
  }
}

// Search Yelp for a single business
async function searchYelp(businessName: string, location: string): Promise<any | null> {
  const apiKey = process.env.YELP_API_KEY
  if (!apiKey) return null

  try {
    const yelpResponse = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(businessName)}&location=${encodeURIComponent(location)}&limit=1`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )

    if (!yelpResponse.ok) return null

    const yelpData = await yelpResponse.json()
    if (!yelpData.businesses || yelpData.businesses.length === 0) return null

    return { source: 'yelp', ...yelpData.businesses[0] }
  } catch (error) {
    console.error('Error searching Yelp:', error)
    return null
  }
}

/**
 * Enrich a prospect with external API data and AI analysis.
 * Returns structured enrichment data without modifying the database.
 */
export async function enrichProspectData(input: EnrichmentInput): Promise<EnrichmentResult> {
  const address = input.address as any
  const location = address?.city
    ? `${address.city}${address.state ? `, ${address.state}` : ''}`
    : ''

  // Search external APIs in parallel
  const [googleData, yelpData] = await Promise.all([
    location ? searchGooglePlaces(input.companyName, location) : Promise.resolve(null),
    location ? searchYelp(input.companyName, location) : Promise.resolve(null),
  ])

  // Merge external data
  const externalData: ExternalData = {}

  if (googleData) {
    if (!input.phone && googleData.formatted_phone_number) {
      externalData.phone = googleData.formatted_phone_number
    }
    if (!input.website && googleData.website) {
      externalData.website = googleData.website
    }
    if (googleData.rating) {
      externalData.googleRating = googleData.rating
      externalData.googleReviewCount = googleData.user_ratings_total
    }
    if (googleData.types?.length > 0) {
      externalData.googleTypes = googleData.types
    }
    if (googleData.price_level !== undefined) {
      externalData.googlePriceLevel = '$'.repeat(googleData.price_level + 1)
    }
    if (!address?.street && googleData.formatted_address) {
      externalData.addressFromGoogle = googleData.formatted_address
    }
  }

  if (yelpData) {
    if (!input.phone && !externalData.phone && yelpData.phone) {
      externalData.phone = yelpData.phone
    }
    if (yelpData.rating) {
      externalData.yelpRating = yelpData.rating
      externalData.yelpReviewCount = yelpData.review_count
    }
    if (yelpData.price) {
      externalData.yelpPrice = yelpData.price
    }
    if (yelpData.categories?.length > 0) {
      externalData.yelpCategories = yelpData.categories.map((c: any) => c.title)
    }
    if (!address?.street && !externalData.addressFromGoogle && yelpData.location) {
      externalData.yelpAddress = yelpData.location
    }
  }

  // AI enrichment via Gemini
  let aiEnrichment: AIEnrichment = {}
  const geminiApiKey =
    process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

  if (geminiApiKey) {
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const contactLine =
      input.contacts && input.contacts.length > 0
        ? `Contact: ${input.contacts[0].firstName} ${input.contacts[0].lastName} (${input.contacts[0].title || 'No title'})`
        : ''

    const prompt = `You are a business research assistant. Analyze the following prospect information and provide enrichment data:

Company Name: ${input.companyName}
Legal Name: ${input.legalName || 'Not provided'}
Industry: ${input.industry || 'Not provided'}
Business Type: ${input.businessType || 'Not provided'}
Address: ${JSON.stringify(input.address || {})}
Website: ${input.website || externalData.website || 'Not provided'}
Phone: ${input.phone || externalData.phone || 'Not provided'}
${contactLine}

External Data Found:
- Google Rating: ${externalData.googleRating || 'N/A'} (${externalData.googleReviewCount || 0} reviews)
- Yelp Rating: ${externalData.yelpRating || 'N/A'} (${externalData.yelpReviewCount || 0} reviews)
- Price Level: ${externalData.googlePriceLevel || externalData.yelpPrice || 'N/A'}
- Categories: ${externalData.yelpCategories?.join(', ') || externalData.googleTypes?.slice(0, 5).join(', ') || 'N/A'}

Based on this information, provide:
1. Estimated business size (small: 1-10 employees, medium: 11-50, large: 50+)
2. More specific industry classification if possible
3. Estimated annual revenue range
4. Key decision maker title suggestions
5. Potential value as a client (low/medium/high) based on ratings and reviews
6. Personalized outreach approach suggestion
7. Any additional insights

Respond in JSON format only (no markdown):
{
  "estimatedSize": "small|medium|large",
  "industry": "string (more specific if possible)",
  "businessType": "string",
  "estimatedRevenue": "string (e.g., '$100k-$500k')",
  "decisionMakerTitle": "string",
  "potentialValue": "low|medium|high",
  "outreachSuggestion": "string",
  "insights": "string",
  "estimatedValue": number (in dollars, optional)
}`

    try {
      const result = await model.generateContent(prompt)
      const response = result.response
      const text = response.text()

      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiEnrichment = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        aiEnrichment = JSON.parse(text)
      }
    } catch (error) {
      console.error('Error with AI enrichment:', error)
      aiEnrichment = { insights: 'AI analysis could not be completed' }
    }
  }

  return { externalData, aiEnrichment, googleData, yelpData }
}
