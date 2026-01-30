// Website Email Scraper Service
// Scrapes emails AND owner names from company websites

import { ScrapedEmail } from '@/lib/types/email-prospecting'

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

// Hospitality/restaurant title keywords for owner name extraction
const OWNER_TITLE_KEYWORDS = [
  'owner',
  'co-owner',
  'founder',
  'co-founder',
  'proprietor',
  'chef',
  'executive chef',
  'head chef',
  'chef/owner',
  'chef-owner',
  'general manager',
  'gm',
  'managing partner',
  'partner',
  'director',
  'president',
  'ceo',
]

// Regex patterns to extract owner names from text
// These look for patterns like "Owner: John Smith" or "Founded by Jane Doe"
const OWNER_PATTERNS = [
  // "Owner John Smith" or "Owner: John Smith"
  /\b(?:owner|co-owner|proprietor|founder|co-founder)[:;,]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  // "Chef John Smith" or "Executive Chef: John Smith"
  /\b(?:executive\s+chef|head\s+chef|chef[/\-]owner|chef)[:;,]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  // "Founded by John Smith"
  /\bfounded\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  // "Owned by John Smith"
  /\bowned\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
  // "Meet John Smith, Owner"
  /\bmeet\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),?\s+(?:owner|founder|chef|proprietor)/gi,
  // "John Smith, Owner" or "John Smith - Owner"
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)[,\s\-–]+(?:owner|co-owner|founder|proprietor|chef|general\s+manager)/gi,
  // "General Manager: John Smith"
  /\b(?:general\s+manager|gm|managing\s+partner|partner)[:;,]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
]

export interface ScrapedOwner {
  name: string
  title: string | null
  source: string // URL where found
}

export interface OwnerScrapeResult {
  owners: ScrapedOwner[]
  emails: ScrapedEmail[]
}

// Common pages that have contact info
const CONTACT_PATHS = [
  '/',
  '/contact',
  '/contact-us',
  '/about',
  '/about-us',
  '/team',
  '/our-team',
  '/leadership',
  '/management',
  '/staff',
  '/people',
]

// Filter out common false positives
const EMAIL_BLACKLIST = [
  'example.com',
  'email.com',
  'domain.com',
  'yourdomain',
  'sentry.io',
  'wixpress.com',
  'wordpress.com',
  '.png',
  '.jpg',
  '.gif',
  '.svg',
  '.webp',
]

/**
 * Scrape emails from a single URL
 */
async function scrapeUrl(url: string): Promise<string[]> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProspectBot/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) return []

    const html = await response.text()
    const matches = html.match(EMAIL_REGEX) || []

    // Filter and dedupe
    const unique = [...new Set(matches.map((e) => e.toLowerCase()))]

    return unique.filter(
      (email) => !EMAIL_BLACKLIST.some((blocked) => email.includes(blocked))
    )
  } catch {
    return []
  }
}

/**
 * Check if an email is a generic/role email
 */
function isGenericEmail(email: string): boolean {
  const genericPrefixes = [
    'info@',
    'contact@',
    'hello@',
    'support@',
    'help@',
    'sales@',
    'marketing@',
    'hr@',
    'jobs@',
    'careers@',
    'admin@',
    'webmaster@',
    'mail@',
    'office@',
    'team@',
    'press@',
    'media@',
    'privacy@',
    'legal@',
    'billing@',
    'feedback@',
    'inquiry@',
    'enquiry@',
    'general@',
  ]

  return genericPrefixes.some((prefix) => email.startsWith(prefix))
}

/**
 * Scrape emails from a company domain
 */
export async function scrapeCompanyEmails(
  domain: string
): Promise<ScrapedEmail[]> {
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
  const baseUrl = `https://${cleanDomain}`

  const allEmails: ScrapedEmail[] = []
  const seenEmails = new Set<string>()

  for (const path of CONTACT_PATHS) {
    const url = `${baseUrl}${path}`
    const emails = await scrapeUrl(url)

    for (const email of emails) {
      // Only include emails from this domain
      if (email.includes(cleanDomain) && !seenEmails.has(email)) {
        seenEmails.add(email)
        allEmails.push({
          email,
          foundOn: url,
          isGeneric: isGenericEmail(email),
        })
      }
    }

    // Small delay between requests to be polite
    await new Promise((r) => setTimeout(r, 500))
  }

  // Sort: personal emails first, then generic
  return allEmails.sort((a, b) => {
    if (a.isGeneric === b.isGeneric) return 0
    return a.isGeneric ? 1 : -1
  })
}

/**
 * Extract owner names from HTML text using regex patterns
 */
