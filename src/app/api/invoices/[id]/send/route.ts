import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sendInvoiceEmail } from '@/lib/email'
import { prisma } from '@/lib/db'

// POST /api/invoices/[id]/send - Send invoice via email
export async function POST(
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
    const { to } = body

    // Verify invoice belongs to user's company
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
            billingEmail: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Use provided email or fallback to client's billing email
    const recipientEmail = to || invoice.client.billingEmail

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No email address provided and client has no billing email' },
        { status: 400 }
      )
    }

    // Send the email
    const result = await sendInvoiceEmail({
      invoiceId: id,
      to: recipientEmail,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      emailId: result.emailId,
    })
  } catch (error) {
    console.error('Error sending invoice:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
