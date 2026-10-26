// Builds associate shifts from LocationAssignment schedules so nobody has to
// hand-enter every night. An assignment with daysOfWeek + a cleaning window
// produces one shift per matching night. Idempotent: a shift that already
// exists for that associate/location/night (in any status, including
// cancelled) is never recreated, so manual edits and cancellations stick.

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

  const assignments = await prisma.locationAssignment.findMany({
    where: {
      ...(params.assignmentId ? { id: params.assignmentId } : {}),
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
    assignmentsConsidered: assignments.length,
    created: 0,
    skippedExisting: 0,
    skippedIncomplete: 0,
  }
  if (assignments.length === 0) return result

  const existing = await prisma.shift.findMany({
    where: {
      date: { gte: fromDate, lt: toDate },
      associateId: { in: [...new Set(assignments.map(a => a.userId))] },
    },
    select: {
      associateId: true,
      date: true,
      locationId: true,
      shiftLocations: { select: { locationId: true } },
    },
  })
  const taken = new Set<string>()
  for (const s of existing) {
    const locs = s.shiftLocations.length ? s.shiftLocations.map(l => l.locationId) : s.locationId ? [s.locationId] : []
    for (const l of locs) taken.add(`${s.associateId}|${l}|${s.date.toISOString().slice(0, 10)}`)
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
    if (!a.daysOfWeek.length || !a.cleaningWindowStart || !a.cleaningWindowEnd) {
      result.skippedIncomplete++
      continue
    }
    for (let i = 0; i < days; i++) {
      const date = new Date(fromDate.getTime() + i * DAY_MS)
      if (!a.daysOfWeek.includes(date.getUTCDay())) continue
      if (a.startDate.getTime() > date.getTime() + DAY_MS - 1) continue
      if (a.endDate && a.endDate.getTime() < date.getTime()) continue
      const key = `${a.userId}|${a.locationId}|${date.toISOString().slice(0, 10)}`
      if (taken.has(key)) {
        result.skippedExisting++
        continue
      }
      taken.add(key)
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
