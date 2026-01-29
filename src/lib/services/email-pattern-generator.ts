// Email Pattern Generator Service
// Generates likely email address patterns from a name and domain
// This is FREE - no API calls needed

import { EmailGuess } from '@/lib/types/email-prospecting'

/**
 * Generate likely email address patterns from a name and domain
 */
export function generateEmailPatterns(
  firstName: string,
  lastName: string,
  domain: string
): EmailGuess[] {
  // Clean inputs
  const f = firstName.toLowerCase().trim().replace(/[^a-z]/g, '')
  const l = lastName.toLowerCase().trim().replace(/[^a-z]/g, '')
  const d = domain
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .trim()

  if (!f || !l || !d) {
    return []
  }

  // Patterns ordered by commonality in business emails
  // Confidence scores based on industry research
  const patterns: Array<{ template: string; name: string; confidence: number }> =
    [
      // Most common patterns (70%+ of business emails)
      { template: `${f}.${l}@${d}`, name: 'first.last', confidence: 30 },
      { template: `${f}${l}@${d}`, name: 'firstlast', confidence: 22 },
      { template: `${f[0]}${l}@${d}`, name: 'flast', confidence: 18 },

      // Common patterns (20%+ of business emails)
      { template: `${f}@${d}`, name: 'first', confidence: 12 },
      { template: `${f}_${l}@${d}`, name: 'first_last', confidence: 8 },
      { template: `${f}-${l}@${d}`, name: 'first-last', confidence: 5 },

      // Less common but still used
      { template: `${l}.${f}@${d}`, name: 'last.first', confidence: 3 },
      { template: `${f[0]}.${l}@${d}`, name: 'f.last', confidence: 2 },
      { template: `${l}${f}@${d}`, name: 'lastfirst', confidence: 2 },
      { template: `${l}${f[0]}@${d}`, name: 'lastf', confidence: 1 },
      { template: `${f}${l[0]}@${d}`, name: 'firstl', confidence: 1 },
      { template: `${l}@${d}`, name: 'last', confidence: 1 },
    ]

  return patterns.map((p) => ({
    email: p.template,
    pattern: p.name,
    confidence: p.confidence,
  }))
}

/**
 * Generate patterns for a list of names (bulk operation)
 */
export function generateBulkEmailPatterns(
  contacts: Array<{ firstName: string; lastName: string; domain: string }>
): Array<{ contact: (typeof contacts)[0]; guesses: EmailGuess[] }> {
  return contacts.map((contact) => ({
    contact,
    guesses: generateEmailPatterns(
      contact.firstName,
      contact.lastName,
      contact.domain
    ),
  }))
}

/**
 * Generate hospitality-specific role-based email patterns
 * These are common emails used by restaurants, hotels, and venues
 * NO name required - just the domain
 */
export function generateHospitalityEmails(domain: string): EmailGuess[] {
  const d = domain
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, '')
    .split('/')[0]
    .trim()

  if (!d) {
    return []
  }

  // Hospitality-specific patterns ordered by usefulness for sales outreach
  const patterns: Array<{ email: string; role: string; confidence: number }> = [
    // Decision makers (most valuable for sales)
    { email: `gm@${d}`, role: 'General Manager', confidence: 70 },
    { email: `manager@${d}`, role: 'Manager', confidence: 65 },
    { email: `owner@${d}`, role: 'Owner', confidence: 60 },
    { email: `director@${d}`, role: 'Director', confidence: 55 },

    // Event/catering contacts (common for B2B sales)
    { email: `events@${d}`, role: 'Events', confidence: 75 },
    { email: `catering@${d}`, role: 'Catering', confidence: 70 },
    { email: `privateevents@${d}`, role: 'Private Events', confidence: 65 },
    { email: `groupsales@${d}`, role: 'Group Sales', confidence: 60 },

    // General contact points
    { email: `info@${d}`, role: 'General Info', confidence: 85 },
    { email: `contact@${d}`, role: 'Contact', confidence: 80 },
    { email: `hello@${d}`, role: 'Hello', confidence: 70 },

    // Operations
    { email: `reservations@${d}`, role: 'Reservations', confidence: 65 },
    { email: `front@${d}`, role: 'Front Desk', confidence: 50 },
    { email: `office@${d}`, role: 'Office', confidence: 55 },

    // Marketing/PR (for partnerships)
    { email: `marketing@${d}`, role: 'Marketing', confidence: 60 },
    { email: `pr@${d}`, role: 'PR', confidence: 50 },
    { email: `media@${d}`, role: 'Media', confidence: 50 },
    { email: `partnerships@${d}`, role: 'Partnerships', confidence: 55 },

    // HR/Careers (less useful for sales but sometimes responsive)
    { email: `hr@${d}`, role: 'HR', confidence: 45 },
    { email: `careers@${d}`, role: 'Careers', confidence: 40 },
    { email: `jobs@${d}`, role: 'Jobs', confidence: 40 },
  ]

  return patterns.map((p) => ({
    email: p.email,
    pattern: p.role,
    confidence: p.confidence,
  }))
}
