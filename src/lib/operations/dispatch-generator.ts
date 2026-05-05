import { addDays, startOfDay } from 'date-fns'
import { prisma } from '@/lib/db'
import {
  getCadenceAnchor,
  getDefaultDispatchWindow,
  normalizeServiceProfile,
  parseDateOnly,
  shouldScheduleOnDate,
} from '@/lib/operations/dispatch'

export const AUTO_GENERATED_NOTE = 'Auto-generated manager review route'

export interface GenerateDispatchArgs {
  companyId: string
  branchId?: string | null
  rangeStart: Date
  rangeEnd: Date
}

export interface GenerateDispatchResult {
  rangeStart: string
  rangeEnd: string
  createdRoutes: number
  updatedRoutes: number
  addedStops: number
  prunedStops: number
  prunedShifts: number
  skippedLocations: Array<{
    locationId: string
    locationName: string
    reason: string
  }>
}

/**
 * Generate (or refresh) auto-scheduled dispatch shifts for a company within a
 * date range. Used by both the user-triggered "Generate Dispatch" button and
 * the weekly Vercel cron that pre-builds next week's routes.
 *
 * Behavior:
 *   1. CLEANUP: prunes stale stops on auto-generated shifts where the
 *      underlying location no longer justifies the stop (auto-schedule turned
 *      off, manager reassigned, or no longer due on this date under the
 *      cadence). Empty auto-shifts are deleted.
 *   2. BUCKETING: groups locations by (defaultManager, branch, date).
 *   3. CREATE/UPDATE: idempotent — creates a shift if missing, only adds
 *      missing stops if the shift already exists.
 */
