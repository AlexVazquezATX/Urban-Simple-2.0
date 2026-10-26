// Staff-side rules for a client contact's ops alert settings, shared by the
// contact create + update routes.
//   - locationIds must be locations of this client (empty = all locations)
//   - text alerts need a usable mobile number and, when switched on from the
//     staff side, an explicit "client gave consent" confirmation (stamps
//     smsConsentAt). Switching off keeps the consent timestamp for the record.
//   - a contact who replied STOP can't be re-enabled from here.

import { prisma } from '@/lib/db'
import { toE164 } from '@/lib/notify/sms'

interface ExistingContact {
  phone: string | null
  alertSms: boolean
  smsOptedOutAt: Date | null
}

export async function resolveContactAlertFields(params: {
  clientId: string
  body: Record<string, unknown>
  existing?: ExistingContact
}): Promise<{ data: Record<string, unknown> } | { error: string }> {
  const { clientId, body, existing } = params
  const data: Record<string, unknown> = {}

  if (body.locationIds !== undefined) {
    if (!Array.isArray(body.locationIds)) return { error: 'locationIds must be a list' }
    const ids = [...new Set(body.locationIds.filter((x): x is string => typeof x === 'string'))]
    if (ids.length) {
      const found = await prisma.location.count({ where: { id: { in: ids }, clientId, deletedAt: null } })
      if (found !== ids.length) return { error: 'Alert locations must belong to this client' }
    }
    data.locationIds = ids
  }

  if (body.alertEmail !== undefined) {
    if (typeof body.alertEmail !== 'boolean') return { error: 'alertEmail must be true or false' }
    data.alertEmail = body.alertEmail
  }

  // Phone: normalize to E.164 when we can; keep what was typed otherwise so
  // landlines with extensions aren't lost.
  let phone: string | null = existing?.phone ?? null
  if (body.phone !== undefined) {
    const raw = typeof body.phone === 'string' ? body.phone.trim() : ''
    phone = raw ? toE164(raw) ?? raw : null
    data.phone = phone
  }

  const wasOn = existing?.alertSms ?? false
  const wantsSms = body.alertSms === undefined ? wasOn : body.alertSms === true
  if (body.alertSms !== undefined && typeof body.alertSms !== 'boolean') {
    return { error: 'alertSms must be true or false' }
  }

  if (wantsSms) {
    if (existing?.smsOptedOutAt) {
      return { error: 'This contact replied STOP to our texts. They need to text START to opt back in.' }
    }
    if (!toE164(phone)) return { error: 'Text alerts need a valid mobile number' }
    // Consent is per number: a new number needs a fresh confirmation.
    const numberChanged = wasOn && toE164(phone) !== toE164(existing?.phone ?? null)
    if (!wasOn || numberChanged) {
      if (body.smsConsent !== true) {
        return { error: 'Confirm the client gave consent to receive service alert texts at this number' }
      }
      data.smsConsentAt = new Date()
    }
  }
  if (body.alertSms !== undefined) data.alertSms = wantsSms

  return { data }
}
