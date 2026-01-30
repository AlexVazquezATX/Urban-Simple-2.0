// Owner Discovery Service
// The key insight: For local restaurants, you need to find the OWNER NAME first
// Then you can find their email. This service orchestrates that workflow.

import { findBusinessOwner as findYelpOwner, type YelpBusinessInfo } from './yelp-scraper'
import { findGoogleBusinessOwner, type GoogleBusinessInfo } from './google-business-scraper'
import { searchDomain as hunterSearchDomain, findEmail as hunterFindEmail, getEmailPattern, generateFromPattern } from './hunter-service'
import { searchContacts as apolloSearchContacts } from './apollo-service'
import { generateHospitalityEmails } from './email-pattern-generator'
import { scrapeOwnerNames, type ScrapedOwner } from './website-scraper'
import { verifyEmail } from './email-verification'
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
 * NEW PARALLEL WORKFLOW:
 * 1. Run Apollo + Yelp + Google + Website scrape IN PARALLEL
 * 2. Merge all discovered owner names
 * 3. For each name, use Hunter Email Finder
 * 4. If still no people, Hunter Domain Search with seniority filters
 * 5. If still no people, progressive hospitality pattern verification
 * 6. Always include hospitality pattern emails as suggestions
 */
export async function discoverOwners(
  options: DiscoverOwnersOptions
): Promise<OwnerDiscoveryResult> {
  const { businessName, city, state, website, includeHospitalityFallback = true } = options

  console.log(`[Owner Discovery] Starting PARALLEL discovery for "${businessName}" in ${city}, ${state || 'unknown state'}`)

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

  // First, try to determine the domain from the provided website
  if (website) {
    result.domain = extractDomain(website)
    result.businessInfo.website = website
  }

  // ============ STEP 1: PARALLEL DISCOVERY ============
  // Run Apollo, Yelp, Google, and Website scrape all at once
  console.log('[Owner Discovery] Starting parallel search: Apollo + Yelp + Google + Website...')

  type YelpResult = { status: 'fulfilled'; value: YelpBusinessInfo | null } | { status: 'rejected'; reason: unknown }
  type GoogleResult = { status: 'fulfilled'; value: GoogleBusinessInfo | null } | { status: 'rejected'; reason: unknown }
  type ApolloResult = { status: 'fulfilled'; value: { contacts: any[] } | null } | { status: 'rejected'; reason: unknown }
  type WebsiteResult = { status: 'fulfilled'; value: { owners: ScrapedOwner[]; emails: any[] } | null } | { status: 'rejected'; reason: unknown }

  // Build parallel promises
  const parallelPromises: [
    Promise<YelpBusinessInfo | null>,
    Promise<GoogleBusinessInfo | null>,
    Promise<{ contacts: any[] } | null>,
    Promise<{ owners: ScrapedOwner[]; emails: any[] } | null>
  ] = [
    // Yelp search
    findYelpOwner(businessName, city, state).catch((err) => {
      console.error('[Owner Discovery] Yelp failed:', err)
      return null
    }),
    // Google search
    findGoogleBusinessOwner(businessName, city, state).catch((err) => {
      console.error('[Owner Discovery] Google failed:', err)
      return null
    }),
    // Apollo search (needs domain - may return null if no domain yet)
    (async () => {
      // If we have a domain, search Apollo by title
      const domain = result.domain
      if (!domain) {
        console.log('[Owner Discovery] Apollo: Skipping - no domain yet')
        return null
      }
      try {
        return await apolloSearchContacts({
          organization_domains: [domain],
          person_titles: HOSPITALITY_TITLES,
          per_page: 10,
        })
      } catch (err) {
        console.error('[Owner Discovery] Apollo failed:', err)
        return null
      }
    })(),
    // Website scrape (needs domain)
    (async () => {
      const domain = result.domain
      if (!domain) {
        console.log('[Owner Discovery] Website scrape: Skipping - no domain yet')
        return null
      }
      try {
        return await scrapeOwnerNames(domain)
      } catch (err) {
        console.error('[Owner Discovery] Website scrape failed:', err)
        return null
      }
    })(),
  ]

  const [yelpResult, googleResult, apolloResult, websiteResult] = await Promise.all(parallelPromises)

  // ============ PROCESS YELP RESULTS ============
  if (yelpResult) {
    result.meta.yelpFound = true
    result.businessInfo.yelpUrl = yelpResult.yelpUrl

    // Update business info
    if (yelpResult.phone) result.businessInfo.phone = yelpResult.phone
    if (yelpResult.website) {
      result.businessInfo.website = yelpResult.website
      if (!result.domain) result.domain = extractDomain(yelpResult.website)
    }
    if (yelpResult.rating) result.businessInfo.rating = yelpResult.rating
    if (yelpResult.reviewCount) result.businessInfo.reviewCount = yelpResult.reviewCount
    if (yelpResult.priceRange) result.businessInfo.priceLevel = yelpResult.priceRange
    if (yelpResult.address) {
      result.businessInfo.address = { ...result.businessInfo.address, ...yelpResult.address }
    }

    // Add owner if found
    if (yelpResult.ownerName) {
      const { firstName, lastName } = splitName(yelpResult.ownerName)
      const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
      if (!foundOwners.has(key) && firstName && lastName) {
        result.meta.ownerNamesFound.push(yelpResult.ownerName)
        foundOwners.set(key, {
          name: yelpResult.ownerName,
          firstName,
          lastName,
          title: yelpResult.ownerTitle || 'Business Owner',
          email: null,
          emailConfidence: 0,
          emailSource: null,
          phone: yelpResult.phone,
          source: 'yelp',
        })
        console.log(`[Owner Discovery] Yelp: Found owner "${yelpResult.ownerName}"`)
      }
    }
  }

  // ============ PROCESS GOOGLE RESULTS ============
  if (googleResult) {
    result.meta.googleFound = true
    result.businessInfo.googleMapsUrl = googleResult.googleMapsUrl

    // Update business info (only if not already set)
    if (!result.businessInfo.phone && googleResult.phone) {
      result.businessInfo.phone = googleResult.phone
    }
    if (!result.businessInfo.website && googleResult.website) {
      result.businessInfo.website = googleResult.website
      if (!result.domain) result.domain = extractDomain(googleResult.website)
    }
    if (!result.businessInfo.rating && googleResult.rating) {
      result.businessInfo.rating = googleResult.rating
    }
    if (!result.businessInfo.reviewCount && googleResult.reviewCount) {
      result.businessInfo.reviewCount = googleResult.reviewCount
    }
    if (googleResult.priceLevel != null) {
      result.businessInfo.priceLevel = '$'.repeat(googleResult.priceLevel + 1)
    }

    // Add owner from review responses
    if (googleResult.ownerName) {
      const { firstName, lastName } = splitName(googleResult.ownerName)
      const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
      if (!foundOwners.has(key) && firstName && lastName) {
        result.meta.ownerNamesFound.push(googleResult.ownerName)
        foundOwners.set(key, {
          name: googleResult.ownerName,
          firstName,
          lastName,
          title: 'Business Owner',
          email: null,
          emailConfidence: 0,
          emailSource: null,
          phone: googleResult.phone,
          source: 'google',
        })
        console.log(`[Owner Discovery] Google: Found owner "${googleResult.ownerName}"`)
      }
    }

    // Add review responders
    for (const responderName of googleResult.reviewResponderNames || []) {
      if (responderName === googleResult.ownerName) continue
      const { firstName, lastName } = splitName(responderName)
      const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
      if (!foundOwners.has(key) && firstName && lastName) {
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
        console.log(`[Owner Discovery] Google: Found responder "${responderName}"`)
      }
    }
  }

  // ============ PROCESS APOLLO RESULTS ============
  if (apolloResult?.contacts?.length) {
    console.log(`[Owner Discovery] Apollo: Found ${apolloResult.contacts.length} contacts`)
    result.meta.apolloFound = true

    for (const contact of apolloResult.contacts) {
      if (contact.first_name && contact.last_name) {
        const key = `${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`
        if (!foundOwners.has(key)) {
          const name = contact.name || `${contact.first_name} ${contact.last_name}`
          result.meta.ownerNamesFound.push(name)

          // Apollo often has emails
          if (contact.email) {
            result.meta.emailsFound.push(contact.email)
          }

          foundOwners.set(key, {
            name,
            firstName: contact.first_name,
            lastName: contact.last_name,
            title: contact.title || 'Contact',
            email: contact.email || null,
            emailConfidence: contact.email ? 85 : 0,
            emailSource: contact.email ? 'apollo' : null,
            phone: null,
            source: 'apollo',
          })
          console.log(`[Owner Discovery] Apollo: Added "${name}"${contact.email ? ` <${contact.email}>` : ''}`)
        }
      }
    }
  }

  // ============ PROCESS WEBSITE SCRAPE RESULTS ============
  if (websiteResult?.owners?.length) {
    console.log(`[Owner Discovery] Website: Found ${websiteResult.owners.length} potential owners`)

    for (const scraped of websiteResult.owners) {
      const { firstName, lastName } = splitName(scraped.name)
      const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
      if (!foundOwners.has(key) && firstName && lastName) {
        result.meta.ownerNamesFound.push(scraped.name)
        foundOwners.set(key, {
          name: scraped.name,
          firstName,
          lastName,
          title: scraped.title || 'Owner',
          email: null,
          emailConfidence: 0,
          emailSource: null,
          phone: null,
          source: 'google', // Mark as "google" since it came from website
        })
        console.log(`[Owner Discovery] Website: Added "${scraped.name}" (${scraped.title})`)
      }
    }
  }

  // ============ STEP 2: SECOND PARALLEL ROUND (if we got domain from Yelp/Google) ============
  // If we didn't have a domain before but got one from Yelp/Google, run Apollo + Website now
  if (result.domain && !apolloResult && !websiteResult) {
    console.log('[Owner Discovery] Running second round: Apollo + Website with discovered domain...')

    const [secondApollo, secondWebsite] = await Promise.all([
      apolloSearchContacts({
        organization_domains: [result.domain],
        person_titles: HOSPITALITY_TITLES,
        per_page: 10,
      }).catch(() => null),
      scrapeOwnerNames(result.domain).catch(() => null),
    ])

    // Process second Apollo results
    if (secondApollo?.contacts?.length) {
      result.meta.apolloFound = true
      for (const contact of secondApollo.contacts) {
        if (contact.first_name && contact.last_name) {
          const key = `${contact.first_name.toLowerCase()}-${contact.last_name.toLowerCase()}`
          if (!foundOwners.has(key)) {
            const name = contact.name || `${contact.first_name} ${contact.last_name}`
            result.meta.ownerNamesFound.push(name)
            if (contact.email) result.meta.emailsFound.push(contact.email)
            foundOwners.set(key, {
              name,
              firstName: contact.first_name,
              lastName: contact.last_name,
              title: contact.title || 'Contact',
              email: contact.email || null,
              emailConfidence: contact.email ? 85 : 0,
              emailSource: contact.email ? 'apollo' : null,
              phone: null,
              source: 'apollo',
            })
          }
        }
      }
    }

    // Process second website results
    if (secondWebsite?.owners?.length) {
      for (const scraped of secondWebsite.owners) {
        const { firstName, lastName } = splitName(scraped.name)
        const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`
        if (!foundOwners.has(key) && firstName && lastName) {
          result.meta.ownerNamesFound.push(scraped.name)
          foundOwners.set(key, {
            name: scraped.name,
            firstName,
            lastName,
            title: scraped.title || 'Owner',
            email: null,
            emailConfidence: 0,
            emailSource: null,
            phone: null,
            source: 'google',
          })
        }
      }
    }
  }

  // ============ STEP 3: HUNTER EMAIL FINDER FOR DISCOVERED NAMES ============
  if (result.domain && foundOwners.size > 0) {
    console.log(`[Owner Discovery] Using Hunter to find emails for ${foundOwners.size} people at ${result.domain}...`)

    // Get email pattern first
    let emailPattern: string | null = null
    try {
      emailPattern = await getEmailPattern(result.domain)
      if (emailPattern) {
        console.log(`[Owner Discovery] Hunter found email pattern: ${emailPattern}`)
      }
    } catch {
      // Pattern not found, continue
    }

    // Find emails for owners who don't have one yet
    for (const [key, owner] of foundOwners) {
      if (owner.email) continue // Already have email (from Apollo)

      try {
        // Method 1: Hunter Email Finder
        const hunterResult = await hunterFindEmail(owner.firstName, owner.lastName, result.domain)
        if (hunterResult?.email) {
          owner.email = hunterResult.email
          owner.emailConfidence = hunterResult.score
          owner.emailSource = 'hunter_finder'
          result.meta.emailsFound.push(hunterResult.email)
          result.meta.hunterFound = true
          console.log(`[Owner Discovery] Hunter found email for ${owner.name}: ${hunterResult.email}`)
          continue
        }

        // Method 2: Generate from pattern
        if (emailPattern && owner.firstName && owner.lastName) {
          const generatedEmail = generateFromPattern(emailPattern, owner.firstName, owner.lastName, result.domain)
          if (generatedEmail) {
            owner.email = generatedEmail
            owner.emailConfidence = 60
            owner.emailSource = 'hunter_pattern'
            result.meta.emailsFound.push(generatedEmail)
            console.log(`[Owner Discovery] Generated email for ${owner.name}: ${generatedEmail}`)
          }
        }
      } catch {
        // Continue to next owner
      }
    }
  }

  // ============ STEP 4: HUNTER DOMAIN SEARCH WITH SENIORITY FILTERS ============
  if (foundOwners.size === 0 && result.domain) {
    console.log('[Owner Discovery] No owners found, trying Hunter domain search with seniority filters...')

    try {
      const domainResults = await hunterSearchDomain(result.domain, {
        limit: 10,
        type: 'personal',
        seniority: ['owner', 'executive', 'senior'],
        department: ['executive', 'management'],
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
              console.log(`[Owner Discovery] Hunter domain search: ${email.first_name} ${email.last_name} <${email.value}>`)
            }
          }
        }
      }
    } catch (error) {
      console.error('[Owner Discovery] Hunter domain search failed:', error)
    }
  }

  // ============ STEP 5: PROGRESSIVE PATTERN VERIFICATION (if still no emails) ============
  if (foundOwners.size === 0 && result.domain) {
    console.log('[Owner Discovery] No people found, trying progressive pattern verification...')

    const patternsToTry = ['owner', 'gm', 'chef', 'info', 'contact']

    for (const pattern of patternsToTry) {
      const testEmail = `${pattern}@${result.domain}`
      try {
        const verification = await verifyEmail(testEmail)

        if (verification?.is_valid && verification?.is_smtp_valid) {
          console.log(`[Owner Discovery] Verified email: ${testEmail}`)
          // Don't add to owners (no real person name), but add to hospitality emails
          result.hospitalityEmails.push({
            email: testEmail,
            role: pattern,
            confidence: 90, // High confidence since verified
          })
          break // Stop after finding one verified
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // ============ STEP 6: HOSPITALITY PATTERNS AS SUGGESTIONS ============
  if (includeHospitalityFallback && result.domain) {
    console.log('[Owner Discovery] Adding hospitality email patterns as suggestions...')

    // Only add patterns we haven't already verified
    const existingPatterns = new Set(result.hospitalityEmails.map((e) => e.email))

    const hospitalityEmails = generateHospitalityEmails(result.domain)
      .filter((e) => !existingPatterns.has(e.email))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)

    result.hospitalityEmails.push(
      ...hospitalityEmails.map((e) => ({
        email: e.email,
        role: e.pattern,
        confidence: e.confidence,
      }))
    )
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
