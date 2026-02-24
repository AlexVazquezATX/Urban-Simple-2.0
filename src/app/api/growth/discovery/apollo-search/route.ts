import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

const APOLLO_API_KEY = process.env.APOLLO_API_KEY

// GET /api/growth/discovery/apollo-search?location=Austin,Texas,United States&keywords=restaurant&page=1
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!APOLLO_API_KEY) {
      return NextResponse.json({ error: 'APOLLO_API_KEY not configured' }, { status: 500 })
    }

    const params = request.nextUrl.searchParams
    const location = params.get('location') || 'Austin, Texas, United States'
    const keywords = params.get('keywords') || 'restaurant'
    const page = parseInt(params.get('page') || '1', 10)
    const perPage = Math.min(parseInt(params.get('per_page') || '25', 10), 100)

    const titles = params.get('titles')?.split(',') || [
      'Owner',
      'Co-Owner',
      'Founder',
      'General Manager',
      'Managing Partner',
      'Partner',
      'Executive Chef',
      'Director of Operations',
      'F&B Director',
      'Restaurant Manager',
    ]

    // Call Apollo's People API Search directly
    const requestBody: Record<string, any> = {
      api_key: APOLLO_API_KEY,
      page,
      per_page: perPage,
      person_titles: titles,
      organization_locations: [location],
      q_keywords: keywords,
    }

    console.log('[Apollo Test] Request:', JSON.stringify(requestBody, null, 2))

    // Try the newer API endpoint first, fall back to legacy
    let response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })

    // If 404 or 422, try without q_keywords (might not be supported)
    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[Apollo Test] First attempt failed (${response.status}):`, errorText)

      // Retry without q_keywords, use organization name contains instead
      const retryBody: Record<string, any> = {
        api_key: APOLLO_API_KEY,
        page,
        per_page: perPage,
        person_titles: titles,
        organization_locations: [location],
        q_organization_keyword_tags: [keywords],
      }

      console.log('[Apollo Test] Retrying with q_organization_keyword_tags:', JSON.stringify(retryBody, null, 2))

      response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryBody),
      })

      if (!response.ok) {
        const retryError = await response.text()
        console.log(`[Apollo Test] Second attempt failed (${response.status}):`, retryError)

        // Final attempt: minimal params, just location + titles
        const minimalBody: Record<string, any> = {
          api_key: APOLLO_API_KEY,
          page,
          per_page: perPage,
          person_titles: titles,
          organization_locations: [location],
        }

        console.log('[Apollo Test] Final attempt with minimal params')

        response = await fetch('https://api.apollo.io/api/v1/mixed_people/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(minimalBody),
        })

        if (!response.ok) {
          const finalError = await response.text()
          return NextResponse.json({
            error: `Apollo API error: ${response.status}`,
            details: finalError,
            hint: 'Check Vercel logs for full request/response details',
          }, { status: response.status })
        }
      }
    }

    const data = await response.json()
    console.log(`[Apollo Test] Found ${data.people?.length || 0} contacts, total: ${data.pagination?.total_entries || 0}`)

    // Format for easy reading
    const formatted = (data.people || []).map((c: any) => ({
      name: c.name || `${c.first_name} ${c.last_name}`,
      title: c.title,
      company: c.organization?.name,
      website: c.organization?.website_url,
      industry: c.organization?.industry,
      employees: c.organization?.estimated_num_employees,
      linkedin: c.linkedin_url,
      seniority: c.seniority,
    }))

    return NextResponse.json({
      location,
      keywords,
      pagination: data.pagination,
      total: data.pagination?.total_entries || 0,
      showing: formatted.length,
      contacts: formatted,
    })
  } catch (error: any) {
    console.error('Apollo search error:', error)
    return NextResponse.json(
      { error: error.message || 'Apollo search failed' },
      { status: 500 }
    )
  }
}
