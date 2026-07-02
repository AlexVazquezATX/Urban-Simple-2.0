import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/operations/clock
// Captures the actual hours worked for a shift+location by writing
// ServiceLog.clockIn / clockOut. This is the source of truth the workforce
// compliance math consumes, so it must be correct and tamper-resistant:
// the caller can only clock in/out on a shift they are personally assigned to.
//
// Body: { shiftId: string, locationId: string, action: 'in' | 'out' }
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { shiftId, locationId, action } = body as {
      shiftId?: string
      locationId?: string
      action?: string
    }

    if (!shiftId || !locationId || (action !== 'in' && action !== 'out')) {
      return NextResponse.json(
        { error: 'shiftId, locationId and action ("in" | "out") are required' },
        { status: 400 }
      )
    }

    // Load the shift and scope it to this user: they must be the assigned
    // associate or the assigned manager. Anyone else (or another company)
    // gets a 404 so we never leak shift existence.
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        branch: { companyId: user.companyId },
        OR: [{ associateId: user.id }, { managerId: user.id }],
      },
      include: {
        shiftLocations: { select: { locationId: true } },
        location: { select: { id: true, checklistTemplateId: true } },
      },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found or not assigned to you' },
        { status: 404 }
      )
    }

    // The location must actually belong to this shift (single-location shift
    // or one of the route stops).
    const shiftLocationIds = shift.shiftLocations.length > 0
      ? shift.shiftLocations.map(sl => sl.locationId)
      : shift.location
        ? [shift.location.id]
        : []

    if (!shiftLocationIds.includes(locationId)) {
      return NextResponse.json(
        { error: 'Location is not part of this shift' },
        { status: 400 }
      )
    }

    // Resolve the checklist template for this location so a freshly-created
    // ServiceLog is linked to the template the associate is running.
    const location = await prisma.location.findFirst({
      where: { id: locationId, branch: { companyId: user.companyId } },
      select: { id: true, checklistTemplateId: true },
    })
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // One ServiceLog per shift+location for this associate.
    const existing = await prisma.serviceLog.findFirst({
      where: { shiftId: shift.id, locationId, associateId: user.id },
    })

    const now = new Date()

    if (action === 'in') {
      if (existing?.clockIn) {
        return NextResponse.json(
          { error: 'Already clocked in for this stop' },
          { status: 409 }
        )
      }

      const log = existing
        ? await prisma.serviceLog.update({
            where: { id: existing.id },
            data: { clockIn: now, status: 'in_progress' },
          })
        : await prisma.serviceLog.create({
            data: {
              shiftId: shift.id,
              locationId,
              associateId: user.id,
              checklistTemplateId: location.checklistTemplateId,
              serviceDate: shift.date,
              clockIn: now,
              status: 'in_progress',
            },
          })

      // Mark the shift underway once work actually starts.
      if (shift.status === 'scheduled') {
        await prisma.shift.update({
          where: { id: shift.id },
          data: { status: 'in_progress' },
        })
      }

      return NextResponse.json({
        id: log.id,
        clockIn: log.clockIn?.toISOString() ?? null,
        clockOut: log.clockOut?.toISOString() ?? null,
        status: log.status,
      })
    }

    // action === 'out'
    if (!existing || !existing.clockIn) {
      return NextResponse.json(
        { error: 'You must clock in before clocking out' },
        { status: 409 }
      )
    }
    if (existing.clockOut) {
      return NextResponse.json(
        { error: 'Already clocked out for this stop' },
        { status: 409 }
      )
    }
    if (now.getTime() < existing.clockIn.getTime()) {
      return NextResponse.json(
        { error: 'Clock-out cannot be before clock-in' },
        { status: 400 }
      )
    }

    const log = await prisma.serviceLog.update({
      where: { id: existing.id },
      data: { clockOut: now },
    })

    return NextResponse.json({
      id: log.id,
      clockIn: log.clockIn?.toISOString() ?? null,
      clockOut: log.clockOut?.toISOString() ?? null,
      status: log.status,
    })
  } catch (error) {
    console.error('Error recording clock event:', error)
    return NextResponse.json(
      { error: 'Failed to record clock event' },
      { status: 500 }
    )
  }
}
