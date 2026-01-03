/**
 * Automated Invoice Generation from Service Agreements
 *
 * This script should be run daily via cron job to:
 * 1. Find all active service agreements where billing day matches today
 * 2. Generate invoices for those agreements
 * 3. Link invoice line items to service agreements
 * 4. Set invoice due dates based on payment terms
 *
 * Usage: npx tsx scripts/generate-recurring-invoices.ts [--dryRun] [--billingDay=15]
 */

import { PrismaClient } from '@prisma/client'
import { addDays } from 'date-fns'

const prisma = new PrismaClient()

interface GenerateInvoicesOptions {
  dryRun?: boolean
  billingDay?: number
  targetDate?: Date
}

async function generateRecurringInvoices(options: GenerateInvoicesOptions = {}) {
  const { dryRun = false, targetDate = new Date() } = options
  const currentDay = options.billingDay ?? targetDate.getDate()

  console.log('\n🔄 Starting Recurring Invoice Generation')
  console.log(`📅 Target Date: ${targetDate.toISOString().split('T')[0]}`)
  console.log(`📆 Billing Day: ${currentDay}`)
  console.log(`🧪 Dry Run: ${dryRun ? 'YES' : 'NO'}`)
  console.log('─'.repeat(60))

  try {
    // Find all active service agreements with matching billing day
    const agreements = await prisma.serviceAgreement.findMany({
      where: {
        isActive: true,
        billingDay: currentDay,
        startDate: {
          lte: targetDate, // Must have started by now
        },
        OR: [
          { endDate: null }, // No end date (ongoing)
          { endDate: { gte: targetDate } }, // Or hasn't ended yet
        ],
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
      },
    })

    console.log(`\n✅ Found ${agreements.length} active service agreement(s) for billing day ${currentDay}\n`)

    if (agreements.length === 0) {
      console.log('✨ No invoices to generate today.')
      return { generated: 0, total: 0 }
    }

    let generatedCount = 0
    const invoicesCreated: any[] = []

    for (const agreement of agreements) {
      console.log(`📋 Processing: ${agreement.client.name} - ${agreement.location.name}`)
      console.log(`   💵 Amount: $${agreement.monthlyAmount}`)
      console.log(`   📝 Description: ${agreement.description}`)

      // Check if invoice already exists for this month
      const firstOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      const lastOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)

      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          clientId: agreement.clientId,
          issueDate: {
            gte: firstOfMonth,
            lte: lastOfMonth,
          },
          lineItems: {
            some: {
              serviceAgreementId: agreement.id,
            },
          },
        },
      })

      if (existingInvoice) {
        console.log(`   ⏭️  Invoice already exists: ${existingInvoice.invoiceNumber}`)
        console.log('')
        continue
      }

      // Generate invoice number
      const year = targetDate.getFullYear()
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0')

      // Get last invoice number for this month
      const lastInvoice = await prisma.invoice.findFirst({
        where: {
          invoiceNumber: {
            startsWith: `INV-${year}${month}`,
          },
        },
        orderBy: {
          invoiceNumber: 'desc',
        },
      })

      let sequenceNumber = 1
      if (lastInvoice) {
        const lastSeq = parseInt(lastInvoice.invoiceNumber.split('-').pop() || '0')
        sequenceNumber = lastSeq + 1
      }

      const invoiceNumber = `INV-${year}${month}-${sequenceNumber.toString().padStart(4, '0')}`

      // Calculate due date based on payment terms
      const paymentTerms = agreement.paymentTerms || agreement.client.paymentTerms || 'NET_30'
      let daysToAdd = 30
      if (paymentTerms === 'NET_15') daysToAdd = 15
      if (paymentTerms === 'DUE_ON_RECEIPT') daysToAdd = 0

      const issueDate = targetDate
      const dueDate = addDays(issueDate, daysToAdd)

      const subtotal = Number(agreement.monthlyAmount)
      const taxAmount = 0 // Can be calculated based on client.taxExempt and location
      const totalAmount = subtotal + taxAmount

      console.log(`   🧾 Invoice Number: ${invoiceNumber}`)
      console.log(`   📅 Issue Date: ${issueDate.toISOString().split('T')[0]}`)
      console.log(`   📆 Due Date: ${dueDate.toISOString().split('T')[0]}`)

      if (!dryRun) {
        // Create invoice with line item
        const invoice = await prisma.invoice.create({
          data: {
            clientId: agreement.clientId,
            invoiceNumber,
            status: 'draft',
            issueDate,
            dueDate,
            subtotal,
            taxAmount,
            totalAmount,
            amountPaid: 0,
            balanceDue: totalAmount,
            notes: `Automatically generated from service agreement for ${agreement.location.name}`,
            terms: paymentTerms,
            lineItems: {
              create: [
                {
                  serviceAgreementId: agreement.id,
                  description: agreement.description,
                  quantity: 1,
                  unitPrice: agreement.monthlyAmount,
                  amount: agreement.monthlyAmount,
                  sortOrder: 0,
                },
              ],
            },
          },
          include: {
            client: {
              select: {
                name: true,
              },
            },
            lineItems: true,
          },
        })

        invoicesCreated.push(invoice)
        console.log(`   ✅ Invoice created: ${invoice.invoiceNumber}`)
      } else {
        console.log(`   🧪 DRY RUN: Would create invoice ${invoiceNumber}`)
      }

      generatedCount++
      console.log('')
    }

    console.log('─'.repeat(60))
    console.log(`\n✨ Summary:`)
    console.log(`   📊 Agreements processed: ${agreements.length}`)
    console.log(`   ✅ Invoices ${dryRun ? 'would be' : ''} generated: ${generatedCount}`)

    if (!dryRun && invoicesCreated.length > 0) {
      console.log(`\n📋 Invoices Created:`)
      invoicesCreated.forEach((inv) => {
        console.log(`   • ${inv.invoiceNumber} - ${inv.client.name} - $${Number(inv.totalAmount).toFixed(2)}`)
      })
    }

    console.log('\n✅ Invoice generation complete!\n')

    return {
      generated: generatedCount,
      total: agreements.length,
      invoices: invoicesCreated,
    }
  } catch (error) {
    console.error('\n❌ Error generating invoices:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dryRun') || args.includes('--dry-run')

  const billingDayArg = args.find(arg => arg.startsWith('--billingDay='))
  const billingDay = billingDayArg
    ? parseInt(billingDayArg.split('=')[1])
    : undefined

  const targetDateArg = args.find(arg => arg.startsWith('--date='))
  const targetDate = targetDateArg
    ? new Date(targetDateArg.split('=')[1])
    : undefined

  generateRecurringInvoices({ dryRun, billingDay, targetDate })
    .then((result) => {
      process.exit(0)
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { generateRecurringInvoices }
