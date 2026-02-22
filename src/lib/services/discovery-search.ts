/**
 * Discovery Search Service
 *
 * Extracted from the /api/growth/discovery/search route so both the API
 * endpoint and the Growth Agent can call it without HTTP overhead.
 */

export interface DiscoverySearchParams {
  location: string
  type?: string
  sources?: string[]
  minRating?: number
  priceLevel?: string
}

export interface DiscoveryResult {
  source: 'google_places' | 'yelp'
  name: string
  address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
  phone?: string
  website?: string
  rating?: number
  reviewCount?: number
  types?: string[]
  categories?: string[]
  price?: string
  businessStatus?: string
  placeId?: string
  yelpId?: string
  rawData: any
}

export interface DiscoverySearchResult {
  results: DiscoveryResult[]
  total: number
  warnings: string[]
}

/**
 * Search Google Places and/or Yelp for businesses matching criteria.
 */
export async function searchBusinesses(
  params: DiscoverySearchParams
): Promise<DiscoverySearchResult> {
  const {
    location,
    type,
    sources = ['google_places', 'yelp'],
    minRating,
    priceLevel,
  } = params

  const results: DiscoveryResult[] = []
  const warnings: string[] = []

  // Google Places API search
  if (sources.includes('google_places')) {
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleApiKey) {
      warnings.push('Google Places API key not configured — skipped')
    } else {
      try {
        const searchQuery = `${type || 'restaurant'} ${location}`
        const placesResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${googleApiKey}&type=${type || 'restaurant'}`
        )

        if (placesResponse.ok) {
          const placesData = await placesResponse.json()

          if (placesData.results) {
            for (const place of placesData.results.slice(0, 20)) {
              if (minRating && place.rating < minRating) continue

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
      } catch (error) {
        console.error('Error searching Google Places:', error)
      }
    }
  }

  // Yelp API search
  if (sources.includes('yelp')) {
    const yelpApiKey = process.env.YELP_API_KEY
    if (!yelpApiKey) {
      warnings.push('Yelp API key not configured — skipped')
    } else {
      try {
        let yelpUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(type || 'restaurant')}&location=${encodeURIComponent(location)}&limit=20`

        if (priceLevel) {
          const priceLevels = priceLevel.length
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
      } catch (error) {
        console.error('Error searching Yelp:', error)
      }
    }
  }

  // Deduplicate results by name and address
  const uniqueResults = results.reduce((acc: DiscoveryResult[], result) => {
    const exists = acc.find(
      (r) =>
        r.name.toLowerCase() === result.name.toLowerCase() &&
        (r.address.street === result.address.street || r.address.city === result.address.city)
    )
    if (!exists) {
      acc.push(result)
    }
    return acc
  }, [])

  return {
    results: uniqueResults,
    total: uniqueResults.length,
    warnings,
  }
}
