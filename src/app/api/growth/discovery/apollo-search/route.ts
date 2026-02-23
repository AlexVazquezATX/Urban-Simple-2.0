import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { searchContacts } from '@/lib/services/apollo-service'

// GET /api/growth/discovery/apollo-search?location=Austin,Texas&titles=Owner,General Manager&keywords=restaurant&page=1
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = request.nextUrl.searchParams
    const location = params.get('location') || 'Austin, Texas, United States'
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
    const keywords = params.get('keywords') || 'restaurant'
    const seniorities = params.get('seniorities')?.split(',') || [
      'owner',
      'founder',
      'c_suite',
      'vp',
      'director',
      'manager',
    ]
    const page = parseInt(params.get('page') || '1', 10)
    const perPage = Math.min(parseInt(params.get('per_page') || '25', 10), 100)

    const result = await searchContacts({
      organization_locations: [location],
      person_titles: titles,
      person_seniorities: seniorities,
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
      keywords,
      titles,
      pagination: result.pagination,
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
