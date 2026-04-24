import { Resend } from 'resend'
import { NotificationToAlex } from '@/emails/NotificationToAlex'
import { AutoResponder } from '@/emails/AutoResponder'
import {
  BUSINESS_TYPES,
  CURRENT_CLEANING_OPTIONS,
  SQUARE_FOOTAGE_BUCKETS,
  START_TIMING_OPTIONS,
  labelFor,
  type LeadPayload,
} from './schema'

const FROM_NOTIFICATION = 'Urban Simple Leads <leads@urbansimple.net>'
const FROM_AUTORESPONDER = 'Alex Vazquez <alex@urbansimple.net>'
const REPLY_TO_AUTORESPONDER = 'alex@urbansimple.net'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('[leads/email] RESEND_API_KEY is not set; skipping email send')
    return null
  }
  return new Resend(key)
}

function formatSubmittedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export async function sendLeadEmails(payload: LeadPayload): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const to = process.env.NOTIFICATION_EMAIL || 'alex@urbansimple.net'

  const businessTypeLabel = labelFor(BUSINESS_TYPES, payload.business_type)
  const squareFootageLabel = labelFor(SQUARE_FOOTAGE_BUCKETS, payload.square_footage_bucket)
  const currentCleaningLabel = labelFor(CURRENT_CLEANING_OPTIONS, payload.current_cleaning)
  const startTimingLabel = labelFor(START_TIMING_OPTIONS, payload.start_timing)
  const submittedAtFormatted = formatSubmittedAt(payload.submitted_at)

  const firstName = payload.name?.trim().split(/\s+/)[0] || ''

  const notification = resend.emails
    .send({
      from: FROM_NOTIFICATION,
      to,
      subject: `New walkthrough request: ${payload.business_name} (${businessTypeLabel})`,
      react: NotificationToAlex({
        name: payload.name || '',
        businessName: payload.business_name,
        businessTypeLabel,
        location: payload.location,
        squareFootageLabel,
        currentCleaningLabel,
        startTimingLabel,
        phone: payload.phone,
        email: payload.email,
        notes: payload.notes,
        utmSource: payload.utm_source,
        utmMedium: payload.utm_medium,
        utmCampaign: payload.utm_campaign,
        referrer: payload.referrer,
        submittedAtFormatted,
      }),
    })
    .then(({ error }) => {
      if (error) console.error('[leads/email] notification failed', error)
    })
    .catch((err) => console.error('[leads/email] notification threw', err))

  const autoresponder = resend.emails
    .send({
      from: FROM_AUTORESPONDER,
      to: payload.email,
      replyTo: REPLY_TO_AUTORESPONDER,
      subject: 'We got your walkthrough request — Urban Simple',
      react: AutoResponder({
        firstName: firstName || 'there',
        businessName: payload.business_name,
      }),
    })
    .then(({ error }) => {
      if (error) console.error('[leads/email] autoresponder failed', error)
    })
    .catch((err) => console.error('[leads/email] autoresponder threw', err))

  await Promise.all([notification, autoresponder])
}
