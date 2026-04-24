import {
  BUSINESS_TYPES,
  CURRENT_CLEANING_OPTIONS,
  SQUARE_FOOTAGE_BUCKETS,
  START_TIMING_OPTIONS,
  labelFor,
  type LeadPayload,
} from './schema'

const CRM_ENDPOINT = 'https://www.krew42.com/api/growth/prospects'

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  const firstSpace = trimmed.indexOf(' ')
  if (firstSpace === -1) {
    return { firstName: trimmed, lastName: '' }
  }
  return {
    firstName: trimmed.slice(0, firstSpace),
    lastName: trimmed.slice(firstSpace + 1).trim(),
  }
}

function estimatedSizeFromBucket(bucket?: string): string | undefined {
  switch (bucket) {
    case 'under_2k':
    case '2k_5k':
      return 'small'
    case '5k_10k':
    case '10k_25k':
      return 'medium'
    case '25k_plus':
      return 'large'
    default:
      return undefined
  }
}

export function buildCrmPayload(payload: LeadPayload) {
  const { firstName, lastName } = splitName(payload.name)

  const businessTypeLabel = labelFor(BUSINESS_TYPES, payload.business_type)
  const squareFootageLabel = payload.square_footage_bucket
    ? labelFor(SQUARE_FOOTAGE_BUCKETS, payload.square_footage_bucket)
    : undefined
  const currentCleaningLabel = payload.current_cleaning
    ? labelFor(CURRENT_CLEANING_OPTIONS, payload.current_cleaning)
    : undefined
  const startTimingLabel = labelFor(START_TIMING_OPTIONS, payload.start_timing)

  const noteLines = [
    `Location: ${payload.location}`,
    `Wants to start: ${startTimingLabel}`,
    squareFootageLabel ? `Approx. square footage: ${squareFootageLabel}` : null,
    currentCleaningLabel ? `Current cleaning: ${currentCleaningLabel}` : null,
    payload.notes ? `\nLead notes:\n${payload.notes}` : null,
  ].filter(Boolean)

  return {
    companyName: payload.business_name,
    businessType: payload.business_type,
    industry: 'hospitality',
    phone: payload.phone,
    address: {
      description: payload.location,
    },
    estimatedSize: estimatedSizeFromBucket(payload.square_footage_bucket),
    status: 'new',
    priority: 'high',
    source: 'website',
    sourceDetail: 'urbansimple.net/walkthrough',
    notes: noteLines.join('\n'),
    contacts: [
      {
        firstName: firstName || payload.business_name,
        lastName: lastName || '',
        email: payload.email,
        phone: payload.phone,
        role: 'primary',
        isDecisionMaker: true,
      },
    ],
    discoveryData: {
      submitted_at: payload.submitted_at,
      business_type: payload.business_type,
      business_type_label: businessTypeLabel,
      location: payload.location,
      square_footage_bucket: payload.square_footage_bucket ?? null,
      square_footage_label: squareFootageLabel ?? null,
      current_cleaning: payload.current_cleaning ?? null,
      current_cleaning_label: currentCleaningLabel ?? null,
      start_timing: payload.start_timing,
      start_timing_label: startTimingLabel,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      referrer: payload.referrer ?? null,
    },
  }
}

export async function postLeadToCrm(payload: LeadPayload): Promise<void> {
  const apiKey = process.env.US_CRM_API_KEY
  if (!apiKey) {
    console.error('[leads/crm] US_CRM_API_KEY is not set; skipping CRM post')
    return
  }

  const body = buildCrmPayload(payload)

  try {
    const res = await fetch(CRM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[leads/crm] CRM post failed', {
        status: res.status,
        body: text,
      })
    }
  } catch (err) {
    console.error('[leads/crm] CRM post threw', err)
  }
}
