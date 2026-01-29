// Owner Discovery Service
// The key insight: For local restaurants, you need to find the OWNER NAME first
// Then you can find their email. This service orchestrates that workflow.

import { findBusinessOwner as findYelpOwner, type YelpBusinessInfo } from './yelp-scraper'
import { findGoogleBusinessOwner, type GoogleBusinessInfo } from './google-business-scraper'
import { searchDomain as hunterSearchDomain, findEmail as hunterFindEmail, getEmailPattern, generateFromPattern } from './hunter-service'
import { searchContacts as apolloSearchContacts } from './apollo-service'
import { generateHospitalityEmails } from './email-pattern-generator'
import { ProspectSearchResult } from '@/lib/types/email-prospecting'

// Hospitality-specific titles for Apollo search
const HOSPITALITY_TITLES = [
  'Owner',
  'Co-Owner',
  'Founder',
  'General Manager',
  'GM',
  'Executive Chef',
  'Chef',
  'F&B Director',
  'Food and Beverage Director',
  'Restaurant Manager',
  'Operations Manager',
  'Managing Partner',
  'Partner',
  'Director of Operations',
]

export interface OwnerDiscoveryResult {
  businessName: string
  domain: string | null
  owners: Array<{
    name: string
    firstName: string
    lastName: string
    title: string | null
    email: string | null
    emailConfidence: number
    emailSource: 'hunter_finder' | 'hunter_pattern' | 'hunter_domain' | 'apollo' | null
    phone: string | null
    source: 'yelp' | 'google' | 'hunter' | 'apollo'
  }>
  businessInfo: {
    phone: string | null
    website: string | null
    address: {
      street: string | null
      city: string | null
      state: string | null
      zip: string | null
    }
    rating: number | null
    reviewCount: number | null
    priceLevel: string | null
    yelpUrl: string | null
    googleMapsUrl: string | null
  }
  // Also include generic hospitality emails as fallback
  hospitalityEmails: Array<{
    email: string
    role: string
    confidence: number
  }>
  meta: {
    yelpFound: boolean
    googleFound: boolean
    hunterFound: boolean
    apolloFound: boolean
    ownerNamesFound: string[]
    emailsFound: string[]
  }
}

interface DiscoverOwnersOptions {
  businessName: string
  city: string
  state?: string
  website?: string // If we already have the website/domain
  includeHospitalityFallback?: boolean
}

/**
 * Main entry point: Discover business owners and their emails
 *
 * Workflow:
 * 1. Search Yelp for owner name
 * 2. Search Google for owner name (from review responses)
 * 3. For each owner found, use Hunter.io to find their email
 * 4. If no owners found, use Hunter domain search
 * 5. Always include hospitality pattern emails as fallback
 */
