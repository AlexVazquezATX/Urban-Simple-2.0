import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/shifts - List shifts with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const locationId = searchParams.get('locationId')
    const associateId = searchParams.get('associateId')
    const status = searchParams.get('status')

    const shifts = await prisma.shift.findMany({
      where: {
        branch: {
          companyId: user.companyId,
          ...(user.branchId && { id: user.branchId }),
        },
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
        ...(locationId && { locationId }),
        ...(associateId && { associateId }),
        ...(status && { status }),
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // shiftLocations will be available after Prisma client regeneration
        // shiftLocations: {
        //   include: {
        //     location: {
        //       select: {
        //         id: true,
        //         name: true,
        //         client: {
        //           select: {
        //             id: true,
        //             name: true,
        //           },
        //         },
        //       },
        //     },
        //   },
        //   orderBy: {
        //     sortOrder: 'asc',
        //   },
        // },
        associate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            serviceLogs: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

// POST /api/shifts - Create shift(s)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      locationIds,
      locationId, // Backward compatibility
      associateId,
      managerId,
      date,
      startTime,
      endTime,
      isRecurring,
      recurringPattern,
      notes,
      status = 'scheduled',
    } = body

    // Support both locationIds array and single locationId for backward compatibility
    const finalLocationIds = locationIds || (locationId ? [locationId] : [])

    if (
      !finalLocationIds ||
      finalLocationIds.length === 0 ||
      (!associateId && !managerId) ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        {
          error:
            'At least one location, associate or manager, date, start time, and end time are required',
        },
        { status: 400 }
      )
    }

    // Verify all locations belong to user's company and get branch
    const locations = await prisma.location.findMany({
      where: {
        id: { in: finalLocationIds },
        client: {
          branch: {
            companyId: user.companyId,
            ...(user.branchId && { id: user.branchId }),
          },
        },
      },
      include: {
        branch: true,
      },
    })

    if (locations.length !== finalLocationIds.length) {
      return NextResponse.json(
        { error: 'One or more locations not found or not accessible' },
        { status: 404 }
      )
    }

    // Use the branch from the first location
    const branchId = locations[0].branchId

    // Create shift with first locationId for now (will support multiple after migration)
    // For manager shifts with multiple locations, we'll store the first one in locationId
    // After migration, we'll create ShiftLocation entries for all locations
    const shift = await prisma.shift.create({
      data: {
        locationId: finalLocationIds[0] || null, // Store first location for now
        branchId,
        associateId: associateId || null,
        managerId: managerId || null,
        date: new Date(date),
        startTime,
        endTime,
        isRecurring: isRecurring || false,
        recurringPattern: recurringPattern || null,
        notes: notes || null,
        status,
        // TODO: After migration, uncomment to create ShiftLocation entries
        // shiftLocations: {
        //   create: finalLocationIds.map((locId: string, index: number) => ({
        //     locationId: locId,
        //     sortOrder: index,
        //   })),
        // },
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        // shiftLocations will be available after Prisma client regeneration
        // shiftLocations: {
        //   include: {
        //     location: {
        //       select: {
        //         id: true,
        //         name: true,
        //         client: {
        //           select: {
        //             id: true,
        //             name: true,
        //           },
        //         },
        //       },
        //     },
        //   },
        //   orderBy: {
        //     sortOrder: 'asc',
        //   },
        // },
        associate: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error('Error creating shift:', error)
    return NextResponse.json(
      { error: 'Failed to create shift' },
      { status: 500 }
    )
  }
}

