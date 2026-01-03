import { Resend } from 'resend'
import { InvoiceEmail } from '@/emails/invoice-email'
import { prisma } from '@/lib/db'

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY)

interface SendInvoiceEmailParams {
  invoiceId: string
  to: string
  from?: string
}

export async function sendInvoiceEmail({
  invoiceId,
  to,
  from = 'invoices@urbansimple.net',
}: SendInvoiceEmailParams) {
  try {
    // Fetch invoice with all related data
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: {
          select: {
            name: true,
            billingEmail: true,
          },
        },
        lineItems: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    })

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Format dates
    const issueDate = new Date(invoice.issueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const dueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Format line items
    const lineItems = invoice.lineItems.map((item) => ({
      description: item.description,
      amount: `$${Number(item.amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    }))

    // Format amounts
    const totalAmount = `$${Number(invoice.totalAmount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

    const balanceDue = `$${Number(invoice.balanceDue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: `Invoice ${invoice.invoiceNumber} from Urban Simple`,
      react: InvoiceEmail({
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.client.name,
        issueDate,
        dueDate,
        totalAmount,
        balanceDue,
        lineItems,
        companyName: 'Urban Simple',
        companyEmail: 'billing@urbansimple.net',
      }),
    })

    if (error) {
      throw new Error(`Resend API error: ${error.message}`)
    }

    // Log the email
    await prisma.emailLog.create({
      data: {
        recipientEmail: to,
        subject: `Invoice ${invoice.invoiceNumber} from Urban Simple`,
        body: '', // React Email renders HTML
        status: 'sent',
        sentAt: new Date(),
      },
    })

    // Update invoice status if it was draft
    if (invoice.status === 'draft') {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: 'sent',
          sentAt: new Date(),
        },
      })
    } else if (!invoice.sentAt) {
      // Just update sentAt if status is already not draft
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          sentAt: new Date(),
        },
      })
    }

    return {
      success: true,
      emailId: data?.id,
      message: `Invoice sent to ${to}`,
    }
  } catch (error: any) {
    console.error('Error sending invoice email:', error)

    // Log failed email
    await prisma.emailLog.create({
      data: {
        recipientEmail: to,
        subject: `Invoice email (failed)`,
        body: '',
        status: 'failed',
        errorMessage: error.message,
      },
    })

    return {
      success: false,
      error: error.message,
    }
  }
}

// Test email function (for development)
export async function sendTestEmail(to: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'test@urbansimple.net',
      to,
      subject: 'Test Email from Urban Simple',
      react: InvoiceEmail({
        invoiceNumber: 'INV-TEST-0001',
        clientName: 'Test Client',
        issueDate: 'January 1, 2026',
        dueDate: 'February 1, 2026',
        totalAmount: '$1,000.00',
        balanceDue: '$1,000.00',
        lineItems: [
          { description: 'Test Service', amount: '$1,000.00' },
        ],
      }),
    })

    if (error) {
      throw new Error(error.message)
    }

    return { success: true, emailId: data?.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
