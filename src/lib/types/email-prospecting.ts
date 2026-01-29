// Email Prospecting Type Definitions

export interface EmailGuess {
  email: string
  pattern: string
  confidence: number
}

export interface VerificationResult {
  email: string
  is_valid: boolean
  is_format_valid: boolean
  is_mx_valid: boolean
  is_smtp_valid: boolean
  is_disposable: boolean
  is_free_provider: boolean
  is_role_email: boolean
  is_catch_all: boolean
  quality_score: number
  did_you_mean?: string
}

export interface ApolloContact {
  id: string
  first_name: string
  last_name: string
  name: string
  email: string
  title: string
  seniority: string
  departments: string[]
  linkedin_url: string
  organization: {
    id: string
    name: string
    website_url: string
    linkedin_url: string
    estimated_num_employees: number
    industry: string
  }
}

export interface ApolloSearchResult {
  contacts: ApolloContact[]
  pagination: {
    page: number
    per_page: number
    total_entries: number
    total_pages: number
  }
}

export interface ScrapedEmail {
  email: string
  foundOn: string
  isGeneric: boolean
}

export interface ProspectSearchResult {
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  email_confidence?: number
  email_verified?: boolean
  email_verification_status?: 'valid' | 'invalid' | 'risky' | 'unknown'
  position?: string
  company_name?: string
  domain?: string
  linkedin?: string
  source?: 'apollo' | 'hunter' | 'pattern' | 'scraper' | 'hospitality_pattern' | 'yelp' | 'google' | 'manual'
  notes?: string
}

// Search methods:
// - 'apollo': Apollo.io database (good for B2B/enterprise, bad for local restaurants)
// - 'hunter': Hunter.io (better for local businesses, finds ALL emails at a domain)
// - 'pattern': DIY email pattern generation from name + domain
// - 'scraper': Website email scraping
// - 'hospitality': Role-based emails (info@, events@, gm@, etc.)
// - 'discover': Full owner discovery workflow (Yelp + Google + Hunter)
// - 'all': Try all methods with intelligent fallback
export type SearchMethod = 'apollo' | 'hunter' | 'pattern' | 'scraper' | 'hospitality' | 'discover' | 'all'

export interface FindProspectsOptions {
  domain: string
  method?: SearchMethod
  titles?: string[]
  seniorities?: string[]
  limit?: number
  verifyEmails?: boolean
  // For 'discover' method - need business name and location
  businessName?: string
  city?: string
  state?: string
}

export interface FindPersonOptions {
  firstName: string
  lastName: string
  domain: string
  method?: SearchMethod
  verifyEmail?: boolean
}
