// Timezone-aware scheduling helpers for autopilot outreach.
//
// The executor cron runs hourly (UTC). We compare "is the company's local time
// currently inside its send window?" and we compute "start of today in the
// company's local time" for the daily-cap query. Everything here avoids pulling
// in date-fns-tz or luxon: we use Intl.DateTimeFormat which is built into Node.

type AutopilotWindow = {
  timezone: string
  hourStart: number // inclusive, 0-23
  hourEnd: number // exclusive, 0-23
  daysOfWeek: number[] // 0=Sun..6=Sat
}

function formatterParts(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date)
}

function pickPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find(p => p.type === type)?.value ?? ''
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

export function getLocalDayOfWeek(date: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
  return WEEKDAY_INDEX[short] ?? 0
}

export function getLocalHour(date: Date, timeZone: string): number {
  const parts = formatterParts(date, timeZone)
  const hour = parseInt(pickPart(parts, 'hour'), 10)
  // Intl returns "24" for midnight in some locales — normalize.
  return hour === 24 ? 0 : hour
}

// The company-local calendar date as a UTC-midnight Date (the convention
// Shift.date / @db.Date columns use). Use this to compare against @db.Date
// columns; use getStartOfLocalDay to compare against timestamps.
export function getLocalDateUTC(date: Date, timeZone: string): Date {
  const parts = formatterParts(date, timeZone)
  return new Date(Date.UTC(
    parseInt(pickPart(parts, 'year'), 10),
    parseInt(pickPart(parts, 'month'), 10) - 1,
    parseInt(pickPart(parts, 'day'), 10),
  ))
}

// The zone's UTC offset at an instant, in ms (negative west of UTC): the local
// wall-clock time read as if it were UTC, minus the instant itself.
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = formatterParts(date, timeZone)
  const hour = parseInt(pickPart(parts, 'hour'), 10)
  const wallAsUtc = Date.UTC(
    parseInt(pickPart(parts, 'year'), 10),
    parseInt(pickPart(parts, 'month'), 10) - 1,
    parseInt(pickPart(parts, 'day'), 10),
    hour === 24 ? 0 : hour,
    parseInt(pickPart(parts, 'minute'), 10),
    parseInt(pickPart(parts, 'second'), 10),
  )
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000
}

// Returns a UTC Date representing the instant that is midnight local time
// for the given date in the given timezone (05:00Z for a CDT day).
export function getStartOfLocalDay(date: Date, timeZone: string): Date {
  const localMidnightAsUtc = getLocalDateUTC(date, timeZone).getTime()

  // Subtract the zone offset, then re-check it at the result in case midnight
  // sits on the other side of a DST change.
  let candidate = localMidnightAsUtc
  for (let i = 0; i < 2; i++) {
    const next = localMidnightAsUtc - zoneOffsetMs(new Date(candidate), timeZone)
    if (next === candidate) break
    candidate = next
  }
  return new Date(candidate)
}

export function isWithinSendWindow(date: Date, window: AutopilotWindow): boolean {
  const dow = getLocalDayOfWeek(date, window.timezone)
  if (!window.daysOfWeek.includes(dow)) return false
  const hour = getLocalHour(date, window.timezone)
  return hour >= window.hourStart && hour < window.hourEnd
}

// Pick a random minute offset from the start of the send window, in milliseconds.
function randomMinuteInWindow(hourStart: number, hourEnd: number): number {
  const totalMinutes = (hourEnd - hourStart) * 60
  const jitter = Math.floor(Math.random() * totalMinutes)
  return (hourStart * 60 + jitter) * 60 * 1000
}

// Given a base instant, find the next send-window slot:
//   - advances to the next allowed day of week
//   - picks a random minute within [hourStart, hourEnd) on that day
// Returns a UTC Date.
export function nextSendSlot(
  from: Date,
  window: AutopilotWindow,
  opts: { minLeadMinutes?: number } = {}
): Date {
  const minLead = opts.minLeadMinutes ?? 5

  // Try today first, then advance day-by-day up to 14 days.
  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const probe = new Date(from.getTime() + dayOffset * 24 * 60 * 60 * 1000)
    const dow = getLocalDayOfWeek(probe, window.timezone)
    if (!window.daysOfWeek.includes(dow)) continue

    const startOfProbeDay = getStartOfLocalDay(probe, window.timezone)
    const slot = new Date(
      startOfProbeDay.getTime() + randomMinuteInWindow(window.hourStart, window.hourEnd)
    )

    // If the slot is in the past or too soon, skip to next day.
    if (slot.getTime() < from.getTime() + minLead * 60 * 1000) continue

    return slot
  }

  // Fallback: same instant + 1 day. Should never hit this.
  return new Date(from.getTime() + 24 * 60 * 60 * 1000)
}

// Advance a base slot by N calendar days, then snap to the next valid window
// day and pick a jittered time in the window.
export function slotAfterDays(
  base: Date,
  days: number,
  window: AutopilotWindow
): Date {
  const target = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
  return nextSendSlot(target, window, { minLeadMinutes: 0 })
}
