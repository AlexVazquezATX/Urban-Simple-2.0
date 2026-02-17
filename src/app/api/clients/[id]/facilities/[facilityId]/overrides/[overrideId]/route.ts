import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, diffFields } from '@/lib/audit'

// PATCH /api/clients/[id]/facilities/[facilityId]/overrides/[overrideId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string; overrideId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId, overrideId } = await params
    const body = await request.json()

    // Verify ownership chain
    const override = await prisma.monthlyOverride.findFirst({
      where: {
        id: overrideId,
        facilityProfileId: facilityId,
        facilityProfile: {
          clientId: id,
          client: { companyId: user.companyId },
        },
      },
    })

    if (!override) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 })
    }

    const { overrideStatus, overrideFrequency, overrideDaysOfWeek, overrideRate, overrideNotes, pauseStartDay, pauseEndDay } = body

    const updated = await prisma.monthlyOverride.update({
      where: { id: overrideId },
      data: {
        ...(overrideStatus !== undefined && { overrideStatus: overrideStatus || null }),
        ...(overrideFrequency !== undefined && { overrideFrequency: overrideFrequency ?? null }),
        ...(overrideDaysOfWeek !== undefined && { overrideDaysOfWeek }),
        ...(overrideRate !== undefined && { overrideRate: overrideRate ?? null }),
        ...(overrideNotes !== undefined && { overrideNotes: overrideNotes || null }),
        ...(pauseStartDay !== undefined && { pauseStartDay: pauseStartDay ?? null }),
        ...(pauseEndDay !== undefined && { pauseEndDay: pauseEndDay ?? null }),
      },
    })

    const trackedFields = [
      'overrideStatus', 'overrideRate', 'overrideFrequency',
      'overrideDaysOfWeek', 'overrideNotes', 'pauseStartDay', 'pauseEndDay',
    ]
    const diff = diffFields(override as any, updated as any, trackedFields)
    if (diff) {
      logAudit({
        userId: user.id,
        action: 'update',
        entityType: 'monthly_override',
        entityId: overrideId,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating override:', error)
    return NextResponse.json(
      { error: 'Failed to update override' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/facilities/[facilityId]/overrides/[overrideId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string; overrideId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId, overrideId } = await params

    const override = await prisma.monthlyOverride.findFirst({
      where: {
        id: overrideId,
        facilityProfileId: facilityId,
        facilityProfile: {
          clientId: id,
          client: { companyId: user.companyId },
        },
      },
    })

    if (!override) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 })
    }

    await prisma.monthlyOverride.delete({ where: { id: overrideId } })

    logAudit({
      userId: user.id,
      action: 'delete',
      entityType: 'monthly_override',
      entityId: overrideId,
      oldValues: {
        month: `${override.month}/${override.year}`,
        overrideStatus: override.overrideStatus,
        overrideRate: override.overrideRate ? Number(override.overrideRate) : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting override:', error)
    return NextResponse.json(
      { error: 'Failed to delete override' },
      { status: 500 }
    )
  }
}
