/**
 * One-off read-only probe: portal AR state vs QBO, and fake QB sync IDs.
 *   npx tsx scripts/ar-state-check.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const [invoiceCount, byStatus, fakeQbInvoices, fakeQbClients, clientCount, qbLinkedClients, paymentCount, openAgg] =
    await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.groupBy({ by: ['status'], _count: true, _sum: { balanceDue: true, totalAmount: true } }),
      prisma.invoice.findMany({
        where: { qbInvoiceId: { not: null } },
        select: { invoiceNumber: true, qbInvoiceId: true, status: true, totalAmount: true },
      }),
      prisma.client.findMany({
        where: { qbCustomerId: { not: null } },
        select: { name: true, qbCustomerId: true },
      }),
      prisma.client.count(),
      prisma.client.count({ where: { qbCustomerId: { not: null } } }),
      prisma.payment.count(),
      prisma.invoice.aggregate({
        where: { status: { in: ['sent', 'viewed', 'partial', 'overdue'] } },
        _sum: { balanceDue: true },
        _count: true,
      }),
    ])

  console.log(JSON.stringify({
    invoiceCount,
    byStatus,
    openInvoices: openAgg._count,
    openBalanceDue: openAgg._sum.balanceDue,
    clientCount,
    qbLinkedClients,
    paymentCount,
    invoicesWithQbId: fakeQbInvoices,
    clientsWithQbId: fakeQbClients,
  }, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
