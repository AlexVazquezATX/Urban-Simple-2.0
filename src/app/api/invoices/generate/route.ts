import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { generateInvoiceNumber } from '@/lib/invoice-number'

// POST /api/invoices/generate - Generate invoices from active service agreements
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { month, year, agreementIds } = body

    // Default to current month if not specified
    const targetMonth = month || new Date().getMonth() + 1
    const targetYear = year || new Date().getFullYear()

    // Find active service agreements that should be billed
    const whereClause: any = {
      client: {
        companyId: user.companyId,
        ...(user.branchId && { branchId: user.branchId }),
      },
      isActive: true,
      startDate: {
        lte: new Date(targetYear, targetMonth - 1, 28), // Billing day is 1-28
      },
      OR: [
        { endDate: null },
        { endDate: { gte: new Date(targetYear, targetMonth - 1, 1) } },
      ],
    }

    // If specific agreement IDs provided, filter by them
    if (agreementIds && agreementIds.length > 0) {
      whereClause.id = { in: agreementIds }
    }

    const agreements = await prisma.serviceAgreement.findMany({
      where: whereClause,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            billingEmail: true,
            paymentTerms: true,
            taxExempt: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        invoiceLineItems: {
          where: {
            invoice: {
              issueDate: {
                gte: new Date(targetYear, targetMonth - 1, 1),
                lt: new Date(targetYear, targetMonth, 1),
              },
            },
          },
        },
      },
    })

    // Filter agreements that haven't been invoiced for this month
    const agreementsToBill = agreements.filter(
      (agreement) => agreement.invoiceLineItems.length === 0
    )

    if (agreementsToBill.length === 0) {
      return NextResponse.json({
        message: 'No agreements need invoicing for this period',
        invoices: [],
      })
    }

    // Group by client
    const clientGroups = new Map<string, typeof agreementsToBill>()
    for (const agreement of agreementsToBill) {
      const clientId = agreement.clientId
      if (!clientGroups.has(clientId)) {
        clientGroups.set(clientId, [])
      }
      clientGroups.get(clientId)!.push(agreement)
    }

    const createdInvoices = []

    // Create invoice for each client
    for (const [clientId, clientAgreements] of clientGroups) {
      const client = clientAgreements[0].client
      const billingDay = Math.min(
        ...clientAgreements.map((a) => a.billingDay)
      ) // Use earliest billing day

      // Calculate dates
      const issueDate = new Date(targetYear, targetMonth - 1, billingDay)
      const paymentTerms = client.paymentTerms || 'NET_30'
      const daysToAdd =
        paymentTerms === 'NET_15'
          ? 15
          : paymentTerms === 'NET_30'
            ? 30
            : 0 // DUE_ON_RECEIPT
      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + daysToAdd)

      // Calculate totals
      let subtotal = 0
      const lineItems = []

      for (const agreement of clientAgreements) {
        const amount = Number(agreement.monthlyAmount)
        subtotal += amount

        lineItems.push({
          description: `${agreement.location.name} - ${agreement.description}`,
          quantity: 1,
          unitPrice: amount,
          amount: amount,
          serviceAgreementId: agreement.id,
          sortOrder: lineItems.length,
        })
      }

      const taxAmount = client.taxExempt ? 0 : subtotal * 0.0825 // 8.25% tax (adjust as needed)
      const totalAmount = subtotal + taxAmount

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber()

      // Create invoice
      const invoice = await prisma.invoice.create({
        data: {
          clientId,
          invoiceNumber,
          status: 'draft',
          issueDate,
          dueDate,
          subtotal,
          taxAmount,
          totalAmount,
          amountPaid: 0,
          balanceDue: totalAmount,
          terms: paymentTerms, // Store payment terms in terms field
          lineItems: {
            create: lineItems,
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
          lineItems: {
            include: {
              serviceAgreement: {
                select: {
                  id: true,
                  description: true,
                },
              },
            },
          },
        },
      })

      createdInvoices.push(invoice)
    }

    return NextResponse.json({
      message: `Generated ${createdInvoices.length} invoice(s)`,
      invoices: createdInvoices,
    })
  } catch (error) {
    console.error('Error generating invoices:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}

