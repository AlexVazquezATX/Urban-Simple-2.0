// Hunter.io Service
// Domain search, email finder, and email verification
// Better for local businesses than Apollo

const HUNTER_API_KEY = process.env.HUNTER_API_KEY
const HUNTER_BASE_URL = 'https://api.hunter.io/v2'

export interface HunterEmail {
  value: string
  type: 'personal' | 'generic'
  confidence: number
  first_name: string | null
  last_name: string | null
  position: string | null
  seniority: string | null
  department: string | null
  linkedin: string | null
  twitter: string | null
  phone_number: string | null
  sources: Array<{
    domain: string
    uri: string
    extracted_on: string
    last_seen_on: string
    still_on_page: boolean
  }>
  verification: {
    date: string | null
    status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown' | null
  }
}

export interface HunterDomainSearchResult {
  domain: string
  disposable: boolean
  webmail: boolean
  accept_all: boolean
  pattern: string | null
  organization: string | null
  description: string | null
  industry: string | null
  twitter: string | null
  facebook: string | null
  linkedin: string | null
  instagram: string | null
  youtube: string | null
  technologies: string[]
  country: string | null
  state: string | null
  city: string | null
  postal_code: string | null
  street: string | null
  emails: HunterEmail[]
}

export interface HunterEmailFinderResult {
  first_name: string
  last_name: string
  email: string
  score: number
  domain: string
  accept_all: boolean
  position: string | null
  twitter: string | null
  linkedin_url: string | null
  phone_number: string | null
  company: string | null
  sources: Array<{
    domain: string
    uri: string
    extracted_on: string
    last_seen_on: string
    still_on_page: boolean
  }>
  verification: {
    date: string | null
    status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown' | null
  }
}

export interface HunterVerificationResult {
  status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown'
  result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown'
  score: number
  email: string
  regexp: boolean
  gibberish: boolean
  disposable: boolean
  webmail: boolean
  mx_records: boolean
  smtp_server: boolean
  smtp_check: boolean
  accept_all: boolean
  block: boolean
  sources: Array<{
    domain: string
    uri: string
    extracted_on: string
    last_seen_on: string
    still_on_page: boolean
  }>
}

/**
 * Search for all emails at a domain
 * This is Hunter's strength - finds ALL emails, not just LinkedIn profiles
 */
export async function searchDomain(
  domain: string,
  options?: {
    limit?: number
    type?: 'personal' | 'generic'
    seniority?: string[]
    department?: string[]
  }
): Promise<HunterDomainSearchResult | null> {
  if (!HUNTER_API_KEY) {
    console.error('[Hunter] API key not configured')
    return null
  }

  const cleanDomain = domain
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]

  console.log(`[Hunter] Searching domain: ${cleanDomain}`)

  const params = new URLSearchParams({
    api_key: HUNTER_API_KEY,
    domain: cleanDomain,
    limit: String(options?.limit || 10),
  })

  if (options?.type) {
    params.append('type', options.type)
  }
  if (options?.seniority?.length) {
    params.append('seniority', options.seniority.join(','))
  }
  if (options?.department?.length) {
    params.append('department', options.department.join(','))
  }

  try {
    const response = await fetch(`${HUNTER_BASE_URL}/domain-search?${params}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Hunter] Domain search error: ${response.status}`, errorText)
      throw new Error(`Hunter API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[Hunter] Found ${data.data?.emails?.length || 0} emails at ${cleanDomain}`)

    if (data.data?.pattern) {
      console.log(`[Hunter] Email pattern detected: ${data.data.pattern}`)
    }

    return data.data
  } catch (error) {
    console.error('[Hunter] Domain search failed:', error)
    throw error
  }
}

/**
 * Find a specific person's email
 * Uses Hunter's email pattern detection + verification
 */
export async function findEmail(
  firstName: string,
  lastName: string,
  domain: string,
  options?: {
    company?: string
  }
): Promise<HunterEmailFinderResult | null> {
  if (!HUNTER_API_KEY) {
    console.error('[Hunter] API key not configured')
    return null
  }

  const cleanDomain = domain
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]

  console.log(`[Hunter] Finding email for ${firstName} ${lastName} at ${cleanDomain}`)

  const params = new URLSearchParams({
    api_key: HUNTER_API_KEY,
    domain: cleanDomain,
    first_name: firstName,
    last_name: lastName,
  })

  if (options?.company) {
    params.append('company', options.company)
  }

  try {
    const response = await fetch(`${HUNTER_BASE_URL}/email-finder?${params}`)

    if (!response.ok) {
      const errorText = await response.text()
      // 404 means not found, which is expected for some lookups
      if (response.status === 404) {
        console.log(`[Hunter] No email found for ${firstName} ${lastName}`)
        return null
      }
      console.error(`[Hunter] Email finder error: ${response.status}`, errorText)
      throw new Error(`Hunter API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.data?.email) {
      console.log(`[Hunter] Found email: ${data.data.email} (score: ${data.data.score})`)
      return data.data
    }

    return null
  } catch (error) {
    console.error('[Hunter] Email finder failed:', error)
    throw error
  }
}

/**
 * Verify an email address
 * Returns deliverability status
 */
export async function verifyEmail(email: string): Promise<HunterVerificationResult | null> {
  if (!HUNTER_API_KEY) {
    console.error('[Hunter] API key not configured')
    return null
  }

  console.log(`[Hunter] Verifying email: ${email}`)

  const params = new URLSearchParams({
    api_key: HUNTER_API_KEY,
    email: email,
  })

  try {
    const response = await fetch(`${HUNTER_BASE_URL}/email-verifier?${params}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Hunter] Verification error: ${response.status}`, errorText)
      throw new Error(`Hunter API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[Hunter] Verification result: ${data.data?.result} (score: ${data.data?.score})`)

    return data.data
  } catch (error) {
    console.error('[Hunter] Email verification failed:', error)
    throw error
  }
}

/**
 * Get email pattern for a domain
 * Useful when you have a name but Hunter can't find the exact email
 */
export async function getEmailPattern(domain: string): Promise<string | null> {
  const result = await searchDomain(domain, { limit: 1 })
  return result?.pattern || null
}

/**
 * Generate email from pattern
 * If Hunter tells us the pattern is {first}.{last}@domain.com
 * We can generate emails for any name
 */
export function generateFromPattern(
  pattern: string,
  firstName: string,
  lastName: string,
  domain: string
): string | null {
  if (!pattern) return null

  const f = firstName.toLowerCase().trim()
  const l = lastName.toLowerCase().trim()
  const fi = f.charAt(0)
  const li = l.charAt(0)

  // Common Hunter patterns
  const generated = pattern
    .replace('{first}', f)
    .replace('{last}', l)
    .replace('{f}', fi)
    .replace('{l}', li)

  // If pattern still has unreplaced placeholders, return null
  if (generated.includes('{')) return null

  return `${generated}@${domain}`
}

/**
 * Get Hunter account info (for checking credits)
 */
export async function getAccountInfo(): Promise<{
  first_name: string
  last_name: string
  email: string
  plan_name: string
  plan_level: number
  reset_date: string
  team_id: number
  calls: {
    used: number
    available: number
  }
} | null> {
  if (!HUNTER_API_KEY) {
    console.error('[Hunter] API key not configured')
    return null
  }

  try {
    const response = await fetch(
      `${HUNTER_BASE_URL}/account?api_key=${HUNTER_API_KEY}`
    )

    if (!response.ok) {
      throw new Error('Failed to get Hunter account info')
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('[Hunter] Account info failed:', error)
    return null
  }
}
