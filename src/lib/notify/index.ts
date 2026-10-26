// Central notification fan-out. Every ops alert goes through here so the
// channels stay consistent:
//   staff   → in-app Notification row + email (+ SMS if they opted in)
//   clients → email and/or SMS, only for contacts who opted in for that location
//
// Everything is best-effort: these functions log and swallow errors so a
// delivery problem never fails the request that caused it. Call them inside
// `after()` from route handlers so the response isn't held up.

import { prisma } from '@/lib/db'
import { sendEmail, type AlertEmailContent } from './email'
import { sendSms, toE164 } from './sms'

export { appBaseUrl, escapeHtml } from './email'
export { smsConfigured } from './sms'

export interface StaffRecipient {
  id: string
  email: string
  firstName: string
  phone: string | null
  smsAlerts: boolean
}

const STAFF_SELECT = {
  id: true,
  email: true,
  firstName: true,
  phone: true,
  smsAlerts: true,
} as const

/**
 * Who on staff should hear about something at this location:
 *   1. the location's default manager (dispatch profile)
 *   2. any manager running a review route that includes the location that night
 *   3. admins, when escalating (high/critical) or when nobody above exists
 * Only active humans with a real login are returned (agent accounts are skipped).
 */
export async function staffRecipientsForLocation(params: {
  companyId: string
  locationId: string
  serviceDate?: Date | null
  escalate?: boolean
  excludeUserIds?: string[]
}): Promise<StaffRecipient[]> {
  const { companyId, locationId, serviceDate, escalate } = params
  const exclude = new Set(params.excludeUserIds ?? [])
  const ids = new Set<string>()

  const profile = await prisma.locationServiceProfile.findUnique({
    where: { locationId },
    select: { defaultManagerId: true },
  })
  if (profile?.defaultManagerId) ids.add(profile.defaultManagerId)

  // Shift dates are stored at UTC midnight of the calendar day; look at the
  // service day and the day before (overnight routes).
  const day = serviceDate ?? new Date()
  const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()))
  const from = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000)
  const to = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const shifts = await prisma.shift.findMany({
    where: {
      managerId: { not: null },
      date: { gte: from, lt: to },
      status: { not: 'cancelled' },
      OR: [{ locationId }, { shiftLocations: { some: { locationId } } }],
    },
    select: { managerId: true },
    take: 5,
  })
  for (const s of shifts) if (s.managerId) ids.add(s.managerId)

  const baseWhere = {
    companyId,
    isActive: true,
    authId: { not: null },
  }

  const managers = ids.size
    ? await prisma.user.findMany({
        where: { ...baseWhere, id: { in: [...ids] } },
        select: STAFF_SELECT,
      })
    : []

  let admins: StaffRecipient[] = []
  if (escalate || managers.length === 0) {
    admins = await prisma.user.findMany({
      where: { ...baseWhere, role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: STAFF_SELECT,
    })
  }

  const seen = new Set<string>()
  return [...managers, ...admins].filter(u => {
    if (seen.has(u.id) || exclude.has(u.id)) return false
    seen.add(u.id)
    return true
  })
}

export interface StaffAlert {
  companyId: string
  type?: 'info' | 'warning' | 'action_required' | 'success'
  title: string
  message: string
  link: string // in-app path, e.g. /operations/issues/abc
  subject: string
  email: AlertEmailContent
  sms?: string // short text; only sent to users with smsAlerts + phone
}

export async function notifyStaff(recipients: StaffRecipient[], alert: StaffAlert) {
  if (recipients.length === 0) return { inApp: 0, emailed: 0, texted: 0 }
  let emailed = 0
  let texted = 0
  try {
    await prisma.notification.createMany({
      data: recipients.map(r => ({
        userId: r.id,
        type: alert.type ?? 'action_required',
        title: alert.title.slice(0, 200),
        message: alert.message.slice(0, 1000),
        link: alert.link,
      })),
    })
  } catch (err) {
    console.error('[notify] in-app notification write failed:', err)
  }

  await Promise.all(
    recipients.map(async r => {
      if (await sendEmail({ companyId: alert.companyId, to: r.email, subject: alert.subject, content: alert.email, userId: r.id })) {
        emailed++
      }
      if (alert.sms && r.smsAlerts && r.phone) {
        if (await sendSms({ companyId: alert.companyId, to: r.phone, body: alert.sms, userId: r.id })) texted++
      }
    })
  )
  return { inApp: recipients.length, emailed, texted }
}

export interface ClientAlertRecipient {
  contactId: string | null
  email: string | null
  phone: string | null // E.164, only when SMS is allowed
  firstName: string
}

/**
 * Client contacts opted in to ops alerts for this location. A contact with an
 * empty locationIds list covers every location of the client.
 */
export async function clientRecipientsForLocation(params: {
  clientId: string
  locationId: string
}): Promise<ClientAlertRecipient[]> {
  const contacts = await prisma.clientContact.findMany({
    where: {
      clientId: params.clientId,
      client: { deletedAt: null },
      OR: [{ alertEmail: true }, { alertSms: true }],
    },
    select: {
      id: true,
      firstName: true,
      email: true,
      phone: true,
      locationIds: true,
      alertEmail: true,
      alertSms: true,
      smsOptedOutAt: true,
    },
  })
  return contacts
    .filter(c => c.locationIds.length === 0 || c.locationIds.includes(params.locationId))
    .map(c => ({
      contactId: c.id,
      email: c.alertEmail && c.email ? c.email : null,
      phone: c.alertSms && !c.smsOptedOutAt ? toE164(c.phone) : null,
      firstName: c.firstName,
    }))
}

export interface ClientAlert {
  companyId: string
  clientId: string
  subject: string
  email: AlertEmailContent
  sms?: string
  /** Extra one-off email recipients (e.g. the portal user who reported it). */
  extraEmails?: string[]
}

export async function notifyClients(recipients: ClientAlertRecipient[], alert: ClientAlert) {
  const emails = new Set<string>()
  for (const r of recipients) if (r.email) emails.add(r.email.trim().toLowerCase())
  for (const e of alert.extraEmails ?? []) if (e) emails.add(e.trim().toLowerCase())
  const phones = new Set<string>()
  if (alert.sms) for (const r of recipients) if (r.phone) phones.add(r.phone)

  let emailed = 0
  let texted = 0
  await Promise.all([
    ...[...emails].map(async to => {
      if (await sendEmail({ companyId: alert.companyId, to, subject: alert.subject, content: alert.email, category: 'portal', clientId: alert.clientId, replyTo: process.env.RESEND_PORTAL_REPLY_TO || undefined })) emailed++
    }),
    ...[...phones].map(async to => {
      if (await sendSms({ companyId: alert.companyId, to, body: alert.sms!, clientId: alert.clientId })) texted++
    }),
  ])
  return { emailed, texted }
}
