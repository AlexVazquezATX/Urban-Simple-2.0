import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/clients/[id]/locations - Create location for client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: clientId } = await params

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

    const body = await request.json()
    const {
      name,
      address,
      logoUrl,
      accessInstructions,
      serviceNotes,
      painPoints,
      checklistTemplateId,
      equipmentInventory,
      branchId,
    } = body

    // Use client's branch or specified branch
    const targetBranchId = branchId || client.branchId

    const location = await prisma.location.create({
      data: {
        clientId,
        branchId: targetBranchId,
        name,
        address: address || {},
        logoUrl: logoUrl || null,
        accessInstructions,
        serviceNotes,
        painPoints,
        checklistTemplateId: checklistTemplateId || null,
        equipmentInventory: equipmentInventory || [],
        isActive: true,
      },
      include: {
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}



