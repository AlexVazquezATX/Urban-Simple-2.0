import {
  BUSINESS_TYPES,
  CURRENT_CLEANING_OPTIONS,
  SQUARE_FOOTAGE_BUCKETS,
  START_TIMING_OPTIONS,
  labelFor,
  type LeadPayload,
} from './schema'

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

  const businessTypeLabel = payload.business_type
    ? labelFor(BUSINESS_TYPES, payload.business_type)
    : undefined
  const squareFootageLabel = payload.square_footage_bucket
    ? labelFor(SQUARE_FOOTAGE_BUCKETS, payload.square_footage_bucket)
    : undefined
  const currentCleaningLabel = payload.current_cleaning
    ? labelFor(CURRENT_CLEANING_OPTIONS, payload.current_cleaning)
    : undefined
  const startTimingLabel = payload.start_timing
    ? labelFor(START_TIMING_OPTIONS, payload.start_timing)
    : undefined

  const noteLines = [
    `Location: ${payload.location}`,
    startTimingLabel ? `Wants to start: ${startTimingLabel}` : null,
    squareFootageLabel ? `Approx. square footage: ${squareFootageLabel}` : null,
    currentCleaningLabel ? `Current cleaning: ${currentCleaningLabel}` : null,
    payload.notes ? `\nLead notes:\n${payload.notes}` : null,
  ].filter(Boolean)

  return {
    companyName: payload.business_name,
    businessType: payload.business_type ?? undefined,
    industry: 'hospitality',
    phone: payload.phone || undefined,
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
        phone: payload.phone || undefined,
        role: 'primary',
        isDecisionMaker: true,
      },
    ],
    discoveryData: {
      submitted_at: payload.submitted_at,
      business_type: payload.business_type ?? null,
      business_type_label: businessTypeLabel ?? null,
      location: payload.location,
      square_footage_bucket: payload.square_footage_bucket ?? null,
      square_footage_label: squareFootageLabel ?? null,
      current_cleaning: payload.current_cleaning ?? null,
      current_cleaning_label: currentCleaningLabel ?? null,
      start_timing: payload.start_timing ?? null,
      start_timing_label: startTimingLabel ?? null,
      utm_source: payload.utm_source ?? null,
      utm_medium: payload.utm_medium ?? null,
      utm_campaign: payload.utm_campaign ?? null,
      utm_content: payload.utm_content ?? null,
      referrer: payload.referrer ?? null,
    },
  }
}
