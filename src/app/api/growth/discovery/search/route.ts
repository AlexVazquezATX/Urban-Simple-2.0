import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/api-key-auth'

// POST /api/growth/discovery/search - Search for prospects using external APIs
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      query,
      location: rawLocation,
      city,
      state,
      type, // restaurant, bar, hotel, etc.
      priceLevel, // $, $$, $$$, $$$$
      minRating,
      sources = ['google_places', 'yelp'], // default to both
    } = body

    // Build location string from city/state if location not provided directly
    const location = rawLocation || (city && state ? `${city}, ${state}` : city || state || '')

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required. Provide "location" (e.g. "Austin, TX") or "city" and "state" separately.' },
        { status: 400 }
      )
    }

    const results: any[] = []

    // Google Places API search
    if (sources.includes('google_places')) {
      try {
        const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
        if (!googleApiKey) {
          console.warn('Google Places API key not configured')
        } else {
          // Build search query
          const searchQuery = `${type || 'restaurant'} ${location}`
          
          // Use Places API Text Search
          const placesResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleApiKey}&type=${type || 'restaurant'}`
          )

          if (placesResponse.ok) {
            const placesData = await placesResponse.json()
            
            if (placesData.results) {
              for (const place of placesData.results.slice(0, 20)) {
                // Filter by rating if specified
                if (minRating && place.rating < minRating) continue

                // Get place details for more info
                let details: any = {}
                if (place.place_id) {
                  try {
                    const detailsResponse = await fetch(
                      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,types,business_status&key=${googleApiKey}`
                    )
                    if (detailsResponse.ok) {
                      const detailsData = await detailsResponse.json()
                      details = detailsData.result || {}
                    }
                  } catch (error) {
                    console.error('Error fetching place details:', error)
                  }
                }

                results.push({
                  source: 'google_places',
                  name: place.name || details.name,
                  address: {
                    street: place.formatted_address || details.formatted_address,
                    city: location.split(',')[0]?.trim(),
                    state: location.split(',')[1]?.trim(),
                  },
                  phone: place.formatted_phone_number || details.formatted_phone_number,
                  website: place.website || details.website,
                  rating: place.rating || details.rating,
                  reviewCount: place.user_ratings_total || details.user_ratings_total,
                  types: place.types || details.types || [],
                  businessStatus: details.business_status,
                  placeId: place.place_id,
                  rawData: place,
                })
              }
            }
          }
        }
      } catch (error) {
        console.error('Error searching Google Places:', error)
      }
    }

    // Yelp API search
    if (sources.includes('yelp')) {
      try {
        const yelpApiKey = process.env.YELP_API_KEY
        if (!yelpApiKey) {
          console.warn('Yelp API key not configured')
        } else {
          // Build Yelp API URL with price filter
          let yelpUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(type || 'restaurant')}&location=${encodeURIComponent(location)}&limit=20`

          // Yelp price filter: 1=$, 2=$$, 3=$$$, 4=$$$$
          if (priceLevel) {
            const priceLevels = priceLevel.length // $ = 1, $$ = 2, etc.
            yelpUrl += `&price=${priceLevels}`
          }

          const yelpResponse = await fetch(yelpUrl, {
            headers: {
              Authorization: `Bearer ${yelpApiKey}`,
            },
          })

          if (yelpResponse.ok) {
            const yelpData = await yelpResponse.json()

            if (yelpData.businesses) {
              for (const business of yelpData.businesses) {
                // Filter by rating if specified
                if (minRating && business.rating < minRating) continue

                results.push({
                  source: 'yelp',
                  name: business.name,
                  address: {
                    street: business.location.address1,
                    city: business.location.city,
                    state: business.location.state,
                    zip: business.location.zip_code,
                  },
                  phone: business.phone,
                  website: business.url,
                  rating: business.rating,
                  reviewCount: business.review_count,
                  price: business.price,
                  categories: business.categories?.map((c: any) => c.title) || [],
                  yelpId: business.id,
                  rawData: business,
                })
              }
            }
          }
        }
      } catch (error) {
        console.error('Error searching Yelp:', error)
      }
    }

    // Deduplicate results by name and address
    const uniqueResults = results.reduce((acc: any[], result: any) => {
      const key = `${result.name}-${result.address.street || result.address.city}`
      const exists = acc.find(r => 
        r.name.toLowerCase() === result.name.toLowerCase() &&
        (r.address.street === result.address.street || r.address.city === result.address.city)
      )
      if (!exists) {
        acc.push(result)
      }
      return acc
    }, [])

    // Report which sources were actually available
    const warnings: string[] = []
    if (sources.includes('google_places') && !process.env.GOOGLE_PLACES_API_KEY) {
      warnings.push('Google Places API key not configured — skipped')
    }
    if (sources.includes('yelp') && !process.env.YELP_API_KEY) {
      warnings.push('Yelp API key not configured — skipped')
    }

    return NextResponse.json({
      results: uniqueResults,
      total: uniqueResults.length,
      ...(warnings.length > 0 && { warnings }),
    })
  } catch (error: any) {
    console.error('Error in discovery search:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to search for prospects' },
      { status: 500 }
    )
  }
}

