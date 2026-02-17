import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit, diffFields } from '@/lib/audit'

// PATCH /api/clients/[id]/facilities/[facilityId]/seasonal-rules/[ruleId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string; ruleId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId, ruleId } = await params
    const body = await request.json()

    // Verify ownership chain
    const rule = await prisma.seasonalRule.findFirst({
      where: {
        id: ruleId,
        facilityProfileId: facilityId,
        facilityProfile: {
          clientId: id,
          client: { companyId: user.companyId },
        },
      },
    })

    if (!rule) {
      return NextResponse.json({ error: 'Seasonal rule not found' }, { status: 404 })
    }

    const { activeMonths, pausedMonths, effectiveYearStart, effectiveYearEnd, notes, isActive } = body

    const updated = await prisma.seasonalRule.update({
      where: { id: ruleId },
      data: {
        ...(activeMonths !== undefined && { activeMonths }),
        ...(pausedMonths !== undefined && { pausedMonths }),
        ...(effectiveYearStart !== undefined && { effectiveYearStart: effectiveYearStart || null }),
        ...(effectiveYearEnd !== undefined && { effectiveYearEnd: effectiveYearEnd || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    const trackedFields = ['activeMonths', 'pausedMonths', 'effectiveYearStart', 'effectiveYearEnd', 'notes', 'isActive']
    const diff = diffFields(rule as any, updated as any, trackedFields)
    if (diff) {
      logAudit({
        userId: user.id,
        action: 'update',
        entityType: 'seasonal_rule',
        entityId: ruleId,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating seasonal rule:', error)
    return NextResponse.json(
      { error: 'Failed to update seasonal rule' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/facilities/[facilityId]/seasonal-rules/[ruleId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; facilityId: string; ruleId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, facilityId, ruleId } = await params

    // Verify ownership chain
    const rule = await prisma.seasonalRule.findFirst({
      where: {
        id: ruleId,
        facilityProfileId: facilityId,
        facilityProfile: {
          clientId: id,
          client: { companyId: user.companyId },
        },
      },
    })

    if (!rule) {
      return NextResponse.json({ error: 'Seasonal rule not found' }, { status: 404 })
    }

    await prisma.seasonalRule.delete({ where: { id: ruleId } })

    logAudit({
      userId: user.id,
      action: 'delete',
      entityType: 'seasonal_rule',
      entityId: ruleId,
      oldValues: {
        activeMonths: rule.activeMonths,
        pausedMonths: rule.pausedMonths,
        isActive: rule.isActive,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting seasonal rule:', error)
    return NextResponse.json(
      { error: 'Failed to delete seasonal rule' },
      { status: 500 }
    )
  }
}
