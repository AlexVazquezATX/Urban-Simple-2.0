import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { reconcileAssignmentShifts } from '@/lib/operations/associate-shift-generator'
import { getOperationalWindow } from '@/lib/ops/field'

// PUT /api/location-assignments/[id] - Update location assignment
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

    // Verify assignment belongs to user's company
    const existing = await prisma.locationAssignment.findFirst({
      where: {
        id,
        location: {
          client: {
            branch: {
              companyId: user.companyId,
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Location assignment not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    // Pay is admin-only; managers may adjust schedule fields (workforce view).
    if (
      body.monthlyPay !== undefined &&
      parseFloat(String(body.monthlyPay)) !== Number(existing.monthlyPay) &&
      !['SUPER_ADMIN', 'ADMIN'].includes(user.role)
    ) {
      return NextResponse.json({ error: 'Only admins can change pay' }, { status: 403 })
    }
    const {
      monthlyPay, startDate, endDate, isActive,
      estimatedHoursPerVisit, cleaningWindowStart, cleaningWindowEnd,
      daysOfWeek, nightsPerWeek,
    } = body

    const assignment = await prisma.locationAssignment.update({
      where: {
        id,
      },
      data: {
        ...(monthlyPay !== undefined && { monthlyPay: parseFloat(monthlyPay.toString()) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive !== undefined && { isActive }),
        ...(estimatedHoursPerVisit !== undefined && { estimatedHoursPerVisit: estimatedHoursPerVisit ? parseFloat(estimatedHoursPerVisit.toString()) : null }),
        ...(cleaningWindowStart !== undefined && { cleaningWindowStart: cleaningWindowStart || null }),
        ...(cleaningWindowEnd !== undefined && { cleaningWindowEnd: cleaningWindowEnd || null }),
        ...(daysOfWeek !== undefined && { daysOfWeek }),
        ...(nightsPerWeek !== undefined && { nightsPerWeek: nightsPerWeek ?? null }),
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
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    })

    // Schedule changed: replace untouched future auto shifts so nobody is
    // left with phantom stops (and phantom no-show alerts).
    const scheduleChanged = ['daysOfWeek', 'cleaningWindowStart', 'cleaningWindowEnd', 'startDate', 'endDate', 'isActive']
      .some(k => body[k] !== undefined)
    if (scheduleChanged) {
      try {
        const { today } = await getOperationalWindow(user.companyId, user.branchId)
        await reconcileAssignmentShifts({
          companyId: user.companyId,
          associateId: existing.userId,
          locationId: existing.locationId,
          fromDate: today,
          assignmentId: assignment.isActive ? assignment.id : undefined,
        })
      } catch (err) {
        console.error('[location-assignments] shift reconcile failed:', err)
      }
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error updating location assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update location assignment' },
      { status: 500 }
    )
  }
}

// DELETE /api/location-assignments/[id] - Delete location assignment
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
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Only admins can remove assignments' }, { status: 403 })
    }

    // Verify assignment belongs to user's company
    const existing = await prisma.locationAssignment.findFirst({
      where: {
        id,
        location: {
          client: {
            branch: {
              companyId: user.companyId,
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Location assignment not found' },
        { status: 404 }
      )
    }

    await prisma.locationAssignment.delete({
      where: {
        id,
      },
    })

    try {
      const { today } = await getOperationalWindow(user.companyId, user.branchId)
      await reconcileAssignmentShifts({
        companyId: user.companyId,
        associateId: existing.userId,
        locationId: existing.locationId,
        fromDate: today,
      })
    } catch (err) {
      console.error('[location-assignments] shift cleanup failed:', err)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting location assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete location assignment' },
      { status: 500 }
    )
  }
}

