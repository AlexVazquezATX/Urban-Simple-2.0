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

// Returns a UTC Date representing the instant that is midnight local time
// for the given date in the given timezone.
export function getStartOfLocalDay(date: Date, timeZone: string): Date {
  const parts = formatterParts(date, timeZone)
  const y = parseInt(pickPart(parts, 'year'), 10)
  const m = parseInt(pickPart(parts, 'month'), 10)
  const d = parseInt(pickPart(parts, 'day'), 10)

  // Construct a candidate UTC timestamp for midnight on that date, then adjust
  // by the tz offset. We iterate at most twice to handle DST boundaries.
  let candidate = Date.UTC(y, m - 1, d, 0, 0, 0)
  for (let i = 0; i < 2; i++) {
    const candidateParts = formatterParts(new Date(candidate), timeZone)
    const h = parseInt(pickPart(candidateParts, 'hour'), 10) || 0
    const min = parseInt(pickPart(candidateParts, 'minute'), 10) || 0
    const offsetMinutes = h * 60 + min
    if (offsetMinutes === 0) break
    // Shift back so that the candidate lands on local 00:00.
    candidate -= offsetMinutes * 60 * 1000
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
