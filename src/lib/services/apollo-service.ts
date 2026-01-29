// Apollo.io Service
// Search Apollo's contact database for prospects

import { ApolloContact, ApolloSearchResult } from '@/lib/types/email-prospecting'

const APOLLO_API_KEY = process.env.APOLLO_API_KEY
const APOLLO_BASE_URL = 'https://api.apollo.io/v1'

interface ApolloSearchParams {
  // Person filters
  person_titles?: string[]
  person_seniorities?: string[]

  // Company filters
  organization_domains?: string[]
  organization_ids?: string[]
  organization_num_employees_ranges?: string[]
  organization_locations?: string[]

  // Pagination
  page?: number
  per_page?: number
}

/**
 * Search Apollo's database for contacts
 * This uses Apollo credits
 */
export async function searchContacts(
  params: ApolloSearchParams
): Promise<ApolloSearchResult> {
  if (!APOLLO_API_KEY) {
    throw new Error('APOLLO_API_KEY not configured')
  }

  const response = await fetch(`${APOLLO_BASE_URL}/mixed_people/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      api_key: APOLLO_API_KEY,
      page: params.page || 1,
      per_page: params.per_page || 25,
      person_titles: params.person_titles,
      person_seniorities: params.person_seniorities,
      organization_domains: params.organization_domains,
      organization_ids: params.organization_ids,
      q_organization_num_employees_ranges: params.organization_num_employees_ranges,
      organization_locations: params.organization_locations,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[Apollo] API error: ${response.status}`, errorText)
    throw new Error(`Apollo API error: ${response.status}`)
  }

  const data = await response.json()
  console.log(`[Apollo] Raw response - people count: ${data.people?.length || 0}, pagination:`, data.pagination)

  return {
    contacts: data.people || [],
    pagination: {
      page: data.pagination?.page || 1,
      per_page: data.pagination?.per_page || 25,
      total_entries: data.pagination?.total_entries || 0,
      total_pages: data.pagination?.total_pages || 0,
    },
  }
}

/**
 * Search contacts by company domain
 * Great for "find everyone at marriott.com"
 */
export async function searchByDomain(
  domain: string,
  options?: {
    titles?: string[]
    seniorities?: string[]
    limit?: number
  }
): Promise<ApolloContact[]> {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  console.log(`[Apollo] Searching for contacts at domain: ${cleanDomain}`)

  const result = await searchContacts({
    organization_domains: [cleanDomain],
    person_titles: options?.titles,
    person_seniorities: options?.seniorities,
    per_page: options?.limit || 25,
  })

  console.log(`[Apollo] Found ${result.contacts.length} contacts`)
  return result.contacts
}

/**
 * Enrich a single person (find their email)
 */
export async function enrichPerson(
  firstName: string,
  lastName: string,
  domain: string
): Promise<ApolloContact | null> {
  if (!APOLLO_API_KEY) {
    throw new Error('APOLLO_API_KEY not configured')
  }

  const response = await fetch(`${APOLLO_BASE_URL}/people/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({
      api_key: APOLLO_API_KEY,
      first_name: firstName,
      last_name: lastName,
      organization_domain: domain,
      reveal_personal_emails: false,
      reveal_phone_number: false,
    }),
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json()
  return data.person || null
}

/**
 * Get account info (check remaining credits)
 */
export async function getAccountInfo(): Promise<{
  email: string
  team_credits_remaining: number
  team_credits_total: number
}> {
  if (!APOLLO_API_KEY) {
    throw new Error('APOLLO_API_KEY not configured')
  }

  const response = await fetch(`${APOLLO_BASE_URL}/auth/health`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ api_key: APOLLO_API_KEY }),
  })

  if (!response.ok) {
    throw new Error('Failed to get Apollo account info')
  }

  return response.json()
}
