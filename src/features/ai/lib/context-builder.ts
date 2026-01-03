import { prisma } from '@/lib/db'
import type { BusinessContext } from '../types/ai-types'

/**
 * Build comprehensive business context for AI queries
 */
export async function buildBusinessContext(
  userId?: string
): Promise<BusinessContext> {
  try {
    // For now, get all data (single-user mode)
    // In multi-user app, filter by userId

    // Get overall stats
    const [
      totalRevenue,
      outstandingAR,
      clientCount,
      invoiceCount,
      avgInvoiceData,
      mrrData,
    ] = await Promise.all([
      // Total revenue (all paid invoices)
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: { status: { in: ['paid', 'partial'] } },
      }),

      // Outstanding AR (unpaid + partial)
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: { balanceDue: { gt: 0 } },
      }),

      // Client count
      prisma.client.count(),

      // Invoice count
      prisma.invoice.count(),

      // Average invoice amount
      prisma.invoice.aggregate({
        _avg: { totalAmount: true },
      }),

      // MRR from service agreements
      prisma.serviceAgreement.aggregate({
        _sum: { monthlyAmount: true },
        where: { isActive: true },
      }),
    ])

    // Get recent invoices (last 10)
    const recentInvoices = await prisma.invoice.findMany({
      take: 10,
      orderBy: { issueDate: 'desc' },
      include: {
        client: {
          select: { name: true },
        },
      },
    })

    // Get recent payments (last 10)
    const recentPayments = await prisma.payment.findMany({
      take: 10,
      orderBy: { paymentDate: 'desc' },
      include: {
        invoice: {
          include: {
            client: {
              select: { name: true },
            },
          },
        },
      },
    })

    // Get top clients by revenue
    const clientRevenue = await prisma.invoice.groupBy({
      by: ['clientId'],
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 5,
    })

    const topClientIds = clientRevenue.map((cr) => cr.clientId)
    const topClientsData = await prisma.client.findMany({
      where: { id: { in: topClientIds } },
      select: { id: true, name: true },
    })

    const topClients = clientRevenue.map((cr) => {
      const client = topClientsData.find((c) => c.id === cr.clientId)
      return {
        id: cr.clientId,
        name: client?.name || 'Unknown',
        totalRevenue: Number(cr._sum.totalAmount || 0),
        invoiceCount: cr._count.id,
      }
    })

    // Get monthly revenue for last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const invoicesByMonth = await prisma.invoice.findMany({
      where: {
        issueDate: { gte: sixMonthsAgo },
        status: { in: ['paid', 'partial', 'sent'] },
      },
      select: {
        issueDate: true,
        totalAmount: true,
      },
    })

    const monthlyRevenue: Record<string, number> = {}
    invoicesByMonth.forEach((inv) => {
      const monthKey = new Date(inv.issueDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      })
      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] || 0) + Number(inv.totalAmount)
    })

    // Get overdue invoices with client details
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        balanceDue: { gt: 0 },
        dueDate: { lt: new Date() },
      },
      include: {
        client: {
          select: { name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    // Calculate AR aging buckets
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    const [current, days30, days60, days90, days90Plus] = await Promise.all([
      // Current (0-30 days)
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: { gte: thirtyDaysAgo },
        },
      }),
      // 31-60 days
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        },
      }),
      // 61-90 days
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: { gte: ninetyDaysAgo, lt: sixtyDaysAgo },
        },
      }),
      // 90+ days (split for better tracking)
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: { lt: ninetyDaysAgo },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceDue: true },
        where: {
          balanceDue: { gt: 0 },
          dueDate: { lt: ninetyDaysAgo },
        },
      }),
    ])

    return {
      stats: {
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        outstandingAR: Number(outstandingAR._sum.balanceDue || 0),
        clientCount: clientCount,
        invoiceCount: invoiceCount,
        avgInvoiceAmount: Number(avgInvoiceData._avg.totalAmount || 0),
        mrrAmount: Number(mrrData._sum.monthlyAmount || 0),
      },
      recentInvoices: recentInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        amount: Number(inv.totalAmount),
        status: inv.status,
        dueDate: inv.dueDate,
      })),
      recentPayments: recentPayments.map((pmt) => ({
        id: pmt.id,
        amount: Number(pmt.amount),
        clientName: pmt.invoice.client.name,
        date: pmt.paymentDate,
      })),
      topClients,
      monthlyRevenue,
      agingBuckets: {
        current: Number(current._sum.balanceDue || 0),
        days30: Number(days30._sum.balanceDue || 0),
        days60: Number(days60._sum.balanceDue || 0),
        days90: Number(days90._sum.balanceDue || 0),
        days90Plus: Number(days90Plus._sum.balanceDue || 0),
      },
      overdueInvoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        amount: Number(inv.balanceDue),
        dueDate: inv.dueDate,
        daysOverdue: Math.floor(
          (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
    }
  } catch (error) {
    console.error('Error building business context:', error)
    throw new Error('Failed to build business context')
  }
}

/**
 * Format business context as a readable string for AI
 */
export function formatContextForAI(context: BusinessContext): string {
  const formatted = `
BUSINESS OVERVIEW:
- Total Revenue: $${context.stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Outstanding AR: $${context.stats.outstandingAR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Active Clients: ${context.stats.clientCount}
- Total Invoices: ${context.stats.invoiceCount}
- Average Invoice: $${context.stats.avgInvoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Monthly Recurring Revenue: $${context.stats.mrrAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}

TOP CLIENTS (by revenue):
${context.topClients.map((c, i) => `${i + 1}. ${c.name}: $${c.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${c.invoiceCount} invoices)`).join('\n')}

RECENT INVOICES:
${context.recentInvoices.slice(0, 5).map((inv) => `- ${inv.invoiceNumber} for ${inv.clientName}: $${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${inv.status})`).join('\n')}

AR AGING:
- On Time (0-30 days): $${context.agingBuckets.current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- 1-2 Months Late: $${context.agingBuckets.days30.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- 2-3 Months Late: $${context.agingBuckets.days60.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- 3+ Months Late: $${context.agingBuckets.days90Plus.toLocaleString('en-US', { minimumFractionDigits: 2 })}

OVERDUE INVOICES (sorted by oldest first):
${context.overdueInvoices.slice(0, 10).map((inv) => `- ${inv.clientName}: $${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${inv.invoiceNumber}, ${inv.daysOverdue} days overdue)`).join('\n')}

MONTHLY REVENUE TREND:
${Object.entries(context.monthlyRevenue)
  .slice(-6)
  .map(([month, amount]) => `- ${month}: $${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
  .join('\n')}
`

  return formatted.trim()
}
