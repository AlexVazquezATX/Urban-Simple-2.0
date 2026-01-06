import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/invoices/[id]/sync-qb - Sync invoice to QuickBooks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: invoiceId } = await params

    // Verify invoice belongs to user's company
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        client: {
          companyId: user.companyId,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            qbCustomerId: true,
          },
        },
        lineItems: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // TODO: Implement QuickBooks API integration
    // For now, this is a placeholder that simulates the sync
    // In production, you would:
    // 1. Create/update customer in QuickBooks if qbCustomerId is null
    // 2. Create invoice in QuickBooks
    // 3. Store the QuickBooks invoice ID

    console.log('QuickBooks sync requested:', {
      invoiceNumber: invoice.invoiceNumber,
      client: invoice.client.name,
      qbCustomerId: invoice.client.qbCustomerId,
      totalAmount: invoice.totalAmount,
    })

    // Simulate QuickBooks sync
    const mockQbInvoiceId = `QB-${Date.now()}`

    // Update invoice with QuickBooks ID
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        qbInvoiceId: mockQbInvoiceId,
      },
    })

    // If client doesn't have QB customer ID, create one (simulated)
    if (!invoice.client.qbCustomerId) {
      const mockQbCustomerId = `QB-CUST-${Date.now()}`
      await prisma.client.update({
        where: { id: invoice.client.id },
        data: {
          qbCustomerId: mockQbCustomerId,
        },
      })
    }

    return NextResponse.json({
      message: 'Invoice synced to QuickBooks',
      qbInvoiceId: mockQbInvoiceId,
      qbCustomerId: invoice.client.qbCustomerId || `QB-CUST-${Date.now()}`,
    })
  } catch (error) {
    console.error('Error syncing to QuickBooks:', error)
    return NextResponse.json(
      { error: 'Failed to sync to QuickBooks' },
      { status: 500 }
    )
  }
}




