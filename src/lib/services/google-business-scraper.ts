// Google Business Profile Scraper
// Extracts business info and owner names from Google
// Uses Places API when available, scraping as fallback

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export interface GoogleBusinessInfo {
  name: string
  placeId: string | null
  googleMapsUrl: string | null
  ownerName: string | null // From review responses
  phone: string | null
  website: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    zip: string | null
    formatted: string | null
  }
  rating: number | null
  reviewCount: number | null
  priceLevel: number | null // 0-4
  types: string[]
  businessStatus: string | null
  // Additional owner signals
  reviewResponderNames: string[] // Names of people responding to reviews
}

interface PlaceSearchResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
  business_status?: string
  rating?: number
  user_ratings_total?: number
  price_level?: number
  types?: string[]
}

interface PlaceDetailsResult {
  place_id: string
  name: string
  formatted_phone_number?: string
  international_phone_number?: string
  website?: string
  formatted_address?: string
  address_components?: Array<{
    long_name: string
    short_name: string
    types: string[]
  }>
  rating?: number
  user_ratings_total?: number
  price_level?: number
  business_status?: string
  types?: string[]
  reviews?: Array<{
    author_name: string
    rating: number
    text: string
    time: number
    owner_response?: {
      text: string
    }
  }>
}

/**
 * Search for a business using Google Places API
 */
export async function searchGoogleBusiness(
  businessName: string,
  city: string,
  state?: string
): Promise<PlaceSearchResult | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('[Google] Places API key not configured, skipping')
    return null
  }

  const query = `${businessName} ${city}${state ? ` ${state}` : ''}`
  console.log(`[Google] Searching for: ${query}`)

  try {
    const params = new URLSearchParams({
      query,
      key: GOOGLE_PLACES_API_KEY,
    })

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`
    )

    if (!response.ok) {
      console.error(`[Google] Search failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results?.length) {
      console.log(`[Google] No results found (status: ${data.status})`)
      return null
    }

    const result = data.results[0]
    console.log(`[Google] Found: ${result.name} (${result.place_id})`)
    return result
  } catch (error) {
    console.error('[Google] Search error:', error)
    return null
  }
}

/**
 * Get detailed business info including reviews
 */
