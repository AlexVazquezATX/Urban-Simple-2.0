import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, diffFields } from '@/lib/audit'

// GET /api/clients/[id]/facilities/[facilityId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId } = await params

    const facility = await prisma.facilityProfile.findFirst({
      where: {
        id: facilityId,
        clientId: id,
        client: { companyId: user.companyId },
      },
      include: {
        location: {
          select: { id: true, name: true, address: true, isActive: true },
        },
        seasonalRules: {
          orderBy: { createdAt: 'desc' },
        },
        monthlyOverrides: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
        },
      },
    })

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }

    return NextResponse.json(facility)
  } catch (error) {
    console.error('Error fetching facility:', error)
    return NextResponse.json(
      { error: 'Failed to fetch facility' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id]/facilities/[facilityId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.facilityProfile.findFirst({
      where: {
        id: facilityId,
        clientId: id,
        client: { companyId: user.companyId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }

    const {
      category,
      defaultMonthlyRate,
      rateType,
      taxBehavior,
      status,
      goLiveDate,
      pauseStartDate,
      pauseEndDate,
      seasonalRulesEnabled,
      normalDaysOfWeek,
      normalFrequencyPerWeek,
      scopeOfWorkNotes,
      sortOrder,
    } = body

    const facility = await prisma.facilityProfile.update({
      where: { id: facilityId },
      data: {
        ...(category !== undefined && { category: category || null }),
        ...(defaultMonthlyRate !== undefined && { defaultMonthlyRate }),
        ...(rateType !== undefined && { rateType }),
        ...(taxBehavior !== undefined && { taxBehavior }),
        ...(status !== undefined && { status }),
        ...(goLiveDate !== undefined && { goLiveDate: goLiveDate ? new Date(goLiveDate) : null }),
        ...(pauseStartDate !== undefined && { pauseStartDate: pauseStartDate ? new Date(pauseStartDate) : null }),
        ...(pauseEndDate !== undefined && { pauseEndDate: pauseEndDate ? new Date(pauseEndDate) : null }),
        ...(seasonalRulesEnabled !== undefined && { seasonalRulesEnabled }),
        ...(normalDaysOfWeek !== undefined && { normalDaysOfWeek }),
        ...(normalFrequencyPerWeek !== undefined && { normalFrequencyPerWeek }),
        ...(scopeOfWorkNotes !== undefined && { scopeOfWorkNotes: scopeOfWorkNotes || null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        location: {
          select: { id: true, name: true, address: true },
        },
      },
    })

    // Audit log — detect if this is a status toggle vs general update
    const isStatusChange = status !== undefined && Object.keys(body).length <= 1
    const trackedFields = [
      'category', 'defaultMonthlyRate', 'rateType', 'taxBehavior', 'status',
      'seasonalRulesEnabled', 'normalDaysOfWeek', 'normalFrequencyPerWeek',
      'scopeOfWorkNotes', 'sortOrder',
    ]
    const diff = diffFields(existing as any, facility as any, trackedFields)
    if (diff) {
      logAudit({
        userId: user.id,
        action: isStatusChange ? 'status_change' : 'update',
        entityType: 'facility_profile',
        entityId: facilityId,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
      })
    }

    return NextResponse.json(facility)
  } catch (error) {
    console.error('Error updating facility:', error)
    return NextResponse.json(
      { error: 'Failed to update facility' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/facilities/[facilityId] - Soft delete (set CLOSED)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId } = await params

    const existing = await prisma.facilityProfile.findFirst({
      where: {
        id: facilityId,
        clientId: id,
        client: { companyId: user.companyId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }

    await prisma.facilityProfile.update({
      where: { id: facilityId },
      data: { status: 'CLOSED' },
    })

    logAudit({
      userId: user.id,
      action: 'status_change',
      entityType: 'facility_profile',
      entityId: facilityId,
      oldValues: { status: existing.status },
      newValues: { status: 'CLOSED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error closing facility:', error)
    return NextResponse.json(
      { error: 'Failed to close facility' },
      { status: 500 }
    )
  }
}
