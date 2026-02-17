import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/clients/[id]/facilities/[facilityId]/seasonal-rules
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

    // Verify ownership chain
    const facility = await prisma.facilityProfile.findFirst({
      where: {
        id: facilityId,
        clientId: id,
        client: { companyId: user.companyId },
      },
      select: { id: true },
    })

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }

    const rules = await prisma.seasonalRule.findMany({
      where: { facilityProfileId: facilityId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching seasonal rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch seasonal rules' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/facilities/[facilityId]/seasonal-rules
export async function POST(
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

    // Verify ownership chain
    const facility = await prisma.facilityProfile.findFirst({
      where: {
        id: facilityId,
        clientId: id,
        client: { companyId: user.companyId },
      },
      select: { id: true },
    })

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
    }

    const rule = await prisma.seasonalRule.create({
      data: {
        facilityProfileId: facilityId,
        activeMonths: body.activeMonths || [],
        pausedMonths: body.pausedMonths || [],
        effectiveYearStart: body.effectiveYearStart || null,
        effectiveYearEnd: body.effectiveYearEnd || null,
        notes: body.notes || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    })

    logAudit({
      userId: user.id,
      action: 'create',
      entityType: 'seasonal_rule',
      entityId: rule.id,
      newValues: {
        activeMonths: body.activeMonths || [],
        pausedMonths: body.pausedMonths || [],
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating seasonal rule:', error)
    return NextResponse.json(
      { error: 'Failed to create seasonal rule' },
      { status: 500 }
    )
  }
}
