import { render } from '@react-email/components'
import { NotificationToAlex } from '@/emails/NotificationToAlex'
import { AutoResponder } from '@/emails/AutoResponder'
import {
  BUSINESS_TYPES, CURRENT_CLEANING_OPTIONS, SQUARE_FOOTAGE_BUCKETS,
  START_TIMING_OPTIONS, labelFor, type LeadPayload,
} from './schema'

export type LeadEmailKind = 'notification' | 'autoresponder'
export type LeadEmailRequest = {
  from: string
  to: string[]
  subject: string
  html: string
  reply_to?: string
}

export async function buildLeadEmail(payload: LeadPayload, kind: LeadEmailKind): Promise<LeadEmailRequest> {
  if (kind === 'autoresponder') {
    return {
      from: 'Alex Vazquez <alex@urbansimple.net>',
      to: [payload.email],
      reply_to: 'alex@urbansimple.net',
      subject: 'We got your walkthrough request - Urban Simple',
      html: await render(AutoResponder({
        firstName: payload.name.trim().split(/\s+/)[0] || 'there',
        businessName: payload.business_name,
      })),
    }
  }
  const businessTypeLabel = payload.business_type ? labelFor(BUSINESS_TYPES, payload.business_type) : ''
  return {
    from: 'Urban Simple Leads <leads@urbansimple.net>',
    to: [process.env.NOTIFICATION_EMAIL || 'alex@urbansimple.net'],
    subject: `New walkthrough request: ${payload.business_name}${businessTypeLabel ? ` (${businessTypeLabel})` : ''}`,
    html: await render(NotificationToAlex({
      name: payload.name,
      businessName: payload.business_name,
      businessTypeLabel,
      location: payload.location,
      squareFootageLabel: payload.square_footage_bucket ? labelFor(SQUARE_FOOTAGE_BUCKETS, payload.square_footage_bucket) : '',
      currentCleaningLabel: payload.current_cleaning ? labelFor(CURRENT_CLEANING_OPTIONS, payload.current_cleaning) : '',
      startTimingLabel: payload.start_timing ? labelFor(START_TIMING_OPTIONS, payload.start_timing) : '',
      phone: payload.phone || '', email: payload.email, notes: payload.notes,
      utmSource: payload.utm_source, utmMedium: payload.utm_medium,
      utmCampaign: payload.utm_campaign, referrer: payload.referrer,
      submittedAtFormatted: new Date(payload.submitted_at).toLocaleString('en-US', {
        timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short',
      }),
    })),
  }
}

// The outbox persists this exact body before calling Resend. A transport timeout
// is ambiguous, so retries always carry the SAME key and body, for at most 23h.
export async function sendLeadEmail(body: LeadEmailRequest, idempotencyKey: string): Promise<string> {
  if (!process.env.RESEND_API_KEY) throw new Error('resend_not_configured')
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`resend_http_${response.status}`)
  const result = await response.json() as { id?: unknown }
  if (typeof result.id !== 'string' || !result.id) throw new Error('resend_missing_message_id')
  return result.id
}
