import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/clients/[id]/facilities - List facility profiles for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify client belongs to user's company
    const client = await prisma.client.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const facilities = await prisma.facilityProfile.findMany({
      where: { clientId: id },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true,
          },
        },
        seasonalRules: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        monthlyOverrides: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          take: 3,
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json(facilities)
  } catch (error) {
    console.error('Error fetching facilities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch facilities' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/facilities - Create a facility profile
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify client belongs to user's company
    const client = await prisma.client.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Verify location belongs to this client and doesn't already have a profile
    const location = await prisma.location.findFirst({
      where: {
        id: body.locationId,
        clientId: id,
      },
      include: {
        facilityProfile: { select: { id: true } },
      },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found for this client' },
        { status: 404 }
      )
    }

    if (location.facilityProfile) {
      return NextResponse.json(
        { error: 'This location already has a facility profile' },
        { status: 409 }
      )
    }

    const facility = await prisma.facilityProfile.create({
      data: {
        clientId: id,
        locationId: body.locationId,
        category: body.category || null,
        defaultMonthlyRate: body.defaultMonthlyRate,
        rateType: body.rateType || 'FLAT_MONTHLY',
        taxBehavior: body.taxBehavior || 'INHERIT_CLIENT',
        status: body.status || 'PENDING_APPROVAL',
        goLiveDate: body.goLiveDate ? new Date(body.goLiveDate) : null,
        seasonalRulesEnabled: body.seasonalRulesEnabled || false,
        normalDaysOfWeek: body.normalDaysOfWeek || [],
        normalFrequencyPerWeek: body.normalFrequencyPerWeek || 0,
        scopeOfWorkNotes: body.scopeOfWorkNotes || null,
        sortOrder: body.sortOrder || 0,
      },
      include: {
        location: {
          select: { id: true, name: true, address: true },
        },
      },
    })

    logAudit({
      userId: user.id,
      action: 'create',
      entityType: 'facility_profile',
      entityId: facility.id,
      newValues: {
        locationName: facility.location.name,
        category: body.category || null,
        defaultMonthlyRate: body.defaultMonthlyRate,
        status: body.status || 'PENDING_APPROVAL',
        normalFrequencyPerWeek: body.normalFrequencyPerWeek || 0,
        normalDaysOfWeek: body.normalDaysOfWeek || [],
      },
    })

    return NextResponse.json(facility, { status: 201 })
  } catch (error) {
    console.error('Error creating facility:', error)
    return NextResponse.json(
      { error: 'Failed to create facility' },
      { status: 500 }
    )
  }
}
