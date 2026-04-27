import { NextRequest, NextResponse } from 'next/server'
import { startOfDay } from 'date-fns'
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
    const locationId =
      typeof body.locationId === 'string' && body.locationId.trim() !== ''
        ? body.locationId
        : null
    const managerOverrideId =
      typeof body.managerId === 'string' && body.managerId.trim() !== ''
        ? body.managerId
        : null
    const routeDate = body.date ? startOfDay(new Date(body.date)) : null

    if (!locationId || !routeDate || Number.isNaN(routeDate.getTime())) {
      return NextResponse.json(
        { error: 'Location and valid route date are required' },
        { status: 400 }
      )
    }

    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        isActive: true,
        client: {
          companyId: user.companyId,
          ...(user.branchId && { branchId: user.branchId }),
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
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    if (!location.serviceProfile?.autoSchedule) {
      return NextResponse.json(
        { error: 'Location is not configured for auto-routing' },
        { status: 400 }
      )
    }

    const profile = normalizeServiceProfile(location.serviceProfile)
    const managerId = managerOverrideId || profile.defaultManagerId

    if (!managerId) {
      return NextResponse.json(
        { error: 'No manager is available for this location' },
        { status: 400 }
      )
    }

    if (
      !shouldScheduleOnDate(
        profile,
        location.serviceProfile?.createdAt || location.createdAt,
        routeDate
      )
    ) {
      return NextResponse.json(
        { error: 'This location is not due for service on the selected date' },
        { status: 400 }
      )
    }

    const timeWindow = getDefaultDispatchWindow(profile)
    const existingShift = await prisma.shift.findFirst({
      where: {
        branchId: location.branchId,
        managerId,
        date: routeDate,
      },
      include: {
        shiftLocations: {
          select: {
            locationId: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    if (existingShift) {
      const alreadyExists = existingShift.shiftLocations.some(
        (stop) => stop.locationId === location.id
      )

      if (alreadyExists) {
        return NextResponse.json({
          success: true,
          action: 'unchanged',
          shiftId: existingShift.id,
          message: 'Route already covers this location',
        })
      }

      await prisma.shiftLocation.create({
        data: {
          shiftId: existingShift.id,
          locationId: location.id,
          sortOrder: existingShift.shiftLocations.length,
        },
      })

      if (!existingShift.locationId) {
        await prisma.shift.update({
          where: { id: existingShift.id },
          data: {
            locationId: location.id,
          },
        })
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        shiftId: existingShift.id,
        message: 'Location added to existing manager route',
      })
    }

    const createdShift = await prisma.shift.create({
      data: {
        locationId: location.id,
        branchId: location.branchId,
        managerId,
        date: routeDate,
        startTime: timeWindow.startTime,
        endTime: timeWindow.endTime,
        notes: 'Auto-generated manager review route',
        status: 'scheduled',
        shiftLocations: {
          create: {
            locationId: location.id,
            sortOrder: 0,
          },
        },
      },
      select: {
        id: true,
      },
    })

    return NextResponse.json({
      success: true,
      action: 'created',
      shiftId: createdShift.id,
      message: 'Manager route created',
    })
  } catch (error: unknown) {
    console.error('Dispatch route creation failed:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create manager route',
      },
      { status: 500 }
    )
  }
}
