import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/clients/[id]/facilities/[facilityId]/overrides
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
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

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

    const overrides = await prisma.monthlyOverride.findMany({
      where: {
        facilityProfileId: facilityId,
        ...(year && { year: parseInt(year) }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })

    return NextResponse.json(overrides)
  } catch (error) {
    console.error('Error fetching overrides:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overrides' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/facilities/[facilityId]/overrides
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

    if (!body.year || !body.month) {
      return NextResponse.json(
        { error: 'Year and month are required' },
        { status: 400 }
      )
    }

    // Upsert — allow updating an existing override for the same month
    const overrideData = {
      overrideStatus: body.overrideStatus || null,
      overrideFrequency: body.overrideFrequency ?? null,
      overrideDaysOfWeek: body.overrideDaysOfWeek || [],
      overrideRate: body.overrideRate ?? null,
      overrideNotes: body.overrideNotes || null,
      pauseStartDay: body.pauseStartDay ?? null,
      pauseEndDay: body.pauseEndDay ?? null,
    }

    const override = await prisma.monthlyOverride.upsert({
      where: {
        facilityProfileId_year_month: {
          facilityProfileId: facilityId,
          year: body.year,
          month: body.month,
        },
      },
      update: overrideData,
      create: {
        facilityProfileId: facilityId,
        year: body.year,
        month: body.month,
        ...overrideData,
      },
    })

    const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const newVals: Record<string, unknown> = {
      month: `${MONTH_NAMES[body.month]} ${body.year}`,
    }
    if (overrideData.overrideStatus) newVals.overrideStatus = overrideData.overrideStatus
    if (overrideData.overrideRate !== null) newVals.overrideRate = Number(overrideData.overrideRate)
    if (overrideData.overrideFrequency !== null) newVals.overrideFrequency = overrideData.overrideFrequency
    if (overrideData.pauseStartDay !== null) newVals.pauseStartDay = overrideData.pauseStartDay
    if (overrideData.pauseEndDay !== null) newVals.pauseEndDay = overrideData.pauseEndDay

    logAudit({
      userId: user.id,
      action: 'create',
      entityType: 'monthly_override',
      entityId: override.id,
      newValues: newVals,
    })

    return NextResponse.json(override, { status: 201 })
  } catch (error) {
    console.error('Error creating override:', error)
    return NextResponse.json(
      { error: 'Failed to create override' },
      { status: 500 }
    )
  }
}
