import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/service-agreements/[id] - Get service agreement by ID
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

    const agreement = await prisma.serviceAgreement.findFirst({
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
            billingEmail: true,
            paymentTerms: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        invoiceLineItems: {
          include: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                issueDate: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!agreement) {
      return NextResponse.json(
        { error: 'Service agreement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(agreement)
  } catch (error) {
    console.error('Error fetching service agreement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch service agreement' },
      { status: 500 }
    )
  }
}

// PATCH /api/service-agreements/[id] - Update service agreement
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

    // Verify agreement belongs to user's company
    const existingAgreement = await prisma.serviceAgreement.findFirst({
      where: {
        id,
        client: {
          companyId: user.companyId,
        },
      },
    })

    if (!existingAgreement) {
      return NextResponse.json(
        { error: 'Service agreement not found' },
        { status: 404 }
      )
    }

    const {
      description,
      monthlyAmount,
      billingDay,
      paymentTerms,
      startDate,
      endDate,
      isActive,
    } = body

    const updateData: any = {}
    if (description !== undefined) updateData.description = description
    if (monthlyAmount !== undefined)
      updateData.monthlyAmount = parseFloat(monthlyAmount)
    if (billingDay !== undefined) {
      const day = parseInt(billingDay)
      if (day < 1 || day > 28) {
        return NextResponse.json(
          { error: 'Billing day must be between 1 and 28' },
          { status: 400 }
        )
      }
      updateData.billingDay = day
    }
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms
    if (startDate !== undefined) updateData.startDate = new Date(startDate)
    if (endDate !== undefined)
      updateData.endDate = endDate ? new Date(endDate) : null
    if (isActive !== undefined) updateData.isActive = isActive

    const agreement = await prisma.serviceAgreement.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(agreement)
  } catch (error) {
    console.error('Error updating service agreement:', error)
    return NextResponse.json(
      { error: 'Failed to update service agreement' },
      { status: 500 }
    )
  }
}


