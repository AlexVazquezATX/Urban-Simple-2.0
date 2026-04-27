import { format } from 'date-fns'
import { isServiceDay, normalizeServiceProfile } from '@/lib/operations/dispatch'

type ShiftLocationLike = {
  locationId?: string | null
  location?: {
    id: string
    name: string
    client?: {
      id: string
      name: string
    } | null
  } | null
}

type ShiftLike = {
  id: string
  date: Date | string
  startTime: string
  endTime: string
  status?: string | null
  managerId?: string | null
  manager?: {
    id: string
    firstName: string
    lastName: string
  } | null
  locationId?: string | null
  location?: {
    id: string
    name: string
    client?: {
      id: string
      name: string
    } | null
  } | null
  shiftLocations?: ShiftLocationLike[]
}

type DispatchLocationLike = {
  id: string
  name: string
  createdAt: Date | string
  client: {
    id: string
    name: string
  }
  serviceProfile?: {
    createdAt?: Date | string
    defaultManagerId?: string | null
    defaultManager?: {
      id: string
      firstName?: string | null
      lastName?: string | null
      displayName?: string | null
    } | null
    cadence?: string | null
    serviceDays?: unknown
    preferredStartTime?: string | null
    preferredEndTime?: string | null
    estimatedDurationMins?: number | null
    routePriority?: number | null
    autoSchedule?: boolean | null
    reviewRequired?: boolean | null
    dispatchNotes?: string | null
  } | null
}

export type RouteConflict = {
  managerId: string
  managerName: string
  dateKey: string
  shiftIds: string[]
  reassignShiftId: string
  timeRange: string
  summary: string
}

export type UnassignedRoute = {
  shiftId: string
  dateKey: string
  timeRange: string
  locationSummary: string
  stopCount: number
}

export type CoverageGap = {
  locationId: string
  locationName: string
  clientName: string
  dateKey: string
  defaultManagerId: string
  managerName: string
  reason: string
}

export type CapacityWarning = {
  shiftId: string
  managerId: string | null
  managerName: string
  dateKey: string
  category: 'stop_count' | 'duration' | 'window'
  severity: 'medium' | 'high'
  message: string
}

const MAX_ROUTE_STOPS = 8
const MAX_ROUTE_MINUTES = 4 * 60

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

function getDateKey(value: Date | string) {
  return format(toDate(value), 'yyyy-MM-dd')
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10))
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0
  }

  return hours * 60 + minutes
}

function getShiftRange(shift: ShiftLike) {
  const start = parseTimeToMinutes(shift.startTime)
  let end = parseTimeToMinutes(shift.endTime)

  // Treat overnight routes as spilling into the next day.
  if (end <= start) {
    end += 24 * 60
  }

  return { start, end }
}

function getShiftLocations(shift: ShiftLike) {
  if (Array.isArray(shift.shiftLocations) && shift.shiftLocations.length > 0) {
    return shift.shiftLocations
      .map((stop) => stop.location)
      .filter((location): location is NonNullable<typeof location> => Boolean(location))
  }

  return shift.location ? [shift.location] : []
}

export function findRouteConflicts(shifts: ShiftLike[]): RouteConflict[] {
  const shiftsByManagerDay = new Map<string, ShiftLike[]>()

  for (const shift of shifts) {
    if (!shift.managerId) {
      continue
    }

    const key = `${shift.managerId}:${getDateKey(shift.date)}`
    const group = shiftsByManagerDay.get(key) || []
    group.push(shift)
    shiftsByManagerDay.set(key, group)
  }

  const conflicts: RouteConflict[] = []

  for (const [key, groupedShifts] of shiftsByManagerDay.entries()) {
    const sorted = groupedShifts
      .slice()
      .sort((left, right) => getShiftRange(left).start - getShiftRange(right).start)

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]
      const current = sorted[index]
      const previousRange = getShiftRange(previous)
      const currentRange = getShiftRange(current)

      if (currentRange.start >= previousRange.end) {
        continue
      }

      const [managerId, dateKey] = key.split(':')
      const manager = current.manager || previous.manager
      const managerName =
        manager?.firstName && manager?.lastName
          ? `${manager.firstName} ${manager.lastName}`
          : 'Assigned manager'

      conflicts.push({
        managerId,
        managerName,
        dateKey,
        shiftIds: [previous.id, current.id],
        reassignShiftId: current.id,
        timeRange: `${previous.startTime}-${previous.endTime} overlaps ${current.startTime}-${current.endTime}`,
        summary: `${managerName} is double-booked on ${dateKey}`,
      })
    }
  }

  return conflicts
}

