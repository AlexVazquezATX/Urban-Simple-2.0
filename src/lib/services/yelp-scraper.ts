// Yelp Business Scraper
// Extracts owner names and business info from Yelp pages
// This is the KEY to finding decision makers at local restaurants

export interface YelpBusinessInfo {
  name: string
  yelpUrl: string
  ownerName: string | null
  ownerTitle: string | null
  phone: string | null
  website: string | null
  address: {
    street: string | null
    city: string | null
    state: string | null
    zip: string | null
  }
  categories: string[]
  rating: number | null
  reviewCount: number | null
  priceRange: string | null
  claimedBy: string | null // Person who claimed the business
}

/**
 * Search Yelp for a business and get the URL
 * Uses Yelp's search page (no API needed)
 */
export async function findYelpBusinessUrl(
  businessName: string,
  city: string,
  state?: string
): Promise<string | null> {
  const location = state ? `${city}, ${state}` : city
  const query = encodeURIComponent(businessName)
  const locationParam = encodeURIComponent(location)

  const searchUrl = `https://www.yelp.com/search?find_desc=${query}&find_loc=${locationParam}`

  console.log(`[Yelp] Searching for "${businessName}" in ${location}`)

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      console.error(`[Yelp] Search failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Find the first business result link
    // Yelp URLs look like: /biz/restaurant-name-city
    const bizUrlMatch = html.match(/href="(\/biz\/[^"?]+)"/i)

    if (bizUrlMatch) {
      const bizUrl = `https://www.yelp.com${bizUrlMatch[1]}`
      console.log(`[Yelp] Found business: ${bizUrl}`)
      return bizUrl
    }

    console.log('[Yelp] No business found in search results')
    return null
  } catch (error) {
    console.error('[Yelp] Search error:', error)
    return null
  }
}

/**
 * Scrape business details from a Yelp business page
 * Extracts owner name from "About the Business" section
 */
export async function scrapeYelpBusiness(yelpUrl: string): Promise<YelpBusinessInfo | null> {
  console.log(`[Yelp] Scraping business page: ${yelpUrl}`)

  try {
    const response = await fetch(yelpUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    })

    if (!response.ok) {
      console.error(`[Yelp] Page fetch failed: ${response.status}`)
      return null
    }

    const html = await response.text()

    // Extract business info
    const info: YelpBusinessInfo = {
      name: extractBusinessName(html),
      yelpUrl,
      ownerName: null,
      ownerTitle: null,
      phone: extractPhone(html),
      website: extractWebsite(html),
      address: extractAddress(html),
      categories: extractCategories(html),
      rating: extractRating(html),
      reviewCount: extractReviewCount(html),
      priceRange: extractPriceRange(html),
      claimedBy: null,
    }

    // Extract owner info - this is the gold
    const ownerInfo = extractOwnerInfo(html)
    if (ownerInfo) {
      info.ownerName = ownerInfo.name
      info.ownerTitle = ownerInfo.title
      console.log(`[Yelp] Found owner: ${ownerInfo.name} (${ownerInfo.title || 'Owner'})`)
    }

    // Check who claimed the business
    const claimedBy = extractClaimedBy(html)
    if (claimedBy) {
      info.claimedBy = claimedBy
      // If no owner found but business is claimed, use claimer as potential owner
      if (!info.ownerName && claimedBy) {
        info.ownerName = claimedBy
        info.ownerTitle = 'Business Owner'
        console.log(`[Yelp] Using claimer as owner: ${claimedBy}`)
      }
    }

    return info
  } catch (error) {
    console.error('[Yelp] Scrape error:', error)
    return null
  }
}

/**
 * Full workflow: Find business on Yelp and extract owner info
 */
export async function findBusinessOwner(
  businessName: string,
  city: string,
  state?: string
): Promise<YelpBusinessInfo | null> {
  // Step 1: Find the Yelp URL
  const yelpUrl = await findYelpBusinessUrl(businessName, city, state)

  if (!yelpUrl) {
    return null
  }

  // Step 2: Scrape the business page
  return scrapeYelpBusiness(yelpUrl)
}

// ============ Helper extraction functions ============

function extractBusinessName(html: string): string {
  // Try JSON-LD first
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.name) return jsonLd.name
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Fallback to h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  return h1Match ? h1Match[1].trim() : 'Unknown'
}

