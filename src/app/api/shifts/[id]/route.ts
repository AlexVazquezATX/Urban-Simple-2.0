import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/shifts/[id] - Get shift details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        branch: {
          companyId: user.companyId,
        },
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
        shiftLocations: {
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
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
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
        serviceLogs: {
          select: {
            id: true,
            serviceDate: true,
            status: true,
          },
        },
      },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error fetching shift:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shift' },
      { status: 500 }
    )
  }
}

// PUT /api/shifts/[id] - Update shift
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify shift belongs to user's company
    const existing = await prisma.shift.findFirst({
      where: {
        id,
        branch: {
          companyId: user.companyId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
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
      status,
    } = body

    // Determine locationIds for update
    const finalLocationIds = locationIds || (locationId ? [locationId] : undefined)
    const firstLocationId = finalLocationIds && finalLocationIds.length > 0 ? finalLocationIds[0] : null

    // If locationIds provided, verify all locations belong to user's company and update shiftLocations
    if (finalLocationIds !== undefined) {
      // Verify locations belong to user's company
      if (finalLocationIds.length > 0) {
        const locations = await prisma.location.findMany({
          where: {
            id: { in: finalLocationIds },
            client: {
              branch: {
                companyId: user.companyId,
              },
            },
          },
        })

        if (locations.length !== finalLocationIds.length) {
          return NextResponse.json(
            { error: 'One or more locations not found or not accessible' },
            { status: 404 }
          )
        }
      }

      // Delete existing shift locations
      await prisma.shiftLocation.deleteMany({
        where: { shiftId: id },
      })

      // Create new shift locations
      if (finalLocationIds.length > 0) {
        await prisma.shiftLocation.createMany({
          data: finalLocationIds.map((locId: string, index: number) => ({
            shiftId: id,
            locationId: locId,
            sortOrder: index,
          })),
        })
      }
    }

    const shift = await prisma.shift.update({
      where: {
        id,
      },
      data: {
        ...(locationIds !== undefined && { locationId: firstLocationId }),
        ...(locationId !== undefined && { locationId }),
        ...(associateId !== undefined && { associateId: associateId || null }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(isRecurring !== undefined && { isRecurring }),
        ...(recurringPattern !== undefined && { recurringPattern: recurringPattern || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(status !== undefined && { status }),
        updatedAt: new Date(),
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
        shiftLocations: {
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
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
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

    return NextResponse.json(shift)
  } catch (error) {
    console.error('Error updating shift:', error)
    return NextResponse.json(
      { error: 'Failed to update shift' },
      { status: 500 }
    )
  }
}

// DELETE /api/shifts/[id] - Delete shift
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify shift belongs to user's company
    const existing = await prisma.shift.findFirst({
      where: {
        id,
        branch: {
          companyId: user.companyId,
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Shift not found' },
        { status: 404 }
      )
    }

    await prisma.shift.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting shift:', error)
    return NextResponse.json(
      { error: 'Failed to delete shift' },
      { status: 500 }
    )
  }
}