function extractOwnerNames(html: string, sourceUrl: string): ScrapedOwner[] {
  const owners: ScrapedOwner[] = []
  const seenNames = new Set<string>()

  // Strip HTML tags but keep the text structure
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
    .replace(/<[^>]+>/g, ' ') // Replace tags with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace

  // Try each pattern
  for (const pattern of OWNER_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0
    let match

    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim()
      if (!name) continue

      // Validate: should be 2-4 words, each starting with capital
      const words = name.split(/\s+/)
      if (words.length < 2 || words.length > 4) continue

      // Check each word starts with capital
      const validName = words.every((w) => /^[A-Z][a-z]+$/.test(w))
      if (!validName) continue

      // Skip common false positives
      const lowerName = name.toLowerCase()
      if (
        lowerName.includes('contact') ||
        lowerName.includes('click') ||
        lowerName.includes('more') ||
        lowerName.includes('read') ||
        lowerName.includes('view') ||
        lowerName.includes('learn')
      ) {
        continue
      }

      // Dedupe
      const nameKey = name.toLowerCase()
      if (seenNames.has(nameKey)) continue
      seenNames.add(nameKey)

      // Try to extract the title from the match context
      const matchText = match[0].toLowerCase()
      let title: string | null = null
      for (const keyword of OWNER_TITLE_KEYWORDS) {
        if (matchText.includes(keyword)) {
          title = keyword.charAt(0).toUpperCase() + keyword.slice(1)
          break
        }
      }

      owners.push({
        name,
        title: title || 'Owner',
        source: sourceUrl,
      })
    }
  }

  return owners
}

/**
 * Try to extract Schema.org Person data from HTML
 */
function extractSchemaOrgPersons(html: string, sourceUrl: string): ScrapedOwner[] {
  const owners: ScrapedOwner[] = []

  // Look for JSON-LD schema
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1])
      const items = Array.isArray(json) ? json : [json]

      for (const item of items) {
        // Check for Person type
        if (item['@type'] === 'Person' && item.name) {
          owners.push({
            name: item.name,
            title: item.jobTitle || 'Contact',
            source: sourceUrl,
          })
        }

        // Check for Restaurant/LocalBusiness founder/employee
        if (
          (item['@type'] === 'Restaurant' ||
            item['@type'] === 'LocalBusiness' ||
            item['@type'] === 'FoodEstablishment') &&
          item.founder
        ) {
          const founders = Array.isArray(item.founder) ? item.founder : [item.founder]
          for (const founder of founders) {
            const name = typeof founder === 'string' ? founder : founder.name
            if (name) {
              owners.push({
                name,
                title: 'Founder',
                source: sourceUrl,
              })
            }
          }
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return owners
}

/**
 * Scrape owner names AND emails from a company website
 * This is the enhanced version that finds NAMES, not just emails
 */
export async function scrapeOwnerNames(domain: string): Promise<OwnerScrapeResult> {
  const cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
  const baseUrl = `https://${cleanDomain}`

  console.log(`[Website Scraper] Scraping owner names from ${cleanDomain}...`)

  const allOwners: ScrapedOwner[] = []
  const allEmails: ScrapedEmail[] = []
  const seenOwners = new Set<string>()
  const seenEmails = new Set<string>()

  // Priority paths for finding owner info
  const ownerPaths = [
    '/about',
    '/about-us',
    '/our-story',
    '/team',
    '/our-team',
    '/leadership',
    '/staff',
    '/management',
    '/',
    '/contact',
    '/contact-us',
  ]

  for (const path of ownerPaths) {
    const url = `${baseUrl}${path}`

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ProspectBot/1.0)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) continue

      const html = await response.text()

      // Extract owner names using regex patterns
      const patternOwners = extractOwnerNames(html, url)
      for (const owner of patternOwners) {
        const key = owner.name.toLowerCase()
        if (!seenOwners.has(key)) {
          seenOwners.add(key)
          allOwners.push(owner)
          console.log(`[Website Scraper] Found owner: ${owner.name} (${owner.title}) on ${path}`)
        }
      }

      // Extract Schema.org Person data
      const schemaOwners = extractSchemaOrgPersons(html, url)
      for (const owner of schemaOwners) {
        const key = owner.name.toLowerCase()
        if (!seenOwners.has(key)) {
          seenOwners.add(key)
          allOwners.push(owner)
          console.log(`[Website Scraper] Found owner (schema): ${owner.name} (${owner.title}) on ${path}`)
        }
      }

      // Also extract emails while we're here
      const emailMatches = html.match(EMAIL_REGEX) || []
      for (const email of emailMatches) {
        const lowerEmail = email.toLowerCase()
        if (
          lowerEmail.includes(cleanDomain) &&
          !seenEmails.has(lowerEmail) &&
          !EMAIL_BLACKLIST.some((blocked) => lowerEmail.includes(blocked))
        ) {
          seenEmails.add(lowerEmail)
          allEmails.push({
            email: lowerEmail,
            foundOn: url,
            isGeneric: isGenericEmail(lowerEmail),
          })
        }
      }

      // Small delay between requests
      await new Promise((r) => setTimeout(r, 300))
    } catch {
      // Page not found or error, continue to next
    }
  }

  console.log(`[Website Scraper] Complete. Found ${allOwners.length} owners, ${allEmails.length} emails`)

  return {
    owners: allOwners,
    emails: allEmails.sort((a, b) => (a.isGeneric === b.isGeneric ? 0 : a.isGeneric ? 1 : -1)),
  }
}
