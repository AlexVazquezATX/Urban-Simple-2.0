import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// PUT /api/location-assignments/[id] - Update location assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify assignment belongs to user's company
    const existing = await prisma.locationAssignment.findFirst({
      where: {
        id,
        location: {
          client: {
            branch: {
              companyId: user.companyId,
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Location assignment not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { monthlyPay, startDate, endDate, isActive } = body

    const assignment = await prisma.locationAssignment.update({
      where: {
        id,
      },
      data: {
        ...(monthlyPay !== undefined && { monthlyPay: parseFloat(monthlyPay.toString()) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date(),
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

    return NextResponse.json(assignment)
  } catch (error) {
    console.error('Error updating location assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update location assignment' },
      { status: 500 }
    )
  }
}

// DELETE /api/location-assignments/[id] - Delete location assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify assignment belongs to user's company
    const existing = await prisma.locationAssignment.findFirst({
      where: {
        id,
        location: {
          client: {
            branch: {
              companyId: user.companyId,
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Location assignment not found' },
        { status: 404 }
      )
    }

    await prisma.locationAssignment.delete({
      where: {
        id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting location assignment:', error)
    return NextResponse.json(
      { error: 'Failed to delete location assignment' },
      { status: 500 }
    )
  }
}

