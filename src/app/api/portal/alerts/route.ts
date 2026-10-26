import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getPortalContext } from '@/lib/portal-auth'
import { smsConfigured, toE164 } from '@/lib/notify/sms'

// Alert preferences for the signed-in portal user. They only ever manage
// their OWN ClientContact row (userId = them, clientId = their client).

const CONTACT_SELECT = {
  id: true,
  email: true,
  phone: true,
  alertEmail: true,
  alertSms: true,
  locationIds: true,
  smsConsentAt: true,
  smsOptedOutAt: true,
} as const

async function ownContact(userId: string, clientId: string) {
  return prisma.clientContact.findFirst({
    where: { userId, clientId },
    orderBy: { createdAt: 'asc' },
    select: CONTACT_SELECT,
  })
}

// GET /api/portal/alerts
export async function GET() {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contact = await ownContact(ctx.userId, ctx.client.id)
  return NextResponse.json({
    contact,
    locations: ctx.locations,
    smsAvailable: smsConfigured(),
  })
}

// PATCH /api/portal/alerts
// Body: { alertEmail, alertSms, phone?, locationIds: string[], smsConsent? }
export async function PATCH(request: NextRequest) {
  const ctx = await getPortalContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contact = await ownContact(ctx.userId, ctx.client.id)
  if (!contact) {
    return NextResponse.json(
      { error: "Your login isn't linked to a contact on this account yet. Email hello@urbansimple.net and we'll fix it." },
      { status: 404 }
    )
  }

  const body = await request.json().catch(() => ({}))
  const alertEmail = body.alertEmail === true
  const alertSms = body.alertSms === true
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''

  // Only this client's locations; every location checked means "all" (empty).
  const validIds = new Set(ctx.locations.map(l => l.id))
  const picked = Array.isArray(body.locationIds)
    ? [...new Set(body.locationIds.filter((id: unknown): id is string => typeof id === 'string' && validIds.has(id)))]
    : []
  const locationIds = picked.length === validIds.size ? [] : picked

  let phone: string | null = contact.phone
  if (phoneRaw) {
    const e164 = toE164(phoneRaw)
    if (!e164) {
      return NextResponse.json({ error: 'Enter a 10-digit US mobile number.' }, { status: 400 })
    }
    phone = e164
  }

  const data: Record<string, unknown> = { alertEmail, alertSms, locationIds }
  if (phoneRaw) data.phone = phone

  // Until texting is live, a text setting staff already turned on is kept as
  // is (the switch is disabled in the UI) so email/location edits still save.
  const smsUnavailable = alertSms && !smsConfigured()
  if (smsUnavailable && !contact.alertSms) {
    return NextResponse.json({ error: 'Text alerts are not available yet.' }, { status: 400 })
  }
  if (smsUnavailable) delete data.alertSms
  if (alertSms && !smsUnavailable) {
    const normalizedPhone = toE164(phone)
    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Add a mobile number to get text alerts.' }, { status: 400 })
    }
    const phoneChanged = normalizedPhone !== toE164(contact.phone)
    const needsConsent =
      !contact.alertSms || !contact.smsConsentAt || Boolean(contact.smsOptedOutAt) || phoneChanged
    if (needsConsent) {
      if (body.smsConsent !== true) {
        return NextResponse.json(
          { error: 'Please check the box to agree to text alerts.' },
          { status: 400 }
        )
      }
      data.smsConsentAt = new Date()
      data.smsOptedOutAt = null
    }
  }

  const updated = await prisma.clientContact.update({
    where: { id: contact.id },
    data,
    select: CONTACT_SELECT,
  })
  return NextResponse.json({ contact: updated })
}
