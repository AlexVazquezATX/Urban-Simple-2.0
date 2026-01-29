// Unified Prospect Finder Service
// Combines Apollo, Hunter, pattern generation, verification, scraping, and owner discovery
//
// For HOSPITALITY (restaurants, hotels, venues):
//   Use 'discover' method - finds owner names from Yelp/Google, then finds their emails
//
// For B2B/ENTERPRISE:
//   Use 'apollo' or 'hunter' methods

import { generateEmailPatterns, generateHospitalityEmails } from './email-pattern-generator'
import { verifyEmail, findBestEmail } from './email-verification'
import { searchByDomain as apolloSearchByDomain, enrichPerson } from './apollo-service'
import { scrapeCompanyEmails } from './website-scraper'
import {
  searchDomain as hunterSearchDomain,
  findEmail as hunterFindEmail,
  verifyEmail as hunterVerifyEmail,
} from './hunter-service'
import { discoverOwners, toProspectSearchResults } from './owner-discovery'
import {
  ProspectSearchResult,
  SearchMethod,
  FindProspectsOptions,
  FindPersonOptions,
} from '@/lib/types/email-prospecting'

/**
 * Find prospects at a company domain
 *
 * Method recommendations:
 * - 'discover': Best for restaurants/hospitality - finds owner names first
 * - 'hunter': Best for local businesses - finds all emails at domain
 * - 'apollo': Best for B2B/enterprise - LinkedIn-based database
 * - 'all': Smart fallback chain
 */
export async function findProspectsAtCompany(
  options: FindProspectsOptions
): Promise<ProspectSearchResult[]> {
  const {
    domain,
    method = 'all',
    titles,
    seniorities,
    limit = 25,
    verifyEmails = false,
    businessName,
    city,
    state,
  } = options
  const prospects: ProspectSearchResult[] = []

  // ============ Method: Owner Discovery (BEST FOR HOSPITALITY) ============
  // Uses Yelp + Google to find owner names, then Hunter to find emails
  if (method === 'discover') {
    if (!businessName || !city) {
      console.error('[Prospect Finder] discover method requires businessName and city')
      // Fall back to hospitality patterns
    } else {
      console.log(`[Prospect Finder] Using owner discovery for: ${businessName}`)
      try {
        const discoveryResult = await discoverOwners({
          businessName,
          city,
          state,
          website: domain,
          includeHospitalityFallback: true,
        })

        const discoveredProspects = toProspectSearchResults(discoveryResult)
        prospects.push(...discoveredProspects.slice(0, limit))

        if (prospects.length > 0) {
          console.log(`[Prospect Finder] Owner discovery found ${prospects.length} contacts`)
          return verifyEmails ? await verifyProspects(prospects) : prospects
        }
      } catch (error) {
        console.error('[Prospect Finder] Owner discovery failed:', error)
      }
    }
  }

  // ============ Method: Hunter.io (BETTER FOR LOCAL BUSINESSES) ============
  if (method === 'hunter' || method === 'all') {
    try {
      console.log(`[Prospect Finder] Using Hunter.io for: ${domain}`)
      const hunterResult = await hunterSearchDomain(domain, {
        limit,
        type: 'personal', // Prioritize personal emails over generic
      })

      if (hunterResult?.emails?.length) {
        for (const email of hunterResult.emails) {
          if (!prospects.some((p) => p.email === email.value)) {
            prospects.push({
              first_name: email.first_name || undefined,
              last_name: email.last_name || undefined,
              full_name: email.first_name && email.last_name
                ? `${email.first_name} ${email.last_name}`
                : undefined,
              email: email.value,
              email_confidence: email.confidence,
              position: email.position || undefined,
              linkedin: email.linkedin || undefined,
              domain: domain,
              source: 'hunter',
              notes: email.type === 'generic' ? 'Generic email' : 'Personal email',
            })
          }
        }
        console.log(`[Prospect Finder] Hunter found ${hunterResult.emails.length} emails`)
      }
    } catch (error) {
      console.error('[Prospect Finder] Hunter search failed:', error)
    }

    // If Hunter found results with method='hunter', return them
    if (method === 'hunter' && prospects.length > 0) {
      return verifyEmails ? await verifyProspects(prospects) : prospects
    }
  }

  // ============ Method: Apollo.io (B2B DATABASE) ============
  if (method === 'apollo' || method === 'all') {
    try {
      console.log(`[Prospect Finder] Using Apollo.io for: ${domain}`)
      const apolloContacts = await apolloSearchByDomain(domain, {
        titles,
        seniorities,
        limit,
      })

      for (const contact of apolloContacts) {
        if (!prospects.some((p) => p.email === contact.email)) {
          prospects.push({
            first_name: contact.first_name,
            last_name: contact.last_name,
            full_name: contact.name,
            email: contact.email,
            email_confidence: 85,
            position: contact.title,
            linkedin: contact.linkedin_url,
            company_name: contact.organization?.name,
            domain: domain,
            source: 'apollo',
          })
        }
      }

      if (apolloContacts.length > 0) {
        console.log(`[Prospect Finder] Apollo found ${apolloContacts.length} contacts`)
      }
    } catch (error) {
      console.error('[Prospect Finder] Apollo search failed:', error)
    }
  }

  // ============ Method: Website Scraping ============
  if (method === 'scraper' || method === 'all') {
    try {
      console.log(`[Prospect Finder] Scraping website: ${domain}`)
      const scrapedEmails = await scrapeCompanyEmails(domain)

      for (const scraped of scrapedEmails) {
        if (!prospects.some((p) => p.email === scraped.email)) {
          prospects.push({
            email: scraped.email,
            email_confidence: scraped.isGeneric ? 40 : 60,
            domain: domain,
            source: 'scraper',
            notes: `Found on: ${scraped.foundOn}`,
          })
        }
      }

      if (scrapedEmails.length > 0) {
        console.log(`[Prospect Finder] Scraper found ${scrapedEmails.length} emails`)
      }
    } catch (error) {
      console.error('[Prospect Finder] Scraper failed:', error)
    }
  }

  // ============ Method: Hospitality Patterns (FALLBACK) ============
  // Use when other methods return nothing, or explicitly requested
  if (method === 'hospitality' || (method === 'all' && prospects.length === 0)) {
    console.log('[Prospect Finder] Using hospitality email patterns for:', domain)
    const hospitalityEmails = generateHospitalityEmails(domain)

    // Add top hospitality emails - cap at 5 most valuable for sales outreach
    const HOSPITALITY_MAX = 5
    const topEmails = hospitalityEmails
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(limit, HOSPITALITY_MAX))

    for (const guess of topEmails) {
      if (!prospects.some((p) => p.email === guess.email)) {
        prospects.push({
          email: guess.email,
          email_confidence: guess.confidence,
          position: guess.pattern,
          domain: domain,
          source: 'hospitality_pattern',
          notes: `Role-based email pattern (${guess.pattern})`,
        })
      }
    }
  }

  // Optionally verify all emails
  if (verifyEmails && prospects.length > 0) {
    return await verifyProspects(prospects)
  }

  return prospects
}

