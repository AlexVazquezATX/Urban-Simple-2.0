import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendPaymentReminderEmail } from '@/lib/email'

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

    const recipient = invoice.client.billingEmail
    if (!recipient) {
      return NextResponse.json(
        { error: 'Client has no billing email. Add one on the client record first.' },
        { status: 400 }
      )
    }

    // Create reminder record; sentAt is stamped only after the email goes out
    const reminder = await prisma.paymentReminder.create({
      data: {
        invoiceId,
        reminderType: finalReminderType,
        scheduledFor: new Date(),
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

    const emailResult = await sendPaymentReminderEmail({
      invoiceId,
      to: recipient,
    })

    if (emailResult.success) {
      await prisma.paymentReminder.update({
        where: { id: reminder.id },
        data: {
          sentAt: new Date(),
          emailLogId: emailResult.emailLogId ?? null,
        },
      })
    }

    return NextResponse.json({
      message: emailResult.success
        ? `Reminder sent to ${recipient}`
        : `Reminder recorded but email failed: ${emailResult.error}`,
      reminder,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('Error creating payment reminder:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    )
  }
}




