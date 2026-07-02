import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/checklists/[id]/complete
// Records a field completion of a checklist template for a specific shift+location.
// `id` is the ChecklistTemplate id. This writes the checked-off item state onto
// the ServiceLog (checklistData) and marks it completed/partial. It never mutates
// the company template itself — associates run the template, they do not edit it.
//
// Body: {
//   shiftId: string,
//   locationId: string,
//   checklistData?: Record<string, boolean>,   // itemId -> checked
//   priorityItemsCompleted?: string[],
//   overallNotes?: string,
//   photos?: string[],
//   status?: 'completed' | 'partial',
// }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const {
      shiftId,
      locationId,
      checklistData,
      priorityItemsCompleted,
      overallNotes,
      photos,
      status,
    } = body as {
      shiftId?: string
      locationId?: string
      checklistData?: Record<string, boolean>
      priorityItemsCompleted?: string[]
      overallNotes?: string
      photos?: string[]
      status?: string
    }

    if (!shiftId || !locationId) {
      return NextResponse.json(
        { error: 'shiftId and locationId are required' },
        { status: 400 }
      )
    }

    // Template must belong to this company (read-only ownership check).
    const template = await prisma.checklistTemplate.findFirst({
      where: { id: templateId, companyId: user.companyId },
      select: { id: true },
    })
    if (!template) {
      return NextResponse.json(
        { error: 'Checklist template not found' },
        { status: 404 }
      )
    }

    // Scope the shift to this user (assigned associate or manager).
    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        branch: { companyId: user.companyId },
        OR: [{ associateId: user.id }, { managerId: user.id }],
      },
      include: {
        shiftLocations: { select: { locationId: true } },
        location: { select: { id: true } },
      },
    })
    if (!shift) {
      return NextResponse.json(
        { error: 'Shift not found or not assigned to you' },
        { status: 404 }
      )
    }

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

    const nextStatus = status === 'partial' ? 'partial' : 'completed'

    const data = {
      ...(checklistData !== undefined ? { checklistData } : {}),
      ...(priorityItemsCompleted !== undefined
        ? { priorityItemsCompleted }
        : {}),
      ...(overallNotes !== undefined
        ? { overallNotes: overallNotes?.trim() || null }
        : {}),
      ...(Array.isArray(photos) ? { photos } : {}),
      status: nextStatus,
      checklistTemplateId: templateId,
    }

    const existing = await prisma.serviceLog.findFirst({
      where: { shiftId: shift.id, locationId, associateId: user.id },
    })

    const log = existing
      ? await prisma.serviceLog.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.serviceLog.create({
          data: {
            shiftId: shift.id,
            locationId,
            associateId: user.id,
            serviceDate: shift.date,
            ...data,
          },
        })

    return NextResponse.json({
      id: log.id,
      status: log.status,
      clockIn: log.clockIn?.toISOString() ?? null,
      clockOut: log.clockOut?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('Error recording checklist completion:', error)
    return NextResponse.json(
      { error: 'Failed to record checklist completion' },
      { status: 500 }
    )
  }
}
