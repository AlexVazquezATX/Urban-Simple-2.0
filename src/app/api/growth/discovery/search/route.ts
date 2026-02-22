import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'
import { searchBusinesses } from '@/lib/services/discovery-search'

// POST /api/growth/discovery/search - Search for prospects using external APIs
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      location: rawLocation,
      city,
      state,
      type,
      priceLevel,
      minRating,
      sources = ['google_places', 'yelp'],
    } = body

    // Build location string from city/state if location not provided directly
    const location = rawLocation || (city && state ? `${city}, ${state}` : city || state || '')

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required. Provide "location" (e.g. "Austin, TX") or "city" and "state" separately.' },
        { status: 400 }
      )
    }

    const result = await searchBusinesses({
      location,
      type,
      sources,
      minRating,
      priceLevel,
    })

    return NextResponse.json({
      results: result.results,
      total: result.total,
      ...(result.warnings.length > 0 && { warnings: result.warnings }),
    })
  } catch (error: any) {
    console.error('Error in discovery search:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search for prospects' },
      { status: 500 }
    )
  }
}
