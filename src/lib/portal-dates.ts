// Calendar-day helpers for the client portal. Service dates are stored as
// @db.Date (UTC midnight of the calendar day), so comparisons are done on
// 'yyyy-MM-dd' keys in the client's branch timezone.

import { prisma } from '@/lib/db'

export async function clientTimezone(clientId: string): Promise<string> {
  const c = await prisma.client.findUnique({
    where: { id: clientId },
    select: { branch: { select: { timezone: true } } },
  })
  return c?.branch?.timezone || 'America/Chicago'
}

/** 'yyyy-MM-dd' for an instant, as seen in the given timezone. */
export function localDateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** 'yyyy-MM-dd' for a stored @db.Date value (UTC midnight). */
export function dbDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Shift a 'yyyy-MM-dd' key by whole days. */
export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "Oct 25, 9:41 PM" in the given timezone (server renders in UTC otherwise). */
export function formatLocalDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/**
 * A @db.Date value (UTC midnight of a calendar day) as a local Date on that
 * same day, for date-fns format(). Formatting the raw value shows the day
 * before on any server or browser west of UTC.
 */
export function dbDate(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}