export async function getGooglePlaceDetails(
  placeId: string
): Promise<PlaceDetailsResult | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    console.log('[Google] Places API key not configured')
    return null
  }

  console.log(`[Google] Getting details for place: ${placeId}`)

  try {
    const params = new URLSearchParams({
      place_id: placeId,
      key: GOOGLE_PLACES_API_KEY,
      fields: [
        'place_id',
        'name',
        'formatted_phone_number',
        'international_phone_number',
        'website',
        'formatted_address',
        'address_components',
        'rating',
        'user_ratings_total',
        'price_level',
        'business_status',
        'types',
        'reviews',
      ].join(','),
    })

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    )

    if (!response.ok) {
      console.error(`[Google] Details failed: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.result) {
      console.log(`[Google] No details found (status: ${data.status})`)
      return null
    }

    return data.result
  } catch (error) {
    console.error('[Google] Details error:', error)
    return null
  }
}

/**
 * Extract owner names from review responses
 * Business owners often respond to reviews with their name
 */
function extractOwnerFromReviews(reviews: PlaceDetailsResult['reviews']): {
  likelyOwner: string | null
  responderNames: string[]
} {
  if (!reviews?.length) {
    return { likelyOwner: null, responderNames: [] }
  }

  const responderNames: string[] = []

  for (const review of reviews) {
    if (review.owner_response?.text) {
      // Look for name patterns in response
      // Common patterns:
      // "Thank you! - John"
      // "Thanks, John Smith"
      // "Best, John"
      // "John, Owner"

      const text = review.owner_response.text

      // Pattern 1: Signed at end "- Name" or "— Name"
      const signedMatch = text.match(/[-—]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m)
      if (signedMatch) {
        responderNames.push(signedMatch[1])
        continue
      }

      // Pattern 2: "Best, Name" or "Thanks, Name"
      const closingMatch = text.match(/(?:Best|Thanks|Regards|Sincerely|Cheers),?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
      if (closingMatch) {
        responderNames.push(closingMatch[1])
        continue
      }

      // Pattern 3: "Name, Owner" or "Name, Manager"
      const titleMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(?:Owner|Manager|GM|General Manager|Proprietor)/i)
      if (titleMatch) {
        responderNames.push(titleMatch[1])
        continue
      }
    }
  }

  // Find the most common responder name (likely the owner)
  const nameCounts = responderNames.reduce((acc, name) => {
    const normalized = name.trim()
    acc[normalized] = (acc[normalized] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const likelyOwner = Object.entries(nameCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)[0] || null

  if (likelyOwner) {
    console.log(`[Google] Found likely owner from review responses: ${likelyOwner}`)
  }

  return {
    likelyOwner,
    responderNames: [...new Set(responderNames)],
  }
}

/**
 * Parse address components into structured format
 */
function parseAddressComponents(
  components: PlaceDetailsResult['address_components']
): GoogleBusinessInfo['address'] {
  const address: GoogleBusinessInfo['address'] = {
    street: null,
    city: null,
    state: null,
    zip: null,
    formatted: null,
  }

  if (!components) return address

  for (const component of components) {
    if (component.types.includes('street_number')) {
      address.street = component.long_name
    }
    if (component.types.includes('route')) {
      address.street = address.street
        ? `${address.street} ${component.long_name}`
        : component.long_name
    }
    if (component.types.includes('locality')) {
      address.city = component.long_name
    }
    if (component.types.includes('administrative_area_level_1')) {
      address.state = component.short_name
    }
    if (component.types.includes('postal_code')) {
      address.zip = component.long_name
    }
  }

  return address
}

/**
 * Full workflow: Find business and extract owner info
 */
export async function findGoogleBusinessOwner(
  businessName: string,
  city: string,
  state?: string
): Promise<GoogleBusinessInfo | null> {
  // Step 1: Search for the business
  const searchResult = await searchGoogleBusiness(businessName, city, state)

  if (!searchResult) {
    return null
  }

  // Step 2: Get detailed info
  const details = await getGooglePlaceDetails(searchResult.place_id)

  // Build the result
  const info: GoogleBusinessInfo = {
    name: searchResult.name,
    placeId: searchResult.place_id,
    googleMapsUrl: `https://www.google.com/maps/place/?q=place_id:${searchResult.place_id}`,
    ownerName: null,
    phone: details?.formatted_phone_number || null,
    website: details?.website || null,
    address: details
      ? parseAddressComponents(details.address_components)
      : {
          street: null,
          city: null,
          state: null,
          zip: null,
          formatted: searchResult.formatted_address,
        },
    rating: searchResult.rating || details?.rating || null,
    reviewCount: searchResult.user_ratings_total || details?.user_ratings_total || null,
    priceLevel: searchResult.price_level || details?.price_level || null,
    types: searchResult.types || details?.types || [],
    businessStatus: searchResult.business_status || details?.business_status || null,
    reviewResponderNames: [],
  }

  info.address.formatted = details?.formatted_address || searchResult.formatted_address

  // Step 3: Extract owner info from reviews
  if (details?.reviews) {
    const { likelyOwner, responderNames } = extractOwnerFromReviews(details.reviews)
    info.ownerName = likelyOwner
    info.reviewResponderNames = responderNames
  }

  return info
}

/**
 * Alternative: Build Google Maps search URL (for manual lookup)
 * Useful when API is not available
 */
export function buildGoogleMapsSearchUrl(
  businessName: string,
  city: string,
  state?: string
): string {
  const query = encodeURIComponent(`${businessName} ${city}${state ? ` ${state}` : ''}`)
  return `https://www.google.com/maps/search/${query}`
}
