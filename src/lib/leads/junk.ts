// Website forms draw far more vendor pitches than real leads. A flagged
// submission is still saved and still alerts Alex; it just gets no automatic
// email. So a false positive costs a real lead one human look, never the lead.

const NOT_GIVEN = /^(not provided|n\/?a|none|-+)?$/i

// Sender domains from pitches that have actually come through the forms.
const VENDOR_DOMAIN = /(virtual|vas4hire|vasdirect|vettedva|talentva|marketing|\bseo|leadgen|demandgen|handshake|growth\.|webdesign)/i

const PITCH_PHRASES = [
  /virtual assistant/i,
  /\bseo\b/i,
  /search engine/i,
  /google (ranking|maps|search)/i,
  /lead[- ]?gen/i,
  /demand generation/i,
  /appointment setting/i,
  /backlink/i,
  /web(site)? (design|development|redesign)/i,
  /full[- ]stack/i,
  /business broker/i,
  /(buyers?|investors?) (interested|looking)/i,
  /(purchas|buy|acquir)(e|ing) (your|businesses)/i,
  /outsourcing (partner|company|services)/i,
  /our (agency|services)\b/i,
  // "We offer brunch" and "we provide meals" are real customers talking.
  /we (provide|offer|specialize in)[^.]*\b(services|solutions|marketing|leads|staffing)\b/i,
  /factoring|merchant cash|business (loan|funding)/i,
]

/** Why this submission should wait for a person, or null if it looks real. */
export function leadReviewReason(lead: { business_name: string; email: string; notes?: string }): string | null {
  if (NOT_GIVEN.test(lead.business_name.trim())) return 'no business name'
  const domain = lead.email.split('@')[1] ?? ''
  if (VENDOR_DOMAIN.test(domain)) return 'vendor email domain'
  if (lead.notes && PITCH_PHRASES.some((p) => p.test(lead.notes!))) return 'reads like a sales pitch'
  return null
}
