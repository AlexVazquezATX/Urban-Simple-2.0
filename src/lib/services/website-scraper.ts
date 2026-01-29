// Website Email Scraper Service
// Scrapes emails from company websites

import { ScrapedEmail } from '@/lib/types/email-prospecting'

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

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
