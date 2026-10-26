// Builds associate shifts from LocationAssignment schedules so nobody has to
// hand-enter every night. An assignment with daysOfWeek + a cleaning window
// produces one shift per matching night. Idempotent: a location/night never
// gets more crew shifts than it has matching assignments, counting shifts in
// any status (cancelled, or handed to a substitute), so manual edits stick.
// reconcileAssignmentShifts() clears untouched future auto shifts when an
// assignment's schedule changes or it ends.

import { prisma } from '@/lib/db'

export const AUTO_ASSOCIATE_NOTE = 'Auto-generated from assignment'

const DAY_MS = 24 * 60 * 60 * 1000

export interface AssociateShiftResult {
  assignmentsConsidered: number
  created: number
  skippedExisting: number
  skippedIncomplete: number // assignments missing days or window
}

/**
 * @param fromDate UTC midnight of the first company-local night to fill
 * @param days number of nights to fill
 */
export async function generateAssociateShifts(params: {
  companyId: string
  fromDate: Date
  days: number
  assignmentId?: string
}): Promise<AssociateShiftResult> {
  const { companyId, fromDate, days } = params
  const toDate = new Date(fromDate.getTime() + days * DAY_MS)

  // Staffing math needs every active assignment at the affected locations,
  // even when only one assignment is being (re)generated.
  let locationFilter: { locationId?: string } = {}
  if (params.assignmentId) {
    const target = await prisma.locationAssignment.findUnique({
      where: { id: params.assignmentId },
      select: { locationId: true },
    })
    if (!target) return { assignmentsConsidered: 0, created: 0, skippedExisting: 0, skippedIncomplete: 0 }
    locationFilter = { locationId: target.locationId }
  }

  const assignments = await prisma.locationAssignment.findMany({
    where: {
      ...locationFilter,
      isActive: true,
      startDate: { lt: toDate },
      OR: [{ endDate: null }, { endDate: { gte: fromDate } }],
      user: { isActive: true },
      location: { isActive: true, deletedAt: null, client: { companyId, deletedAt: null } },
    },
    select: {
      id: true,
      userId: true,
      locationId: true,
      startDate: true,
      endDate: true,
      daysOfWeek: true,
      cleaningWindowStart: true,
      cleaningWindowEnd: true,
      location: { select: { branchId: true } },
    },
  })

  const result: AssociateShiftResult = {
    assignmentsConsidered: params.assignmentId ? 1 : assignments.length,
    created: 0,
    skippedExisting: 0,
    skippedIncomplete: 0,
  }
  if (assignments.length === 0) return result

  // Every crew shift at these locations (including substitutes who have no
  // assignment there) counts toward a night being staffed.
  const locationIds = [...new Set(assignments.map(a => a.locationId))]
  const existing = await prisma.shift.findMany({
    where: {
      date: { gte: fromDate, lt: toDate },
      associateId: { not: null },
      OR: [{ locationId: { in: locationIds } }, { shiftLocations: { some: { locationId: { in: locationIds } } } }],
    },
    select: {
      associateId: true,
      date: true,
      locationId: true,
      shiftLocations: { select: { locationId: true } },
    },
  })
  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const taken = new Set<string>() // associate|location|night
  const filled = new Map<string, number>() // location|night -> crew shifts
  for (const s of existing) {
    const locs = s.shiftLocations.length ? s.shiftLocations.map(l => l.locationId) : s.locationId ? [s.locationId] : []
    for (const l of locs) {
      taken.add(`${s.associateId}|${l}|${dayKey(s.date)}`)
      filled.set(`${l}|${dayKey(s.date)}`, (filled.get(`${l}|${dayKey(s.date)}`) ?? 0) + 1)
    }
  }
  // How many assignments want each location/night.
  const wanted = new Map<string, number>()
  for (const a of assignments) {
    if (!a.daysOfWeek.length || !a.cleaningWindowStart || !a.cleaningWindowEnd) continue
    for (let i = 0; i < days; i++) {
      const date = new Date(fromDate.getTime() + i * DAY_MS)
      if (!a.daysOfWeek.includes(date.getUTCDay())) continue
      if (a.startDate.getTime() > date.getTime() + DAY_MS - 1) continue
      if (a.endDate && a.endDate.getTime() < date.getTime()) continue
      const k = `${a.locationId}|${dayKey(date)}`
      wanted.set(k, (wanted.get(k) ?? 0) + 1)
    }
  }

  const toCreate: Array<{
    locationId: string
    branchId: string
    associateId: string
    date: Date
    startTime: string
    endTime: string
    status: string
    notes: string
  }> = []

  for (const a of assignments) {
    if (params.assignmentId && a.id !== params.assignmentId) continue
    if (!a.daysOfWeek.length || !a.cleaningWindowStart || !a.cleaningWindowEnd) {
      result.skippedIncomplete++
      continue
    }
    for (let i = 0; i < days; i++) {
      const date = new Date(fromDate.getTime() + i * DAY_MS)
      if (!a.daysOfWeek.includes(date.getUTCDay())) continue
      if (a.startDate.getTime() > date.getTime() + DAY_MS - 1) continue
      if (a.endDate && a.endDate.getTime() < date.getTime()) continue
      const key = `${a.userId}|${a.locationId}|${dayKey(date)}`
      const slot = `${a.locationId}|${dayKey(date)}`
      // Already has a shift, or the night is fully staffed (e.g. a manager
      // gave this associate's shift to a substitute).
      if (taken.has(key) || (filled.get(slot) ?? 0) >= (wanted.get(slot) ?? 0)) {
        result.skippedExisting++
        continue
      }
      taken.add(key)
      filled.set(slot, (filled.get(slot) ?? 0) + 1)
      toCreate.push({
        locationId: a.locationId,
        branchId: a.location.branchId,
        associateId: a.userId,
        date,
        startTime: a.cleaningWindowStart,
        endTime: a.cleaningWindowEnd,
        status: 'scheduled',
        notes: AUTO_ASSOCIATE_NOTE,
      })
    }
  }

  if (toCreate.length) {
    const { count } = await prisma.shift.createMany({ data: toCreate })
    result.created = count
  }
  return result
}

/**
 * After an assignment changes (nights, hours, end date, deactivated, deleted),
 * drop its future auto-generated shifts that nobody has touched (still
 * scheduled, no visit logged) and regenerate from the current schedule.
 */
export async function reconcileAssignmentShifts(params: {
  companyId: string
  associateId: string
  locationId: string
  fromDate: Date
  assignmentId?: string // omit when the assignment was deleted
  days?: number
}) {
  const { count: removed } = await prisma.shift.deleteMany({
    where: {
      associateId: params.associateId,
      locationId: params.locationId,
      date: { gte: params.fromDate },
      status: 'scheduled',
      notes: AUTO_ASSOCIATE_NOTE,
      serviceLogs: { none: {} },
    },
  })
  const regenerated = params.assignmentId
    ? await generateAssociateShifts({
        companyId: params.companyId,
        fromDate: params.fromDate,
        days: params.days ?? 14,
        assignmentId: params.assignmentId,
      })
    : null
  return { removed, created: regenerated?.created ?? 0 }
}
