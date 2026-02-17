import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/clients/[id]/service-items/[itemId]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, itemId } = await params

    const item = await prisma.serviceLineItem.findFirst({
      where: {
        id: itemId,
        clientId: id,
        client: { companyId: user.companyId },
      },
      include: {
        facilityProfile: {
          select: { location: { select: { name: true } } },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Service line item not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...item,
      quantity: Number(item.quantity),
      unitRate: Number(item.unitRate),
    })
  } catch (error) {
    console.error('Error fetching service line item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service line item' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id]/service-items/[itemId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, itemId } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.serviceLineItem.findFirst({
      where: {
        id: itemId,
        clientId: id,
        client: { companyId: user.companyId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Service line item not found' }, { status: 404 })
    }

    // If changing facilityProfileId, verify it belongs to this client
    if (body.facilityProfileId !== undefined && body.facilityProfileId !== null) {
      const fp = await prisma.facilityProfile.findFirst({
        where: { id: body.facilityProfileId, clientId: id },
        select: { id: true },
      })
      if (!fp) {
        return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (body.description !== undefined) updateData.description = body.description
    if (body.quantity !== undefined) updateData.quantity = body.quantity
    if (body.unitRate !== undefined) updateData.unitRate = body.unitRate
    if (body.taxBehavior !== undefined) updateData.taxBehavior = body.taxBehavior
    if (body.notes !== undefined) updateData.notes = body.notes || null
    if (body.performedDate !== undefined) updateData.performedDate = body.performedDate ? new Date(body.performedDate) : null
    if (body.status !== undefined) updateData.status = body.status
    if (body.facilityProfileId !== undefined) updateData.facilityProfileId = body.facilityProfileId || null
    if (body.year !== undefined) updateData.year = body.year
    if (body.month !== undefined) updateData.month = body.month

    const updated = await prisma.serviceLineItem.update({
      where: { id: itemId },
      data: updateData,
    })

    logAudit({
      userId: user.id,
      action: 'update',
      entityType: 'service_line_item',
      entityId: itemId,
      newValues: updateData as Record<string, unknown>,
    })

    return NextResponse.json({
      ...updated,
      quantity: Number(updated.quantity),
      unitRate: Number(updated.unitRate),
    })
  } catch (error) {
    console.error('Error updating service line item:', error)
    return NextResponse.json(
      { error: 'Failed to update service line item' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id]/service-items/[itemId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, itemId } = await params

    // Verify ownership
    const existing = await prisma.serviceLineItem.findFirst({
      where: {
        id: itemId,
        clientId: id,
        client: { companyId: user.companyId },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Service line item not found' }, { status: 404 })
    }

    await prisma.serviceLineItem.delete({
      where: { id: itemId },
    })

    logAudit({
      userId: user.id,
      action: 'delete',
      entityType: 'service_line_item',
      entityId: itemId,
      oldValues: {
        description: existing.description,
        quantity: Number(existing.quantity),
        unitRate: Number(existing.unitRate),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service line item:', error)
    return NextResponse.json(
      { error: 'Failed to delete service line item' },
      { status: 500 }
    )
  }
}
