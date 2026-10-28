// SMS via Twilio's REST API (no SDK dependency). Disabled until the
// TWILIO_* env vars are set, so the rest of the app ships without it.
//
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either
//   TWILIO_MESSAGING_SERVICE_SID (preferred, carries A2P 10DLC registration)
//   or TWILIO_FROM_NUMBER (E.164).

import { createHmac, timingSafeEqual } from 'crypto'
import { logComm } from '@/lib/comms/log'
import { appBaseUrl } from '@/lib/notify/email'

/** Where Twilio posts delivery receipts (signed with the same URL). */
export function smsStatusCallbackUrl(): string {
  return `${appBaseUrl()}/api/webhooks/twilio/status`
}

export function smsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_MESSAGING_SERVICE_SID || process.env.TWILIO_FROM_NUMBER)
  )
}

/** Normalize a US-style phone number to E.164, or null if it can't be. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export interface SendSmsInput {
  companyId: string
  to: string | null | undefined
  body: string
  clientId?: string | null
  userId?: string | null
}

/** Send one SMS. Returns true when Twilio accepted it. Never throws. */
export async function sendSms(input: SendSmsInput): Promise<boolean> {
  if (!smsConfigured()) return false
  const to = toE164(input.to)
  if (!to) return false

  const sid = process.env.TWILIO_ACCOUNT_SID!
  const token = process.env.TWILIO_AUTH_TOKEN!
  // Keep it to ~2 segments; Twilio appends nothing on its own.
  const body = input.body.length > 300 ? `${input.body.slice(0, 297)}...` : input.body

  const params = new URLSearchParams({ To: to, Body: body })
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID)
  } else {
    params.set('From', process.env.TWILIO_FROM_NUMBER!)
  }
  // Delivery receipts. Twilio can't reach localhost, so only on a real host.
  const callback = smsStatusCallbackUrl()
  if (callback.startsWith('https://')) params.set('StatusCallback', callback)

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!res.ok) {
      console.error('[notify/sms] Twilio rejected:', res.status, await res.text().catch(() => ''))
      return false
    }
    // The message SID ties Twilio's later delivery receipt back to this row.
    const messageSid = ((await res.json().catch(() => null)) as { sid?: string } | null)?.sid
    await logComm({
      companyId: input.companyId,
      direction: 'outbound',
      channel: 'sms',
      category: 'transactional',
      fromEmail: process.env.TWILIO_FROM_NUMBER ?? 'twilio',
      toEmail: to,
      subject: 'SMS',
      body,
      clientId: input.clientId ?? null,
      userId: input.userId ?? null,
      ...(messageSid ? { sourceType: TWILIO_SOURCE, sourceId: messageSid } : {}),
    })
    return true
  } catch (err) {
    console.error('[notify/sms] send threw:', err)
    return false
  }
}

/**
 * Validate Twilio's X-Twilio-Signature for a form-encoded webhook:
 * base64(HMAC-SHA1(authToken, url + sorted(key+value)...)).
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN
  if (!token || !signature) return false
  const data =
    url +
    Object.keys(params)
      .sort()
      .map(k => k + params[k])
      .join('')
  const expected = createHmac('sha1', token).update(data, 'utf8').digest('base64')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** CommMessage.sourceType for texts; sourceId holds the Twilio message SID. */
export const TWILIO_SOURCE = 'twilio'

/** Map Twilio's MessageStatus onto the hub lifecycle, or null to ignore it. */
export function smsLifecycle(messageStatus: string | null | undefined): 'delivered' | 'failed' | null {
  if (messageStatus === 'delivered') return 'delivered'
  if (messageStatus === 'undelivered' || messageStatus === 'failed') return 'failed'
  return null // queued, accepted, sending, sent: still on its way
}

// The errors we're likely to hit, in plain words. Anything else shows the code.
const SMS_ERRORS: Record<string, string> = {
  '21610': 'the person replied STOP',
  '30003': 'phone off or out of service',
  '30004': 'blocked by the recipient or carrier',
  '30005': 'number does not exist',
  '30006': 'landline or a number that cannot get texts',
  '30007': 'filtered as spam by the carrier',
  '30008': 'unknown carrier error',
  '30034': 'our number is not registered yet (A2P campaign pending)',
}

/** One line for the hub: why a text didn't arrive. */
export function smsFailureReason(errorCode: string | null | undefined): string {
  if (!errorCode) return 'not delivered'
  const plain = SMS_ERRORS[errorCode]
  return plain ? `not delivered: ${plain} (error ${errorCode})` : `not delivered (Twilio error ${errorCode})`
}

export const STOP_WORDS = ['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit']
export const START_WORDS = ['start', 'unstop', 'yes']
