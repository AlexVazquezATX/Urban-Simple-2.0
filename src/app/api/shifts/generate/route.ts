import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateRecurringShifts, RecurringPattern } from '@/lib/operations/shift-generator'

// POST /api/shifts/generate - Generate recurring shifts
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      locationId,
      associateId,
      managerId,
      recurringPattern,
      notes,
      rangeStart,
      rangeEnd,
    } = body

    if (!locationId || !associateId || !recurringPattern || !rangeStart || !rangeEnd) {
      return NextResponse.json(
        {
          error:
            'Location, associate, recurring pattern, range start, and range end are required',
        },
        { status: 400 }
      )
    }

    // Verify location belongs to user's company
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
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

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check for existing shifts in the range to avoid duplicates
    const existingShifts = await prisma.shift.findMany({
      where: {
        locationId,
        associateId,
        date: {
          gte: new Date(rangeStart),
          lte: new Date(rangeEnd),
        },
      },
      select: {
        date: true,
      },
    })

    const existingDates = new Set(
      existingShifts.map((s) => s.date.toISOString().split('T')[0])
    )

    // Generate shifts
    const generatedShifts = generateRecurringShifts(
      {
        locationId,
        branchId: location.branchId,
        associateId,
        managerId,
        recurringPattern: recurringPattern as RecurringPattern,
        notes,
      },
      new Date(rangeStart),
      new Date(rangeEnd)
    )

    // Filter out shifts that already exist
    const newShifts = generatedShifts.filter((shift) => {
      const shiftDate = shift.date.toISOString().split('T')[0]
      return !existingDates.has(shiftDate)
    })

    if (newShifts.length === 0) {
      return NextResponse.json({
        message: 'No new shifts to create (all dates already have shifts)',
        created: 0,
        skipped: generatedShifts.length,
      })
    }

    // Create shifts in bulk
    const created = await prisma.shift.createMany({
      data: newShifts.map((shift) => ({
        locationId: shift.locationId,
        branchId: shift.branchId,
        associateId: shift.associateId,
        managerId: shift.managerId || null,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isRecurring: shift.isRecurring,
        recurringPattern: shift.recurringPattern as any,
        notes: shift.notes || null,
        status: shift.status,
      })),
    })

    return NextResponse.json({
      message: `Created ${created.count} shift(s)`,
      created: created.count,
      skipped: generatedShifts.length - created.count,
    })
  } catch (error: any) {
    console.error('Error generating shifts:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate shifts' },
      { status: 500 }
    )
  }
}

