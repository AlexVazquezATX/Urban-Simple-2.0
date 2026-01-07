import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Helper to search Google Places for a business
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

    // Get the first (best) match
    const place = placesData.results[0]

    // Get detailed info
    if (place.place_id) {
      const detailsResponse = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,business_status,opening_hours,price_level&key=${apiKey}`
      )

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json()
        return {
          source: 'google_places',
          ...place,
          ...detailsData.result,
        }
      }
    }

    return { source: 'google_places', ...place }
  } catch (error) {
    console.error('Error searching Google Places:', error)
    return null
  }
}

// Helper to search Yelp for a business
async function searchYelp(businessName: string, location: string): Promise<any | null> {
  const apiKey = process.env.YELP_API_KEY
  if (!apiKey) return null

  try {
    const yelpResponse = await fetch(
      `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(businessName)}&location=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!yelpResponse.ok) return null

    const yelpData = await yelpResponse.json()
    if (!yelpData.businesses || yelpData.businesses.length === 0) return null

    return {
      source: 'yelp',
      ...yelpData.businesses[0],
    }
  } catch (error) {
    console.error('Error searching Yelp:', error)
    return null
  }
}

// POST /api/growth/prospects/[id]/enrich - AI enrichment for prospect
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify prospect belongs to user's company
    const prospect = await prisma.prospect.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        contacts: true,
      },
    })

    if (!prospect) {
      return NextResponse.json({ error: 'Prospect not found' }, { status: 404 })
    }

    // Get location from prospect address
    const address = prospect.address as any
    const location = address?.city
      ? `${address.city}${address.state ? `, ${address.state}` : ''}`
      : ''

    // Search external APIs for real business data
    const [googleData, yelpData] = await Promise.all([
      location ? searchGooglePlaces(prospect.companyName, location) : Promise.resolve(null),
      location ? searchYelp(prospect.companyName, location) : Promise.resolve(null),
    ])

    // Merge external data - prefer data that fills in missing fields
    const externalData: any = {}

    // From Google Places
    if (googleData) {
      if (!prospect.phone && googleData.formatted_phone_number) {
        externalData.phone = googleData.formatted_phone_number
      }
      if (!prospect.website && googleData.website) {
        externalData.website = googleData.website
      }
      if (googleData.rating) {
        externalData.googleRating = googleData.rating
        externalData.googleReviewCount = googleData.user_ratings_total
      }
      if (googleData.types && googleData.types.length > 0) {
        externalData.googleTypes = googleData.types
      }
      if (googleData.price_level !== undefined) {
        externalData.googlePriceLevel = '$'.repeat(googleData.price_level + 1)
      }
      // Update address if we don't have one
      if (!address?.street && googleData.formatted_address) {
        externalData.addressFromGoogle = googleData.formatted_address
      }
    }

    // From Yelp
    if (yelpData) {
      if (!prospect.phone && !externalData.phone && yelpData.phone) {
        externalData.phone = yelpData.phone
      }
      if (yelpData.rating) {
        externalData.yelpRating = yelpData.rating
        externalData.yelpReviewCount = yelpData.review_count
      }
      if (yelpData.price) {
        externalData.yelpPrice = yelpData.price
      }
      if (yelpData.categories && yelpData.categories.length > 0) {
        externalData.yelpCategories = yelpData.categories.map((c: any) => c.title)
      }
      // Update address from Yelp if needed
      if (!address?.street && !externalData.addressFromGoogle && yelpData.location) {
        externalData.yelpAddress = yelpData.location
      }
    }

    // Use Gemini for AI insights
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
    let aiEnrichment: any = {}

    if (geminiApiKey) {
      const genAI = new GoogleGenerativeAI(geminiApiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      // Build enrichment prompt with real data
      const prompt = `You are a business research assistant. Analyze the following prospect information and provide enrichment data:

Company Name: ${prospect.companyName}
Legal Name: ${prospect.legalName || 'Not provided'}
Industry: ${prospect.industry || 'Not provided'}
Business Type: ${prospect.businessType || 'Not provided'}
Address: ${JSON.stringify(prospect.address || {})}
Website: ${prospect.website || externalData.website || 'Not provided'}
Phone: ${prospect.phone || externalData.phone || 'Not provided'}
${prospect.contacts.length > 0 ? `Contact: ${prospect.contacts[0].firstName} ${prospect.contacts[0].lastName} (${prospect.contacts[0].title || 'No title'})` : ''}

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
        const response = await result.response
        const text = response.text()

        // Parse JSON from response
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

    // Build update data
    const updateData: any = {
      aiEnriched: true,
      enrichmentDate: new Date(),
    }

    // Add phone/website from external data if missing
    if (externalData.phone && !prospect.phone) {
      updateData.phone = externalData.phone
    }
    if (externalData.website && !prospect.website) {
      updateData.website = externalData.website
    }

    // Add price level from external data (prefer Google, fall back to Yelp)
    const priceLevel = externalData.googlePriceLevel || externalData.yelpPrice
    if (priceLevel && !prospect.priceLevel) {
      updateData.priceLevel = priceLevel
    }

    // Add AI enrichment data
    if (aiEnrichment.estimatedSize) updateData.estimatedSize = aiEnrichment.estimatedSize
    if (aiEnrichment.industry) updateData.industry = aiEnrichment.industry
    if (aiEnrichment.businessType && !prospect.businessType) updateData.businessType = aiEnrichment.businessType
    if (aiEnrichment.estimatedValue) updateData.estimatedValue = aiEnrichment.estimatedValue
    if (aiEnrichment.potentialValue) {
      updateData.priority = aiEnrichment.potentialValue === 'high' ? 'high' :
                           aiEnrichment.potentialValue === 'low' ? 'low' : 'medium'
    }

    // Store all enrichment data
    updateData.discoveryData = {
      ...((prospect.discoveryData as any) || {}),
      googlePlaces: googleData,
      yelp: yelpData,
      externalData,
      aiEnrichment,
      enrichedAt: new Date().toISOString(),
    }

    // Update prospect
    const updatedProspect = await prisma.prospect.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Create activity log
    const enrichmentSummary = []
    if (googleData) enrichmentSummary.push(`Google: ${externalData.googleRating}/5 (${externalData.googleReviewCount} reviews)`)
    if (yelpData) enrichmentSummary.push(`Yelp: ${externalData.yelpRating}/5 (${externalData.yelpReviewCount} reviews)`)
    if (priceLevel) enrichmentSummary.push(`Price: ${priceLevel}`)
    if (externalData.phone && !prospect.phone) enrichmentSummary.push(`Found phone: ${externalData.phone}`)
    if (externalData.website && !prospect.website) enrichmentSummary.push(`Found website`)

    await prisma.prospectActivity.create({
      data: {
        prospectId: id,
        userId: user.id,
        type: 'note',
        title: 'AI Enrichment Completed',
        description: enrichmentSummary.length > 0
          ? `Data found: ${enrichmentSummary.join(', ')}. ${aiEnrichment.insights || ''}`
          : `AI analysis completed. ${aiEnrichment.insights || 'See enrichment data'}`,
        metadata: {
          externalData,
          aiEnrichment,
        },
      },
    })

    return NextResponse.json({
      prospect: updatedProspect,
      enrichment: {
        externalData,
        aiEnrichment,
      },
    })
  } catch (error: any) {
    console.error('Error enriching prospect:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to enrich prospect' },
      { status: 500 }
    )
  }
}

