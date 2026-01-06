import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/locations/[id] - Get location by ID
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

    const location = await prisma.location.findFirst({
      where: {
        id,
        client: {
          companyId: user.companyId,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

// PATCH /api/locations/[id] - Update location
export async function PATCH(
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

    // Verify location belongs to user's company
    const existingLocation = await prisma.location.findFirst({
      where: {
        id,
        client: {
          companyId: user.companyId,
        },
      },
    })

    if (!existingLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const {
      name,
      address,
      logoUrl,
      accessInstructions,
      serviceNotes,
      painPoints,
      checklistTemplateId,
      equipmentInventory,
      isActive,
      clientId,
    } = body

    // If clientId is being changed, verify the new client belongs to user's company
    if (clientId !== undefined && clientId !== existingLocation.clientId) {
      const newClient = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId: user.companyId,
        },
      })

      if (!newClient) {
        return NextResponse.json(
          { error: 'Client not found or access denied' },
          { status: 404 }
        )
      }
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(accessInstructions !== undefined && { accessInstructions }),
        ...(serviceNotes !== undefined && { serviceNotes }),
        ...(painPoints !== undefined && { painPoints }),
        ...(checklistTemplateId !== undefined && {
          checklistTemplateId: checklistTemplateId || null,
        }),
        ...(equipmentInventory !== undefined && { equipmentInventory }),
        ...(isActive !== undefined && { isActive }),
        ...(clientId !== undefined && clientId !== existingLocation.clientId && {
          clientId,
        }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

// DELETE /api/locations/[id] - Delete location (soft delete by setting isActive=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify location belongs to user's company
    const existingLocation = await prisma.location.findFirst({
      where: {
        id,
        client: {
          companyId: user.companyId,
        },
      },
    })

    if (!existingLocation) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Soft delete by setting isActive=false
    const location = await prisma.location.update({
      where: { id },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}



