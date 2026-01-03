import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/service-agreements - List all service agreements
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const agreements = await prisma.serviceAgreement.findMany({
      where: {
        client: {
          companyId: user.companyId,
          ...(user.branchId && { branchId: user.branchId }),
        },
        ...(activeOnly && { isActive: true }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            billingEmail: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        _count: {
          select: {
            invoiceLineItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(agreements)
  } catch (error) {
    console.error('Error fetching service agreements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service agreements' },
      { status: 500 }
    )
  }
}

// POST /api/service-agreements - Create new service agreement
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      clientId,
      locationId,
      description,
      monthlyAmount,
      billingDay = 1,
      paymentTerms = 'NET_30',
      startDate,
      endDate,
    } = body

    // Verify client belongs to user's company
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        companyId: user.companyId,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Verify location belongs to client
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        clientId: clientId,
      },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Validate billing day (1-28)
    const day = parseInt(billingDay)
    if (day < 1 || day > 28) {
      return NextResponse.json(
        { error: 'Billing day must be between 1 and 28' },
        { status: 400 }
      )
    }

    const agreement = await prisma.serviceAgreement.create({
      data: {
        clientId,
        locationId,
        description,
        monthlyAmount: parseFloat(monthlyAmount),
        billingDay: day,
        paymentTerms,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(agreement, { status: 201 })
  } catch (error) {
    console.error('Error creating service agreement:', error)
    return NextResponse.json(
      { error: 'Failed to create service agreement' },
      { status: 500 }
    )
  }
}


