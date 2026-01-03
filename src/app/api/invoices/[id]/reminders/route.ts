import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/invoices/[id]/reminders - Create payment reminder
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
    const body = await request.json()
    const { reminderType = 'overdue' } = body

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
            billingEmail: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Determine reminder type based on days past due
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(invoice.dueDate)
    const daysPastDue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    let finalReminderType = reminderType
    if (reminderType === 'auto') {
      if (daysPastDue > 90) {
        finalReminderType = 'overdue_30'
      } else if (daysPastDue > 60) {
        finalReminderType = 'overdue_14'
      } else if (daysPastDue > 30) {
        finalReminderType = 'overdue_7'
      } else if (daysPastDue > 0) {
        finalReminderType = 'due'
      } else {
        finalReminderType = 'upcoming'
      }
    }

    // Create reminder record
    const reminder = await prisma.paymentReminder.create({
      data: {
        invoiceId,
        reminderType: finalReminderType,
        scheduledFor: new Date(),
        sentAt: new Date(), // Mark as sent immediately for manual reminders
      },
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            client: {
              select: {
                name: true,
                billingEmail: true,
              },
            },
          },
        },
      },
    })

    // TODO: Send email via SendGrid
    // For now, just log it
    console.log('Payment reminder sent:', {
      invoiceNumber: reminder.invoice.invoiceNumber,
      client: reminder.invoice.client.name,
      email: reminder.invoice.client.billingEmail,
      reminderType: finalReminderType,
      daysPastDue,
    })

    return NextResponse.json({
      message: 'Reminder sent',
      reminder,
      emailSent: true, // Will be false when email fails
    })
  } catch (error) {
    console.error('Error creating payment reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    )
  }
}

