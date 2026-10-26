// Server helpers for the associate field flow (My Night + the visit screen).

import { prisma } from '@/lib/db'
import type { IncompleteItem } from './constants'

const DAY_MS = 24 * 60 * 60 * 1000

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value ?? '0', 10)
  return { y: get('year'), m: get('month'), d: get('day'), minutes: get('hour') * 60 + get('minute') }
}

function toMinutes(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '')
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null
}

/**
 * Shift.date is a @db.Date stored at UTC midnight of the company-local
 * calendar day. "Tonight" is today's shifts plus yesterday's overnight
 * shifts that haven't ended yet (a 21:00-02:00 shift is still tonight at
 * 1am), plus anything the associate is still clocked in on.
 */
export async function getOperationalWindow(companyId: string, branchId?: string | null) {
  const branch = await prisma.branch.findFirst({
    where: { companyId, ...(branchId ? { id: branchId } : {}) },
    select: { timezone: true },
  })
  const timezone = branch?.timezone || 'America/Chicago'
  const now = localParts(new Date(), timezone)
  const today = new Date(Date.UTC(now.y, now.m - 1, now.d))
  return {
    timezone,
    today,
    yesterday: new Date(today.getTime() - DAY_MS),
    tomorrow: new Date(today.getTime() + DAY_MS),
    nowMinutes: now.minutes,
  }
}

/** Is a shift from yesterday still "tonight"? (overnight, not past end + grace) */
export function overnightStillActive(startTime: string, endTime: string, nowMinutes: number): boolean {
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (start === null || end === null || end > start) return false
  // Allow 3 hours after the scheduled end for late finishes.
  return nowMinutes <= end + 180
}

export interface StopTemplateItem {
  id: string
  text: string
  textEs?: string | null
  requiresPhoto?: boolean
  priority?: string
}

export interface StopTemplateSection {
  id: string
  name: string
  nameEs?: string | null
  items: StopTemplateItem[]
}

export function normalizeSections(raw: unknown): StopTemplateSection[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s, si) => ({
      id: String(s.id ?? `section-${si}`),
      name: String(s.name ?? ''),
      nameEs: typeof s.nameEs === 'string' ? s.nameEs : null,
      items: (Array.isArray(s.items) ? s.items : [])
        .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object' && !!i.id)
        .map(i => ({
          id: String(i.id),
          text: String(i.text ?? ''),
          textEs: typeof i.textEs === 'string' ? i.textEs : null,
          requiresPhoto: Boolean(i.requiresPhoto),
          priority: typeof i.priority === 'string' ? i.priority : 'normal',
        })),
    }))
}

export function parseIncompleteItems(raw: unknown): IncompleteItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object' && typeof i.itemId === 'string')
    .map(i => ({
      itemId: String(i.itemId),
      text: String(i.text ?? ''),
      section: typeof i.section === 'string' ? i.section : undefined,
      reason: String(i.reason ?? 'other'),
      note: typeof i.note === 'string' ? i.note : undefined,
      photos: Array.isArray(i.photos) ? i.photos.filter((p): p is string => typeof p === 'string') : [],
    }))
}

/** Uploaded photo URLs must live in our own Supabase storage bucket. */
export function isOwnStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !!base && url.startsWith(`${base.replace(/\/$/, '')}/storage/v1/object/public/images/`)
}

/**
 * Load a shift the user may work or review. Associates/managers must be
 * assigned; admins and managers may open any shift in the company.
 */
export async function loadAccessibleShift(user: { id: string; companyId: string; role: string }, shiftId: string) {
  const canSeeAll = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user.role)
  return prisma.shift.findFirst({
    where: {
      id: shiftId,
      branch: { companyId: user.companyId },
      ...(canSeeAll ? {} : { OR: [{ associateId: user.id }, { managerId: user.id }] }),
    },
    include: {
      shiftLocations: { select: { locationId: true } },
      location: { select: { id: true } },
    },
  })
}

export function shiftLocationIds(shift: {
  shiftLocations: { locationId: string }[]
  location: { id: string } | null
}): string[] {
  return shift.shiftLocations.length > 0
    ? shift.shiftLocations.map(sl => sl.locationId)
    : shift.location
      ? [shift.location.id]
      : []
}
