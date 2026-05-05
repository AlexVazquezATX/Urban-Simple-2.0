import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/clients/[id] - Get client by ID
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

    const client = await prisma.client.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
        locations: {
          include: {
            branch: {
              select: {
                name: true,
                code: true,
              },
            },
            _count: {
              select: {
                serviceAgreements: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
        },
        contacts: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        facilityProfiles: {
          include: {
            location: {
              select: { id: true, name: true, address: true, isActive: true },
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
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error fetching client:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    )
  }
}

// PATCH /api/clients/[id] - Update client
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

    // Verify client belongs to user's company
    const existingClient = await prisma.client.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const {
      name,
      legalName,
      billingEmail,
      phone,
      address,
      billingAddress,
      logoUrl,
      paymentTerms,
      preferredPaymentMethod,
      taxExempt,
      notes,
      status,
    } = body

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(billingEmail !== undefined && { billingEmail }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(billingAddress !== undefined && { billingAddress }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
        ...(paymentTerms !== undefined && { paymentTerms }),
        ...(preferredPaymentMethod !== undefined && { preferredPaymentMethod }),
        ...(taxExempt !== undefined && { taxExempt }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
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

    return NextResponse.json(client)
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Soft-delete client.
// Cascades soft-delete to the client's locations and deactivates active
// service agreements so financial rollups don't keep including them.
// History (invoices, payments, contracts) is preserved.
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
    const now = new Date()

    const existingClient = await prisma.client.findFirst({
      where: { id, companyId: user.companyId, deletedAt: null },
    })
    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.client.update({
        where: { id },
        data: { deletedAt: now, deletedById: user.id },
      }),
      prisma.location.updateMany({
        where: { clientId: id, deletedAt: null },
        data: { deletedAt: now, deletedById: user.id },
      }),
      prisma.serviceAgreement.updateMany({
        where: { clientId: id, isActive: true },
        data: { isActive: false, endDate: now },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    )
  }
}



