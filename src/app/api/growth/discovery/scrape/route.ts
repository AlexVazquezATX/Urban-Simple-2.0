import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// POST /api/growth/discovery/scrape - Extract businesses from a URL using AI
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { url } = body

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Fetch the page content
    let pageContent: string
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`)
      }

      pageContent = await response.text()
    } catch (error: any) {
      console.error('Error fetching URL:', error)
      return NextResponse.json(
        { error: `Failed to fetch URL: ${error.message}` },
        { status: 400 }
      )
    }

    // Use Gemini AI to extract business names from the page
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Clean up HTML - remove scripts, styles, and extract text
    const cleanedContent = pageContent
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 30000) // Limit to ~30k chars for API

    const prompt = `You are analyzing a webpage about restaurants, bars, hotels, or other hospitality businesses.

Extract all business names mentioned in this content. For each business, also extract any available details:
- Address or neighborhood/area
- Type of cuisine or business category
- Website URL if mentioned
- Any other identifying details

Return a JSON array of objects with this structure:
{
  "businesses": [
    {
      "name": "Business Name",
      "category": "Italian Restaurant" or "Bar" or "Hotel" etc,
      "address": "123 Main St" or "Downtown Austin" (whatever location info is available),
      "city": "Austin" (if mentioned),
      "state": "TX" (if mentioned),
      "website": "https://..." (if mentioned),
      "description": "Brief description if available"
    }
  ]
}

If no businesses are found, return: {"businesses": []}

IMPORTANT: Only return valid JSON, no other text. Be thorough and extract ALL business names mentioned.

Page content:
${cleanedContent}`

    try {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
            },
          }),
        }
      )

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text()
        console.error('Gemini API error:', errorText)
        throw new Error('Failed to process with AI')
      }

      const geminiData = await geminiResponse.json()
      const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

      // Parse the JSON response
      let businesses: any[] = []
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*"businesses"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          businesses = parsed.businesses || []
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError)
        console.log('Raw response:', responseText)
      }

      // Transform to our result format
      const results = businesses.map((biz: any) => ({
        source: 'web_scraper',
        name: biz.name,
        address: {
          street: biz.address || undefined,
          city: biz.city || undefined,
          state: biz.state || undefined,
        },
        website: biz.website || undefined,
        categories: biz.category ? [biz.category] : [],
        rawData: {
          ...biz,
          sourceUrl: url,
        },
      }))

      // Deduplicate by name
      const uniqueResults = results.reduce((acc: any[], result: any) => {
        const exists = acc.find(r => r.name.toLowerCase() === result.name.toLowerCase())
        if (!exists && result.name) {
          acc.push(result)
        }
        return acc
      }, [])

      return NextResponse.json({
        results: uniqueResults,
        total: uniqueResults.length,
        sourceUrl: url,
      })
    } catch (error: any) {
      console.error('Error processing with AI:', error)
      return NextResponse.json(
        { error: 'Failed to extract businesses from page' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in scrape endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to scrape URL' },
      { status: 500 }
    )
  }
}