export async function discoverOwners(
  options: DiscoverOwnersOptions
): Promise<OwnerDiscoveryResult> {
  const { businessName, city, state, website, includeHospitalityFallback = true } = options

  console.log(`[Owner Discovery] Starting for "${businessName}" in ${city}, ${state || 'unknown state'}`)

  const result: OwnerDiscoveryResult = {
    businessName,
    domain: null,
    owners: [],
    businessInfo: {
      phone: null,
      website: website || null,
      address: { street: null, city, state: state || null, zip: null },
      rating: null,
      reviewCount: null,
      priceLevel: null,
      yelpUrl: null,
      googleMapsUrl: null,
    },
    hospitalityEmails: [],
    meta: {
      yelpFound: false,
      googleFound: false,
      hunterFound: false,
      apolloFound: false,
      ownerNamesFound: [],
      emailsFound: [],
    },
  }

  // Track found owners to avoid duplicates
  const foundOwners = new Map<string, typeof result.owners[0]>()

  // ============ Step 1: Search Yelp ============
  try {
    console.log('[Owner Discovery] Searching Yelp...')
    const yelpInfo = await findYelpOwner(businessName, city, state)

    if (yelpInfo) {
      result.meta.yelpFound = true
      result.businessInfo.yelpUrl = yelpInfo.yelpUrl

      // Merge business info
      if (yelpInfo.phone) result.businessInfo.phone = yelpInfo.phone
      if (yelpInfo.website) {
        result.businessInfo.website = yelpInfo.website
        result.domain = extractDomain(yelpInfo.website)
      }
      if (yelpInfo.rating) result.businessInfo.rating = yelpInfo.rating
      if (yelpInfo.reviewCount) result.businessInfo.reviewCount = yelpInfo.reviewCount
      if (yelpInfo.priceRange) result.businessInfo.priceLevel = yelpInfo.priceRange
      if (yelpInfo.address) {
        result.businessInfo.address = {
          ...result.businessInfo.address,
          ...yelpInfo.address,
        }
      }

      // Add owner if found
      if (yelpInfo.ownerName) {
        const { firstName, lastName } = splitName(yelpInfo.ownerName)
        const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`

        if (!foundOwners.has(key)) {
          result.meta.ownerNamesFound.push(yelpInfo.ownerName)
          foundOwners.set(key, {
            name: yelpInfo.ownerName,
            firstName,
            lastName,
            title: yelpInfo.ownerTitle || 'Business Owner',
            email: null,
            emailConfidence: 0,
            emailSource: null,
            phone: yelpInfo.phone,
            source: 'yelp',
          })
        }
      }
    }
  } catch (error) {
    console.error('[Owner Discovery] Yelp search failed:', error)
  }

  // ============ Step 2: Search Google ============
  try {
    console.log('[Owner Discovery] Searching Google...')
    const googleInfo = await findGoogleBusinessOwner(businessName, city, state)

    if (googleInfo) {
      result.meta.googleFound = true
      result.businessInfo.googleMapsUrl = googleInfo.googleMapsUrl

      // Merge business info (only if not already set from Yelp)
      if (!result.businessInfo.phone && googleInfo.phone) {
        result.businessInfo.phone = googleInfo.phone
      }
      if (!result.businessInfo.website && googleInfo.website) {
        result.businessInfo.website = googleInfo.website
        result.domain = extractDomain(googleInfo.website)
      }
      if (!result.businessInfo.rating && googleInfo.rating) {
        result.businessInfo.rating = googleInfo.rating
      }
      if (!result.businessInfo.reviewCount && googleInfo.reviewCount) {
        result.businessInfo.reviewCount = googleInfo.reviewCount
      }
      if (googleInfo.priceLevel != null) {
        result.businessInfo.priceLevel = '$'.repeat(googleInfo.priceLevel + 1)
      }

      // Add owner from review responses
      if (googleInfo.ownerName) {
        const { firstName, lastName } = splitName(googleInfo.ownerName)
        const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`

        if (!foundOwners.has(key)) {
          result.meta.ownerNamesFound.push(googleInfo.ownerName)
          foundOwners.set(key, {
            name: googleInfo.ownerName,
            firstName,
            lastName,
            title: 'Business Owner',
            email: null,
            emailConfidence: 0,
            emailSource: null,
            phone: googleInfo.phone,
            source: 'google',
          })
        }
      }

      // Add other review responders as potential contacts
      for (const responderName of googleInfo.reviewResponderNames) {
        if (responderName === googleInfo.ownerName) continue // Skip if already added

        const { firstName, lastName } = splitName(responderName)
        const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`

        if (!foundOwners.has(key)) {
          result.meta.ownerNamesFound.push(responderName)
          foundOwners.set(key, {
            name: responderName,
            firstName,
            lastName,
            title: 'Manager',
            email: null,
            emailConfidence: 0,
            emailSource: null,
            phone: null,
            source: 'google',
          })
        }
      }
    }
  } catch (error) {
    console.error('[Owner Discovery] Google search failed:', error)
  }

  // ============ Step 3: Use Hunter.io to find emails for owners ============
  // If we have a domain and owner names, try to find their emails
  if (!result.domain && website) {
    result.domain = extractDomain(website)
  }

  if (result.domain && foundOwners.size > 0) {
    console.log(`[Owner Discovery] Using Hunter to find emails at ${result.domain}...`)

    // Get the email pattern for this domain first
    let emailPattern: string | null = null
    try {
      emailPattern = await getEmailPattern(result.domain)
      if (emailPattern) {
        console.log(`[Owner Discovery] Hunter found email pattern: ${emailPattern}`)
      }
    } catch (error) {
      console.error('[Owner Discovery] Failed to get email pattern:', error)
    }

    // Try to find emails for each owner
    for (const [key, owner] of foundOwners) {
      try {
        // Method 1: Use Hunter Email Finder API
        const hunterResult = await hunterFindEmail(
          owner.firstName,
          owner.lastName,
          result.domain
        )

        if (hunterResult?.email) {
          owner.email = hunterResult.email
          owner.emailConfidence = hunterResult.score
          owner.emailSource = 'hunter_finder'
          result.meta.emailsFound.push(hunterResult.email)
          result.meta.hunterFound = true
          console.log(`[Owner Discovery] Found email for ${owner.name}: ${hunterResult.email}`)
          continue
        }

        // Method 2: Generate from pattern if Hunter couldn't find directly
        if (emailPattern && owner.firstName && owner.lastName) {
          const generatedEmail = generateFromPattern(
            emailPattern,
            owner.firstName,
            owner.lastName,
            result.domain
          )

          if (generatedEmail) {
            owner.email = generatedEmail
            owner.emailConfidence = 60 // Lower confidence for pattern-generated
            owner.emailSource = 'hunter_pattern'
            result.meta.emailsFound.push(generatedEmail)
            console.log(`[Owner Discovery] Generated email from pattern for ${owner.name}: ${generatedEmail}`)
          }
        }
      } catch (error) {
        console.error(`[Owner Discovery] Failed to find email for ${owner.name}:`, error)
      }
    }
  }

  // ============ Step 4: Hunter Domain Search (if no owners found) ============
  if (foundOwners.size === 0 && result.domain) {
    console.log('[Owner Discovery] No owners found, trying Hunter domain search...')

    try {
      const domainResults = await hunterSearchDomain(result.domain, {
        limit: 5,
        type: 'personal', // Prefer personal emails over generic
      })

      if (domainResults?.emails?.length) {
        result.meta.hunterFound = true

        for (const email of domainResults.emails) {
          if (email.first_name && email.last_name) {
            const key = `${email.first_name.toLowerCase()}-${email.last_name.toLowerCase()}`

            if (!foundOwners.has(key)) {
              foundOwners.set(key, {
                name: `${email.first_name} ${email.last_name}`,
                firstName: email.first_name,
                lastName: email.last_name,
                title: email.position || 'Contact',
                email: email.value,
                emailConfidence: email.confidence,
                emailSource: 'hunter_domain',
                phone: email.phone_number,
                source: 'hunter',
              })
              result.meta.ownerNamesFound.push(`${email.first_name} ${email.last_name}`)
              result.meta.emailsFound.push(email.value)
            }
          }
        }
      }
    } catch (error) {
      console.error('[Owner Discovery] Hunter domain search failed:', error)
    }
  }

  // ============ Step 5: Apollo.io People Search (if still no owners) ============
  // Apollo is better for B2B but worth trying with hospitality-specific titles
  if (foundOwners.size === 0 && result.domain) {
    console.log('[Owner Discovery] No owners found yet, trying Apollo.io People Search...')

    try {
      const apolloResult = await apolloSearchContacts({
        organization_domains: [result.domain],
        person_titles: HOSPITALITY_TITLES,
        per_page: 10,
      })

      if (apolloResult?.contacts?.length) {
        console.log(`[Owner Discovery] Apollo found ${apolloResult.contacts.length} contacts`)
        result.meta.apolloFound = true

        for (const contact of apolloResult.contacts) {
          // Only add if we have a real name and email
          if (contact.first_name && contact.last_name && contact.email) {
            const key = `${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`

            if (!foundOwners.has(key)) {
              foundOwners.set(key, {
                name: contact.name || `${contact.first_name} ${contact.last_name}`,
                firstName: contact.first_name,
                lastName: contact.last_name,
                title: contact.title || 'Contact',
                email: contact.email,
                emailConfidence: 85, // Apollo emails are generally reliable
                emailSource: 'apollo',
                phone: null, // Apollo doesn't include phone in basic contact info
                source: 'apollo',
              })
              result.meta.ownerNamesFound.push(contact.name || `${contact.first_name} ${contact.last_name}`)
              result.meta.emailsFound.push(contact.email)
              console.log(`[Owner Discovery] Apollo: Added ${contact.name} <${contact.email}>`)
            }
          }
        }
      } else {
        console.log('[Owner Discovery] Apollo found no contacts for this domain')
      }
    } catch (error) {
      console.error('[Owner Discovery] Apollo search failed:', error)
    }
  }

  // ============ Step 6: Hospitality email patterns (suggestions only) ============
  // NOTE: These are NOT real people - they are pattern guesses to try
  if (includeHospitalityFallback && result.domain) {
    console.log('[Owner Discovery] Adding hospitality email patterns as suggestions...')

    const hospitalityEmails = generateHospitalityEmails(result.domain)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)

    result.hospitalityEmails = hospitalityEmails.map(e => ({
      email: e.email,
      role: e.pattern,
      confidence: e.confidence,
    }))
  }

  // Convert Map to array
  result.owners = Array.from(foundOwners.values())

  console.log(`[Owner Discovery] Complete. Found ${result.owners.length} owners, ${result.meta.emailsFound.length} emails`)

  return result
}

/**
 * Convert discovery result to ProspectSearchResult array
 * For compatibility with existing prospect finder interface
 *
 * IMPORTANT: Only returns REAL people (from Yelp, Google, Hunter, Apollo)
 * Hospitality patterns are NOT included here - they are available separately
 * in discovery.hospitalityEmails as suggestions to try
 */
export function toProspectSearchResults(
  discovery: OwnerDiscoveryResult
): ProspectSearchResult[] {
  const results: ProspectSearchResult[] = []

  // Add owners with emails first (highest value)
  for (const owner of discovery.owners) {
    if (owner.email) {
      results.push({
        first_name: owner.firstName,
        last_name: owner.lastName,
        full_name: owner.name,
        email: owner.email,
        email_confidence: owner.emailConfidence,
        email_verified: false, // Not verified yet
        position: owner.title || undefined,
        domain: discovery.domain || undefined,
        source: owner.source === 'apollo' ? 'apollo'
          : owner.source === 'hunter' ? 'hunter'
          : 'manual',
        notes: `Found via ${owner.source}${owner.emailSource ? `, email from ${owner.emailSource}` : ''}`,
      })
    }
  }

  // Add owners without emails (still valuable - we have the name)
  for (const owner of discovery.owners) {
    if (!owner.email) {
      results.push({
        first_name: owner.firstName,
        last_name: owner.lastName,
        full_name: owner.name,
        position: owner.title || undefined,
        domain: discovery.domain || undefined,
        source: 'manual',
        notes: `Owner found via ${owner.source}, email not found - try hospitality patterns`,
      })
    }
  }

  // NOTE: We do NOT add hospitality patterns as contacts
  // They are fake/guessed emails, not real people
  // Access them via discovery.hospitalityEmails if needed

  return results
}

// ============ Helper functions ============

function extractDomain(url: string): string {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  }
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/)

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  // Handle "John D." or "John D. Smith"
  if (parts.length === 2 && parts[1].length <= 2) {
    return { firstName: parts[0], lastName: parts[1] }
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}
