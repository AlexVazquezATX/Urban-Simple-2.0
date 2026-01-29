// Unified Prospect Finder Service
// Combines Apollo, pattern generation, verification, and scraping

import { generateEmailPatterns, generateHospitalityEmails } from './email-pattern-generator'
import { verifyEmail, findBestEmail } from './email-verification'
import { searchByDomain, enrichPerson } from './apollo-service'
import { scrapeCompanyEmails } from './website-scraper'
import {
  ProspectSearchResult,
  SearchMethod,
  FindProspectsOptions,
  FindPersonOptions,
} from '@/lib/types/email-prospecting'

/**
 * Find prospects at a company domain
 */
export async function findProspectsAtCompany(
  options: FindProspectsOptions
): Promise<ProspectSearchResult[]> {
  const {
    domain,
    method = 'apollo',
    titles,
    seniorities,
    limit = 25,
    verifyEmails = false,
  } = options
  const prospects: ProspectSearchResult[] = []

  // Method 1: Apollo.io database search
  if (method === 'apollo' || method === 'all') {
    try {
      const apolloContacts = await searchByDomain(domain, {
        titles,
        seniorities,
        limit,
      })

      for (const contact of apolloContacts) {
        prospects.push({
          first_name: contact.first_name,
          last_name: contact.last_name,
          full_name: contact.name,
          email: contact.email,
          email_confidence: 85, // Apollo is generally reliable
          position: contact.title,
          linkedin: contact.linkedin_url,
          company_name: contact.organization?.name,
          domain: domain,
          source: 'apollo',
        })
      }
    } catch (error) {
      console.error('Apollo search failed:', error)
    }
  }

  // Method 2: Website scraping
  if (method === 'scraper' || method === 'all') {
    try {
      const scrapedEmails = await scrapeCompanyEmails(domain)

      for (const scraped of scrapedEmails) {
        // Check if we already have this email from Apollo
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
    } catch (error) {
      console.error('Scraper failed:', error)
    }
  }

  // Method 3: Hospitality patterns (for restaurants, hotels, venues)
  // Use when other methods return nothing, or explicitly requested
  if (method === 'hospitality' || (method === 'all' && prospects.length === 0)) {
    console.log('[Prospect Finder] Using hospitality email patterns for:', domain)
    const hospitalityEmails = generateHospitalityEmails(domain)

    // Add top hospitality emails - cap at 5 most valuable for sales outreach
    // More than 5 generic emails per prospect creates noise without value
    const HOSPITALITY_MAX = 5
    const topEmails = hospitalityEmails
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.min(limit, HOSPITALITY_MAX))

    for (const guess of topEmails) {
      if (!prospects.some((p) => p.email === guess.email)) {
        prospects.push({
          email: guess.email,
          email_confidence: guess.confidence,
          position: guess.pattern, // e.g., "General Manager", "Events", "Catering"
          domain: domain,
          source: 'hospitality_pattern',
          notes: `Role-based email pattern (${guess.pattern})`,
        })
      }
    }
  }

  // Optionally verify all emails
  if (verifyEmails) {
    for (const prospect of prospects) {
      if (prospect.email) {
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

/**
 * Find a specific person's email
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

  // Method 1: Try Apollo first (most accurate)
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
      console.error('Apollo enrichment failed:', error)
    }
  }

  // Method 2: Pattern generation + verification
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
