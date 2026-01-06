import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/location-assignments - List all location assignments
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')
    const userId = searchParams.get('userId')
    const isActive = searchParams.get('isActive')

    const assignments = await prisma.locationAssignment.findMany({
      where: {
        location: {
          client: {
            branch: {
              companyId: user.companyId,
              ...(user.branchId && { id: user.branchId }),
            },
          },
          ...(locationId && { id: locationId }),
        },
        ...(userId && { userId }),
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [
        { location: { client: { name: 'asc' } } },
        { location: { name: 'asc' } },
      ],
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching location assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location assignments' },
      { status: 500 }
    )
  }
}

// POST /api/location-assignments - Create new location assignment
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { locationId, userId, monthlyPay, startDate, endDate, isActive = true } = body

    if (!locationId || !userId || !monthlyPay || !startDate) {
      return NextResponse.json(
        { error: 'Location ID, User ID, monthly pay, and start date are required' },
        { status: 400 }
      )
    }

    // Verify location belongs to user's company
    const location = await prisma.location.findFirst({
      where: {
        id: locationId,
        client: {
          branch: {
            companyId: user.companyId,
            ...(user.branchId && { id: user.branchId }),
          },
        },
      },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check for existing active assignment
    const existing = await prisma.locationAssignment.findFirst({
      where: {
        locationId,
        userId,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Active assignment already exists for this location and associate' },
        { status: 400 }
      )
    }

    const assignment = await prisma.locationAssignment.create({
      data: {
        locationId,
        userId,
        monthlyPay: parseFloat(monthlyPay.toString()),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error('Error creating location assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create location assignment' },
      { status: 500 }
    )
  }
}

