import { NextRequest, NextResponse } from 'next/server'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  getDefaultDispatchWindow,
  normalizeServiceProfile,
  shouldScheduleOnDate,
} from '@/lib/operations/dispatch'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const rangeStart = body.rangeStart ? startOfDay(new Date(body.rangeStart)) : startOfDay(new Date())
    const rangeEnd = body.rangeEnd ? endOfDay(new Date(body.rangeEnd)) : endOfDay(addDays(rangeStart, 6))

    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
    }

    const locations = await prisma.location.findMany({
      where: {
        isActive: true,
        client: {
          companyId: user.companyId,
          ...(user.branchId && { branchId: user.branchId }),
        },
        serviceProfile: {
          is: {
            autoSchedule: true,
          },
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
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
    const skippedLocations: Array<{ locationId: string; locationName: string; reason: string }> = []

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

      let cursor = startOfDay(rangeStart)
      while (cursor <= rangeEnd) {
        if (shouldScheduleOnDate(profile, location.serviceProfile?.createdAt || location.createdAt, cursor)) {
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

    const existingShifts = await prisma.shift.findMany({
      where: {
        managerId: {
          not: null,
        },
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
        branch: {
          companyId: user.companyId,
        },
      },
      include: {
        shiftLocations: {
          select: {
            locationId: true,
            sortOrder: true,
          },
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
        const [managerId, branchId, dateKey] = bucketKey.split(':')
        const routeDate = startOfDay(new Date(`${dateKey}T00:00:00`))
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
              branchId,
              managerId,
              date: routeDate,
              startTime: timeWindow.startTime,
              endTime: timeWindow.endTime,
              notes: 'Auto-generated manager review route',
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
            data: {
              locationId: firstStop.locationId,
            },
          })
        }

        updatedRoutes += 1
        addedStops += missingStops.length
      }
    })

    return NextResponse.json({
      success: true,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: rangeEnd.toISOString(),
      createdRoutes,
      updatedRoutes,
      addedStops,
      skippedLocations,
    })
  } catch (error: unknown) {
    console.error('Dispatch generation failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate dispatch routes',
      },
      { status: 500 }
    )
  }
}
