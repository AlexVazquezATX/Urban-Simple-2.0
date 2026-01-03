// Invoice number sequence utility
// Format: INV-YYYYMMDD-#### (e.g., INV-20250102-0001)

import { prisma } from '@/lib/db'

export async function generateInvoiceNumber(): Promise<string> {
  const today = new Date()
  const datePrefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`

  // Find the highest invoice number for today
  const todayInvoices = await prisma.invoice.findMany({
    where: {
      invoiceNumber: {
        startsWith: datePrefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    take: 1,
  })

  let sequence = 1
  if (todayInvoices.length > 0) {
    const lastNumber = todayInvoices[0].invoiceNumber
    const lastSequence = parseInt(lastNumber.split('-')[2] || '0')
    sequence = lastSequence + 1
  }

  const sequenceStr = String(sequence).padStart(4, '0')
  return `${datePrefix}-${sequenceStr}`
}

