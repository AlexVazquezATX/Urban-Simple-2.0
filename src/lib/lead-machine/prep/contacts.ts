// Who to write to at an account, cheapest source first: the decision maker
// the research step found (one Findymail lookup), else the person holding
// the right title (two lookups), else the best inbox the website publishes
// (one verification). Findymail only returns verified addresses.

import type { Findymail } from './findymail'

export type FoundContact = {
  firstName: string
  lastName: string
  title: string | null
  email: string
  emailSource: 'findymail' | 'website'
  emailVerificationStatus: 'valid' | 'risky' | 'unknown'
  isDecisionMaker: boolean
  linkedinUrl: string | null
}

const TITLES: Record<string, string[]> = {
  hotel: ['General Manager', 'Hotel Manager', 'Director of Operations', 'Director of Food and Beverage', 'Director of Housekeeping'],
  resort: ['General Manager', 'Resort Manager', 'Director of Operations', 'Director of Food and Beverage', 'Director of Housekeeping'],
  restaurant: ['Owner', 'Co-Owner', 'Founder', 'Managing Partner', 'General Manager', 'Operations Director'],
  bar: ['Owner', 'Co-Owner', 'Founder', 'Managing Partner', 'General Manager', 'Operations Director'],
}

// Inboxes worth writing to, best first. Anything else generic (jobs, press,
// reservations, events) reaches the wrong person.
const GOOD_INBOXES = ['owner', 'gm', 'manager', 'management', 'operations', 'ops', 'info', 'hello', 'contact', 'office', 'admin', 'team']
const GENERIC = /^(info|hello|contact|office|admin|team|events?|catering|reservations?|rsvp|bookings?|careers|jobs|hiring|hr|press|media|marketing|pr|sales|support|help|orders?|giftcards?|privatedining|private|feedback|accounting|billing|ap|ar|noreply|no-reply|webmaster|owner|gm|manager|management|operations|ops)\b/i

export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.replace(/\s+/g, ' ').trim().split(' ')
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

/** The one published address most likely to reach whoever runs the place. */
export function bestSiteEmail(emails: string[]): string | null {
  const personal = emails.filter((e) => !GENERIC.test(e.split('@')[0]))
  if (personal.length) return personal[0]
  for (const box of GOOD_INBOXES) {
    const hit = emails.find((e) => e.split('@')[0].toLowerCase() === box)
    if (hit) return hit
  }
  return null
}

export async function findContacts(input: {
  segment: string
  domain: string | null
  decisionMaker: { name: string; title: string | null } | null
  siteEmails: string[]
  findymail: Findymail | null
}): Promise<FoundContact[]> {
  const { domain, findymail } = input
  const found: FoundContact[] = []

  if (domain && findymail) {
    if (input.decisionMaker) {
      const email = await findymail.findByName(input.decisionMaker.name, domain)
      if (email) {
        found.push({
          ...splitName(input.decisionMaker.name),
          title: input.decisionMaker.title,
          email,
          emailSource: 'findymail',
          emailVerificationStatus: 'valid',
          isDecisionMaker: true,
          linkedinUrl: null,
        })
      }
    }
    if (found.length === 0) {
      const titles = TITLES[input.segment] ?? TITLES.restaurant
      const [person] = await findymail.findEmployees(`https://${domain}`, titles, 1)
      if (person) {
        const email = await findymail.findByName(person.name, domain)
        if (email) {
          found.push({
            ...splitName(person.name),
            title: person.jobTitle,
            email,
            emailSource: 'findymail',
            emailVerificationStatus: 'valid',
            isDecisionMaker: true,
            linkedinUrl: person.linkedinUrl,
          })
        }
      }
    }
  }

  if (found.length === 0) {
    const email = bestSiteEmail(input.siteEmails)
    if (email) {
      const verified = findymail ? await findymail.verify(email) : null
      const personal = !GENERIC.test(email.split('@')[0])
      found.push({
        firstName: '',
        lastName: '',
        title: personal ? null : 'General inbox',
        email,
        emailSource: 'website',
        // Not confirmed is usually a catch-all domain: the send gate holds it
        // unless a human chooses to send anyway.
        emailVerificationStatus: verified === true ? 'valid' : verified === false ? 'risky' : 'unknown',
        isDecisionMaker: false,
        linkedinUrl: null,
      })
    }
  }
  return found
}
