import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/invoices/[id] - Get invoice by ID
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

    const invoice = await prisma.invoice.findFirst({
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
            legalName: true,
            billingEmail: true,
            phone: true,
            billingAddress: true,
            paymentTerms: true,
            taxExempt: true,
          },
        },
        lineItems: {
          include: {
            serviceAgreement: {
              select: {
                id: true,
                description: true,
                location: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

// PATCH /api/invoices/[id] - Update invoice
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

    // Verify invoice belongs to user's company
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        client: {
          companyId: user.companyId,
        },
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const { status, notes, sentAt } = body

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (sentAt !== undefined)
      updateData.sentAt = sentAt ? new Date(sentAt) : null

    // If marking as sent, set sentAt if not provided
    if (status === 'sent' && !sentAt) {
      updateData.sentAt = new Date()
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    )
  }
}




