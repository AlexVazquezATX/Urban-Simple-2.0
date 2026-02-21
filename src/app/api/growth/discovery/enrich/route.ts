import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

// POST /api/growth/discovery/enrich - AI enrichment for prospect data
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { prospectData } = body

    if (!prospectData) {
      return NextResponse.json({ error: 'Prospect data is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // Build prompt for AI enrichment
    const prompt = `You are a business research assistant. Analyze the following business information and provide insights:

Business Name: ${prospectData.name || 'Unknown'}
Address: ${JSON.stringify(prospectData.address || {})}
Website: ${prospectData.website || 'Not provided'}
Phone: ${prospectData.phone || 'Not provided'}
Rating: ${prospectData.rating || 'Not provided'}
Review Count: ${prospectData.reviewCount || 'Not provided'}
Categories/Types: ${JSON.stringify(prospectData.categories || prospectData.types || [])}

Please provide:
1. Estimated business size (small: 1-10 employees, medium: 11-50, large: 50+)
2. Industry classification
3. Business type (restaurant, bar, hotel, retail, etc.)
4. Estimated annual revenue range (if possible)
5. Key decision maker title (GM, Owner, Facilities Manager, etc.)
6. Potential value as a client (low/medium/high)
7. Personalized outreach approach suggestion

Respond in JSON format:
{
  "estimatedSize": "small|medium|large",
  "industry": "string",
  "businessType": "string",
  "estimatedRevenue": "string (e.g., '$100k-$500k')",
  "decisionMakerTitle": "string",
  "potentialValue": "low|medium|high",
  "outreachSuggestion": "string",
  "notes": "string"
}`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    // Parse JSON from response
    let enrichment: any = {}
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        enrichment = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } else {
        enrichment = JSON.parse(text)
      }
    } catch (error) {
      console.error('Error parsing AI response:', error)
      // Fallback: try to extract key information
      enrichment = {
        notes: text,
        potentialValue: 'medium',
      }
    }

    return NextResponse.json({
      enrichment,
      rawResponse: text,
    })
  } catch (error) {
    console.error('Error enriching prospect:', error)
    return NextResponse.json(
      { error: 'Failed to enrich prospect data' },
      { status: 500 }
    )
  }
}

