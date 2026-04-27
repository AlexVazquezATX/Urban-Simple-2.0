import { startOfDay } from 'date-fns'

export const SERVICE_DAY_OPTIONS = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
] as const

export const SERVICE_CADENCE_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
] as const

export interface DispatchServiceProfileInput {
  cadence: string
  serviceDays: number[]
  preferredStartTime: string | null
  preferredEndTime: string | null
  estimatedDurationMins: number
  defaultManagerId: string | null
  routePriority: number
  autoSchedule: boolean
  reviewRequired: boolean
  dispatchNotes: string | null
}

type DispatchServiceProfileLike = {
  cadence?: string | null
  serviceDays?: unknown
  preferredStartTime?: string | null
  preferredEndTime?: string | null
  estimatedDurationMins?: number | null
  defaultManagerId?: string | null
  routePriority?: number | null
  autoSchedule?: boolean | null
  reviewRequired?: boolean | null
  dispatchNotes?: string | null
}

export const DEFAULT_SERVICE_PROFILE: DispatchServiceProfileInput = {
  cadence: 'weekly',
  serviceDays: [],
  preferredStartTime: '21:00',
  preferredEndTime: '23:00',
  estimatedDurationMins: 120,
  defaultManagerId: null,
  routePriority: 50,
  autoSchedule: false,
  reviewRequired: true,
  dispatchNotes: null,
}

export function normalizeServiceDays(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      if (typeof entry === 'number') {
        return entry
      }

      if (typeof entry === 'string' && entry.trim() !== '') {
        const parsed = Number.parseInt(entry, 10)
        return Number.isNaN(parsed) ? null : parsed
      }

      return null
    })
    .filter((entry): entry is number => entry !== null && entry >= 0 && entry <= 6)
    .filter((entry, index, all) => all.indexOf(entry) === index)
    .sort((a, b) => a - b)
}

export function normalizeServiceProfile(
  profile: DispatchServiceProfileLike | null | undefined
): DispatchServiceProfileInput {
  if (!profile) {
    return { ...DEFAULT_SERVICE_PROFILE }
  }

  return {
    cadence: profile.cadence || DEFAULT_SERVICE_PROFILE.cadence,
    serviceDays: normalizeServiceDays(profile.serviceDays),
    preferredStartTime:
      profile.preferredStartTime === '' || profile.preferredStartTime === undefined
        ? DEFAULT_SERVICE_PROFILE.preferredStartTime
        : profile.preferredStartTime,
    preferredEndTime:
      profile.preferredEndTime === '' || profile.preferredEndTime === undefined
        ? DEFAULT_SERVICE_PROFILE.preferredEndTime
        : profile.preferredEndTime,
    estimatedDurationMins:
      typeof profile.estimatedDurationMins === 'number' &&
      Number.isFinite(profile.estimatedDurationMins)
        ? profile.estimatedDurationMins
        : DEFAULT_SERVICE_PROFILE.estimatedDurationMins,
    defaultManagerId:
      profile.defaultManagerId === undefined ? DEFAULT_SERVICE_PROFILE.defaultManagerId : profile.defaultManagerId,
    routePriority:
      typeof profile.routePriority === 'number' && Number.isFinite(profile.routePriority)
        ? profile.routePriority
        : DEFAULT_SERVICE_PROFILE.routePriority,
    autoSchedule:
      typeof profile.autoSchedule === 'boolean'
        ? profile.autoSchedule
        : DEFAULT_SERVICE_PROFILE.autoSchedule,
    reviewRequired:
      typeof profile.reviewRequired === 'boolean'
        ? profile.reviewRequired
        : DEFAULT_SERVICE_PROFILE.reviewRequired,
    dispatchNotes:
      profile.dispatchNotes === undefined
        ? DEFAULT_SERVICE_PROFILE.dispatchNotes
        : profile.dispatchNotes,
  }
}

export function formatServiceDays(serviceDays: number[]) {
  if (serviceDays.length === 0) {
    return 'No service days set'
  }

  return serviceDays
    .map((day) => SERVICE_DAY_OPTIONS.find((option) => option.value === day)?.shortLabel || day)
    .join(', ')
}

export function getDefaultDispatchWindow(
  profile: Partial<DispatchServiceProfileInput> | null | undefined
) {
  const normalized = normalizeServiceProfile(profile)

  return {
    startTime: normalized.preferredStartTime || '21:00',
    endTime: normalized.preferredEndTime || '23:00',
  }
}

export function isServiceDay(serviceDays: number[], date: Date) {
  return normalizeServiceDays(serviceDays).includes(date.getDay())
}

export function shouldScheduleOnDate(
  profile: DispatchServiceProfileInput,
  anchorDate: Date | string,
  targetDate: Date
) {
  if (!isServiceDay(profile.serviceDays, targetDate)) {
    return false
  }

  const anchor = startOfDay(anchorDate instanceof Date ? anchorDate : new Date(anchorDate))
  const target = startOfDay(targetDate)
  const diffDays = Math.floor((target.getTime() - anchor.getTime()) / 86400000)

  switch (profile.cadence) {
    case 'biweekly':
      return diffDays >= 0 && Math.floor(diffDays / 7) % 2 === 0
    case 'monthly':
      return target.getDate() <= 7
    case 'custom':
      return true
    default:
      return true
  }
}
