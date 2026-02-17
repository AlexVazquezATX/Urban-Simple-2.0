import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

// GET /api/clients/[id]/service-items?year=2026&month=2
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
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const items = await prisma.serviceLineItem.findMany({
      where: {
        clientId: id,
        ...(year && { year: parseInt(year) }),
        ...(month && { month: parseInt(month) }),
      },
      include: {
        facilityProfile: {
          select: { location: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Serialize Decimal fields
    const serialized = items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unitRate: Number(item.unitRate),
    }))

    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Error fetching service line items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service line items' },
      { status: 500 }
    )
  }
}

// POST /api/clients/[id]/service-items
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

    // Verify client ownership
    const client = await prisma.client.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!body.year || !body.month || !body.description || body.unitRate == null) {
      return NextResponse.json(
        { error: 'Year, month, description, and unitRate are required' },
        { status: 400 }
      )
    }

    // If facilityProfileId is provided, verify it belongs to this client
    if (body.facilityProfileId) {
      const fp = await prisma.facilityProfile.findFirst({
        where: { id: body.facilityProfileId, clientId: id },
        select: { id: true },
      })
      if (!fp) {
        return NextResponse.json({ error: 'Facility not found' }, { status: 404 })
      }
    }

    const item = await prisma.serviceLineItem.create({
      data: {
        clientId: id,
        facilityProfileId: body.facilityProfileId || null,
        year: body.year,
        month: body.month,
        description: body.description,
        quantity: body.quantity ?? 1,
        unitRate: body.unitRate,
        taxBehavior: body.taxBehavior || 'INHERIT_CLIENT',
        notes: body.notes || null,
        performedDate: body.performedDate ? new Date(body.performedDate) : null,
        status: body.status || 'pending',
      },
    })

    logAudit({
      userId: user.id,
      action: 'create',
      entityType: 'service_line_item',
      entityId: item.id,
      newValues: {
        description: body.description,
        quantity: body.quantity ?? 1,
        unitRate: Number(body.unitRate),
        month: `${body.month}/${body.year}`,
      },
    })

    return NextResponse.json(
      { ...item, quantity: Number(item.quantity), unitRate: Number(item.unitRate) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating service line item:', error)
    return NextResponse.json(
      { error: 'Failed to create service line item' },
      { status: 500 }
    )
  }
}
