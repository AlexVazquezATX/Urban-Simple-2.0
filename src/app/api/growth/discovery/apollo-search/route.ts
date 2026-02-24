import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { searchContacts } from '@/lib/services/apollo-service'

// GET /api/growth/discovery/apollo-search?location=Austin,Texas,United States&keywords=restaurant&page=1
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const location = params.get('location') || 'Austin, Texas, United States'
    const keywords = params.get('keywords') || undefined
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

    const result = await searchContacts({
      organization_locations: [location],
      person_titles: titles,
      q_keywords: keywords,
      page,
      per_page: perPage,
    })

    // Format for easy reading
    const formatted = result.contacts.map((c) => ({
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
      keywords: keywords || '(none)',
      pagination: result.pagination,
      total: result.pagination.total_entries,
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
