import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/clients - List all clients
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        deletedAt: null,
        branchId: user.branchId || undefined, // Filter by branch if user has one
      },
      include: {
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
        locations: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            locations: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      legalName,
      billingEmail,
      phone,
      address,
      billingAddress,
      logoUrl,
      paymentTerms = 'NET_30',
      preferredPaymentMethod,
      taxExempt = false,
      notes,
      status = 'active',
      branchId,
    } = body

    // Use user's branch if not specified. A branchless owner (SUPER_ADMIN /
    // ADMIN in the "all branches" view) has no user.branchId, so fall back to
    // the company's primary branch rather than 400ing.
    let targetBranchId = branchId || user.branchId
    if (!targetBranchId) {
      const primaryBranch = await prisma.branch.findFirst({
        where: { companyId: user.companyId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      })
      targetBranchId = primaryBranch?.id
    }
    if (!targetBranchId) {
      return NextResponse.json(
        { error: 'No branch available to assign this client to' },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        companyId: user.companyId,
        branchId: targetBranchId,
        name,
        legalName,
        billingEmail,
        phone,
        address: address || null,
        billingAddress: billingAddress || null,
        logoUrl: logoUrl || null,
        paymentTerms,
        preferredPaymentMethod,
        taxExempt,
        notes,
        status,
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

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    )
  }
}