function extractOwnerInfo(html: string): { name: string; title: string | null } | null {
  // Look for "About the Business" section
  // Pattern 1: "Meet the Business Owner" section
  const meetOwnerMatch = html.match(/Meet the (?:Business )?Owner[\s\S]*?<p[^>]*>([^<]+)<\/p>/i)
  if (meetOwnerMatch) {
    const name = meetOwnerMatch[1].trim()
    if (name && name.length > 1 && name.length < 50) {
      return { name, title: 'Business Owner' }
    }
  }

  // Pattern 2: "Business Owner" with name nearby
  const ownerPattern = /(?:Business Owner|Owner|Proprietor|Manager)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  const ownerMatch = html.match(ownerPattern)
  if (ownerMatch) {
    const name = ownerMatch[1].trim()
    if (name && name.length > 1 && name.length < 50) {
      return { name, title: 'Business Owner' }
    }
  }

  // Pattern 3: JSON-LD employee/founder data
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const jsonLd = JSON.parse(match[1])
      if (jsonLd.founder?.name) {
        return { name: jsonLd.founder.name, title: 'Founder' }
      }
      if (jsonLd.employee?.[0]?.name) {
        return { name: jsonLd.employee[0].name, title: jsonLd.employee[0].jobTitle || 'Owner' }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Pattern 4: Look for "From the business" section with quoted name
  const fromBusinessMatch = html.match(/From the [Bb]usiness[\s\S]*?"([A-Z][a-z]+(?:\s+[A-Z]\.?)?(?:\s+[A-Z][a-z]+)?)"/i)
  if (fromBusinessMatch) {
    const name = fromBusinessMatch[1].trim()
    if (name && name.length > 2 && name.length < 40) {
      return { name, title: 'Business Owner' }
    }
  }

  return null
}

function extractClaimedBy(html: string): string | null {
  // Look for "Claimed by [Name]" patterns
  const claimedMatch = html.match(/[Cc]laimed by[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  if (claimedMatch) {
    return claimedMatch[1].trim()
  }
  return null
}

function extractPhone(html: string): string | null {
  // Look for phone in JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.telephone) return jsonLd.telephone
    } catch {
      // Ignore
    }
  }

  // Fallback: look for phone pattern
  const phoneMatch = html.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
  return phoneMatch ? phoneMatch[0] : null
}

function extractWebsite(html: string): string | null {
  // Look for "biz-website" link
  const websiteMatch = html.match(/href="([^"]*)"[^>]*>(?:[^<]*)?(?:website|Visit Site)/i)
  if (websiteMatch) {
    // Yelp often redirects through their domain
    const url = websiteMatch[1]
    if (url.includes('biz_redir')) {
      const actualUrlMatch = url.match(/url=([^&]+)/)
      if (actualUrlMatch) {
        return decodeURIComponent(actualUrlMatch[1])
      }
    }
    if (url.startsWith('http')) {
      return url
    }
  }

  // JSON-LD fallback
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.url && !jsonLd.url.includes('yelp.com')) return jsonLd.url
    } catch {
      // Ignore
    }
  }

  return null
}

function extractAddress(html: string): YelpBusinessInfo['address'] {
  const address: YelpBusinessInfo['address'] = {
    street: null,
    city: null,
    state: null,
    zip: null,
  }

  // Try JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.address) {
        address.street = jsonLd.address.streetAddress || null
        address.city = jsonLd.address.addressLocality || null
        address.state = jsonLd.address.addressRegion || null
        address.zip = jsonLd.address.postalCode || null
      }
    } catch {
      // Ignore
    }
  }

  return address
}

function extractCategories(html: string): string[] {
  const categories: string[] = []

  // Try JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.servesCuisine) {
        if (Array.isArray(jsonLd.servesCuisine)) {
          categories.push(...jsonLd.servesCuisine)
        } else {
          categories.push(jsonLd.servesCuisine)
        }
      }
    } catch {
      // Ignore
    }
  }

  return categories
}

function extractRating(html: string): number | null {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.aggregateRating?.ratingValue) {
        return parseFloat(jsonLd.aggregateRating.ratingValue)
      }
    } catch {
      // Ignore
    }
  }

  return null
}

function extractReviewCount(html: string): number | null {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.aggregateRating?.reviewCount) {
        return parseInt(jsonLd.aggregateRating.reviewCount)
      }
    } catch {
      // Ignore
    }
  }

  return null
}

function extractPriceRange(html: string): string | null {
  // Try JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1])
      if (jsonLd.priceRange) return jsonLd.priceRange
    } catch {
      // Ignore
    }
  }

  // Fallback: look for $ symbols
  const priceMatch = html.match(/(\${1,4})(?:\s|<)/)
  return priceMatch ? priceMatch[1] : null
}