export async function generateDispatchForCompany(
  args: GenerateDispatchArgs
): Promise<GenerateDispatchResult> {
  const { companyId, branchId, rangeStart, rangeEnd } = args

  const locations = await prisma.location.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      client: {
        companyId,
        deletedAt: null,
        ...(branchId && { branchId }),
      },
      serviceProfile: {
        is: {
          autoSchedule: true,
        },
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      serviceProfile: {
        include: {
          defaultManager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      },
    },
    orderBy: [
      { branchId: 'asc' },
      { client: { name: 'asc' } },
      { name: 'asc' },
    ],
  })

  const routeBuckets = new Map<
    string,
    Array<{
      locationId: string
      branchId: string
      sortOrder: number
      routePriority: number
      name: string
    }>
  >()
  const skippedLocations: GenerateDispatchResult['skippedLocations'] = []

  for (const location of locations) {
    const profile = normalizeServiceProfile(location.serviceProfile)

    if (!profile.defaultManagerId) {
      skippedLocations.push({
        locationId: location.id,
        locationName: location.name,
        reason: 'No default manager assigned',
      })
      continue
    }

    const cadenceAnchor = getCadenceAnchor({
      serviceAnchorDate: location.serviceProfile?.serviceAnchorDate,
      serviceProfileCreatedAt: location.serviceProfile?.createdAt,
      locationCreatedAt: location.createdAt,
    })

    let cursor = startOfDay(rangeStart)
    while (cursor <= rangeEnd) {
      if (shouldScheduleOnDate(profile, cadenceAnchor, cursor)) {
        const bucketKey = `${profile.defaultManagerId}:${location.branchId}:${cursor.toISOString().split('T')[0]}`
        const bucket = routeBuckets.get(bucketKey) || []
        bucket.push({
          locationId: location.id,
          branchId: location.branchId,
          sortOrder: bucket.length,
          routePriority: profile.routePriority,
          name: location.name,
        })
        routeBuckets.set(bucketKey, bucket)
      }

      cursor = addDays(cursor, 1)
    }
  }

  // Cleanup pass: prune stale stops on previously-auto shifts.
  const autoShiftsForCleanup = await prisma.shift.findMany({
    where: {
      notes: AUTO_GENERATED_NOTE,
      managerId: { not: null },
      date: { gte: rangeStart, lte: rangeEnd },
      branch: { companyId },
    },
    include: {
      shiftLocations: {
        include: {
          location: {
            include: { serviceProfile: true },
          },
        },
      },
    },
  })

  let prunedStops = 0
  let prunedShifts = 0

  for (const shift of autoShiftsForCleanup) {
    const stopIdsToRemove: string[] = []
    const remainingLocationIds: string[] = []

    for (const stop of shift.shiftLocations) {
      const profile = normalizeServiceProfile(stop.location.serviceProfile)
      const stillAutoScheduled = stop.location.serviceProfile?.autoSchedule === true
      const managerStillMatches = stop.location.serviceProfile?.defaultManagerId === shift.managerId
      const stillDueOnDate = shouldScheduleOnDate(
        profile,
        getCadenceAnchor({
          serviceAnchorDate: stop.location.serviceProfile?.serviceAnchorDate,
          serviceProfileCreatedAt: stop.location.serviceProfile?.createdAt,
          locationCreatedAt: stop.location.createdAt,
        }),
        shift.date
      )

      const stopIsStale = !stillAutoScheduled || !managerStillMatches || !stillDueOnDate

      if (stopIsStale) {
        stopIdsToRemove.push(stop.id)
      } else {
        remainingLocationIds.push(stop.locationId)
      }
    }

    if (stopIdsToRemove.length === 0) {
      continue
    }

    await prisma.shiftLocation.deleteMany({
      where: { id: { in: stopIdsToRemove } },
    })
    prunedStops += stopIdsToRemove.length

    if (shift.locationId && !remainingLocationIds.includes(shift.locationId)) {
      await prisma.shift.update({
        where: { id: shift.id },
        data: { locationId: remainingLocationIds[0] || null },
      })
    }

    if (remainingLocationIds.length === 0) {
      await prisma.shift.delete({ where: { id: shift.id } })
      prunedShifts += 1
    }
  }

  const existingShifts = await prisma.shift.findMany({
    where: {
      managerId: { not: null },
      date: { gte: rangeStart, lte: rangeEnd },
      branch: { companyId },
    },
    include: {
      shiftLocations: {
        select: { locationId: true, sortOrder: true },
      },
    },
  })

  const existingShiftMap = new Map(
    existingShifts.map((shift) => [
      `${shift.managerId}:${shift.branchId}:${shift.date.toISOString().split('T')[0]}`,
      shift,
    ])
  )

  let createdRoutes = 0
  let updatedRoutes = 0
  let addedStops = 0

  await prisma.$transaction(async (tx) => {
    for (const [bucketKey, rawStops] of routeBuckets.entries()) {
      const [managerId, branchKey, dateKey] = bucketKey.split(':')
      const routeDate = parseDateOnly(dateKey)
      const sortedStops = [...rawStops].sort((a, b) => {
        if (a.routePriority !== b.routePriority) {
          return a.routePriority - b.routePriority
        }
        return a.name.localeCompare(b.name)
      })

      if (sortedStops.length === 0) {
        continue
      }

      const firstStop = sortedStops[0]
      const profile = normalizeServiceProfile(
        locations.find((location) => location.id === firstStop.locationId)?.serviceProfile
      )
      const timeWindow = getDefaultDispatchWindow(profile)

      const existingShift = existingShiftMap.get(bucketKey)

      if (!existingShift) {
        await tx.shift.create({
          data: {
            locationId: firstStop.locationId,
            branchId: branchKey,
            managerId,
            date: routeDate,
            startTime: timeWindow.startTime,
            endTime: timeWindow.endTime,
            notes: AUTO_GENERATED_NOTE,
            status: 'scheduled',
            shiftLocations: {
              create: sortedStops.map((stop, index) => ({
                locationId: stop.locationId,
                sortOrder: index,
              })),
            },
          },
        })
        createdRoutes += 1
        addedStops += sortedStops.length
        continue
      }

      const existingLocationIds = new Set(existingShift.shiftLocations.map((stop) => stop.locationId))
      const missingStops = sortedStops.filter((stop) => !existingLocationIds.has(stop.locationId))

      if (missingStops.length === 0) {
        continue
      }

      await tx.shiftLocation.createMany({
        data: missingStops.map((stop, index) => ({
          shiftId: existingShift.id,
          locationId: stop.locationId,
          sortOrder: existingShift.shiftLocations.length + index,
        })),
      })

      if (!existingShift.locationId) {
        await tx.shift.update({
          where: { id: existingShift.id },
          data: { locationId: firstStop.locationId },
        })
      }

      updatedRoutes += 1
      addedStops += missingStops.length
    }
  })

  return {
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    createdRoutes,
    updatedRoutes,
    addedStops,
    prunedStops,
    prunedShifts,
    skippedLocations,
  }
}