/**
 * Find a specific person's email
 *
 * Uses Hunter.io first (better for local businesses), then Apollo, then patterns
 */
export async function findPersonEmail(
  options: FindPersonOptions
): Promise<ProspectSearchResult | null> {
  const {
    firstName,
    lastName,
    domain,
    method = 'all',
    verifyEmail: shouldVerify = true,
  } = options

  // Method 1: Try Hunter.io first (better for local businesses)
  if (method === 'hunter' || method === 'all') {
    try {
      console.log(`[Prospect Finder] Using Hunter to find ${firstName} ${lastName} at ${domain}`)
      const hunterResult = await hunterFindEmail(firstName, lastName, domain)

      if (hunterResult?.email) {
        const prospect: ProspectSearchResult = {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          email: hunterResult.email,
          email_confidence: hunterResult.score,
          position: hunterResult.position || undefined,
          linkedin: hunterResult.linkedin_url || undefined,
          domain: domain,
          source: 'hunter',
        }

        if (shouldVerify) {
          try {
            const verification = await hunterVerifyEmail(hunterResult.email)
            if (verification) {
              prospect.email_verified = verification.result === 'deliverable'
              prospect.email_verification_status = verification.result === 'deliverable'
                ? 'valid'
                : verification.result === 'risky'
                  ? 'risky'
                  : 'invalid'
              prospect.email_confidence = verification.score
            }
          } catch {
            // Continue without verification
          }
        }

        return prospect
      }
    } catch (error) {
      console.error('[Prospect Finder] Hunter email finder failed:', error)
    }
  }

  // Method 2: Try Apollo (good for B2B)
  if (method === 'apollo' || method === 'all') {
    try {
      const apolloPerson = await enrichPerson(firstName, lastName, domain)
      if (apolloPerson?.email) {
        const prospect: ProspectSearchResult = {
          first_name: apolloPerson.first_name,
          last_name: apolloPerson.last_name,
          full_name: apolloPerson.name,
          email: apolloPerson.email,
          email_confidence: 90,
          position: apolloPerson.title,
          linkedin: apolloPerson.linkedin_url,
          domain: domain,
          source: 'apollo',
        }

        if (shouldVerify) {
          try {
            const verification = await verifyEmail(apolloPerson.email)
            prospect.email_verified = verification.is_valid
            prospect.email_verification_status = verification.is_valid
              ? 'valid'
              : 'invalid'
          } catch {
            // Continue without verification
          }
        }

        return prospect
      }
    } catch (error) {
      console.error('[Prospect Finder] Apollo enrichment failed:', error)
    }
  }

  // Method 3: Pattern generation + verification
  if (method === 'pattern' || method === 'all') {
    const guesses = generateEmailPatterns(firstName, lastName, domain)

    if (shouldVerify) {
      const best = await findBestEmail(guesses)
      if (best) {
        return {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          email: best.email,
          email_confidence: Math.round(best.confidence),
          email_verified: true,
          email_verification_status: 'valid',
          domain: domain,
          source: 'pattern',
        }
      }
    } else {
      // Return best guess without verification
      return {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        email: guesses[0]?.email,
        email_confidence: guesses[0]?.confidence || 0,
        domain: domain,
        source: 'pattern',
      }
    }
  }

  return null
}

/**
 * Helper: Verify a list of prospects
 */
async function verifyProspects(
  prospects: ProspectSearchResult[]
): Promise<ProspectSearchResult[]> {
  for (const prospect of prospects) {
    if (prospect.email) {
      try {
        // Try Hunter verification first (included with Hunter API)
        const hunterVerification = await hunterVerifyEmail(prospect.email)
        if (hunterVerification) {
          prospect.email_verified = hunterVerification.result === 'deliverable'
          prospect.email_verification_status = hunterVerification.result === 'deliverable'
            ? 'valid'
            : hunterVerification.result === 'risky'
              ? 'risky'
              : 'invalid'
          prospect.email_confidence = hunterVerification.score
          continue
        }
      } catch {
        // Fall back to Abstract API
        try {
          const verification = await verifyEmail(prospect.email)
          prospect.email_verified = verification.is_valid
          prospect.email_verification_status = verification.is_valid
            ? 'valid'
            : verification.is_catch_all
              ? 'risky'
              : 'invalid'
          prospect.email_confidence = Math.round(verification.quality_score)
        } catch {
          // Continue without verification
        }
      }
    }
  }

  return prospects
}