export function findUnassignedRoutes(shifts: ShiftLike[]): UnassignedRoute[] {
  return shifts
    .filter((shift) => !shift.managerId)
    .map((shift) => {
      const locations = getShiftLocations(shift)

      return {
        shiftId: shift.id,
        dateKey: getDateKey(shift.date),
        timeRange: `${shift.startTime}-${shift.endTime}`,
        locationSummary:
          locations.length > 0
            ? locations.map((location) => location.name).join(', ')
            : 'No locations assigned',
        stopCount: locations.length,
      }
    })
}

export function findCoverageGaps(
  dispatchLocations: DispatchLocationLike[],
  shifts: ShiftLike[],
  weekDays: Date[]
): CoverageGap[] {
  const shiftCoverage = new Set<string>()

  for (const shift of shifts) {
    const dateKey = getDateKey(shift.date)
    const locations = getShiftLocations(shift)

    for (const location of locations) {
      shiftCoverage.add(`${dateKey}:${location.id}`)
    }
  }

  const gaps: CoverageGap[] = []

  for (const location of dispatchLocations) {
    if (!location.serviceProfile?.autoSchedule) {
      continue
    }

    const profile = normalizeServiceProfile(location.serviceProfile)
    if (!profile.defaultManagerId || profile.serviceDays.length === 0) {
      continue
    }

    for (const day of weekDays) {
      if (!isServiceDay(profile.serviceDays, day)) {
        continue
      }

      const dateKey = getDateKey(day)
      const coverageKey = `${dateKey}:${location.id}`
      if (shiftCoverage.has(coverageKey)) {
        continue
      }

      const manager =
        location.serviceProfile.defaultManager?.displayName ||
        [location.serviceProfile.defaultManager?.firstName, location.serviceProfile.defaultManager?.lastName]
          .filter(Boolean)
          .join(' ')

      gaps.push({
        locationId: location.id,
        locationName: location.name,
        clientName: location.client.name,
        dateKey,
        defaultManagerId: profile.defaultManagerId,
        managerName: manager || 'Assigned manager',
        reason:
          profile.cadence === 'weekly'
            ? 'No manager route exists for this service day'
            : `No manager route exists for this ${profile.cadence} service day`,
      })
    }
  }

  return gaps
}

export function findCapacityWarnings(
  dispatchLocations: DispatchLocationLike[],
  shifts: ShiftLike[]
): CapacityWarning[] {
  const locationMap = new Map(dispatchLocations.map((location) => [location.id, location]))
  const warnings: CapacityWarning[] = []

  for (const shift of shifts) {
    if (!shift.managerId) {
      continue
    }

    const locations = getShiftLocations(shift)
    if (locations.length === 0) {
      continue
    }

    const managerName = shift.manager
      ? `${shift.manager.firstName} ${shift.manager.lastName}`
      : 'Assigned manager'
    const dateKey = getDateKey(shift.date)

    if (locations.length > MAX_ROUTE_STOPS) {
      warnings.push({
        shiftId: shift.id,
        managerId: shift.managerId,
        managerName,
        dateKey,
        category: 'stop_count',
        severity: 'medium',
        message: `${locations.length} stops scheduled on one route`,
      })
    }

    const estimatedMinutes = locations.reduce((total, location) => {
      const profile = normalizeServiceProfile(locationMap.get(location.id)?.serviceProfile)
      return total + profile.estimatedDurationMins
    }, 0)

    if (estimatedMinutes > MAX_ROUTE_MINUTES) {
      warnings.push({
        shiftId: shift.id,
        managerId: shift.managerId,
        managerName,
        dateKey,
        category: 'duration',
        severity: 'high',
        message: `Estimated route load is ${estimatedMinutes} minutes`,
      })
    }

    const shiftRange = getShiftRange(shift)
    const hasWindowViolation = locations.some((location) => {
      const profile = normalizeServiceProfile(locationMap.get(location.id)?.serviceProfile)
      if (!profile.preferredStartTime || !profile.preferredEndTime) {
        return false
      }

      const preferredStart = parseTimeToMinutes(profile.preferredStartTime)
      let preferredEnd = parseTimeToMinutes(profile.preferredEndTime)
      if (preferredEnd <= preferredStart) {
        preferredEnd += 24 * 60
      }

      return shiftRange.start < preferredStart || shiftRange.end > preferredEnd
    })

    if (hasWindowViolation) {
      warnings.push({
        shiftId: shift.id,
        managerId: shift.managerId,
        managerName,
        dateKey,
        category: 'window',
        severity: 'medium',
        message: 'Scheduled route falls outside at least one preferred service window',
      })
    }
  }

  return warnings
}
