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
      activeLocations,
      totalAssociates,
      openIssuesCount,
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

      // Active locations
      prisma.location.count({
        where: { isActive: true },
      }),

      // Total associates
      prisma.user.count({
        where: {
          role: 'ASSOCIATE',
          isActive: true,
        },
      }),

      // Open issues
      prisma.issue.count({
        where: { status: { in: ['open', 'in_progress'] } },
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

    // Get ALL clients (so new clients show up)
    const allClients = await prisma.client.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        name: true,
        status: true,
        _count: {
          select: { locations: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Get ALL active locations
    const allLocations = await prisma.location.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        isActive: true,
        client: {
          select: { name: true },
        },
      },
      orderBy: { name: 'asc' },
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

    // Get upcoming shifts (next 7 days)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    const startOfWeek = new Date()
    startOfWeek.setHours(0, 0, 0, 0)

    const upcomingShifts = await prisma.shift.findMany({
      where: {
        date: {
          gte: startOfWeek,
          lte: sevenDaysFromNow,
        },
        status: { in: ['scheduled', 'in_progress'] },
      },
      take: 15,
      orderBy: { date: 'asc' },
      include: {
        associate: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        location: {
          select: { name: true },
        },
        shiftLocations: {
          include: {
            location: {
              select: { name: true },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    })

    // Count shifts this week
    const scheduledShiftsThisWeek = await prisma.shift.count({
      where: {
        date: {
          gte: startOfWeek,
          lte: sevenDaysFromNow,
        },
        status: { in: ['scheduled', 'in_progress'] },
      },
    })

    // Get active location assignments
    const activeAssignments = await prisma.locationAssignment.findMany({
      where: { isActive: true },
      take: 10,
      orderBy: { startDate: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        location: {
          select: { name: true },
        },
      },
    })

    // Get open issues
    const openIssues = await prisma.issue.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        location: {
          select: { name: true },
        },
        client: {
          select: { name: true },
        },
        reportedBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Get recent service logs (last 10)
    const recentServiceLogs = await prisma.serviceLog.findMany({
      take: 10,
      orderBy: { serviceDate: 'desc' },
      include: {
        location: {
          select: { name: true },
        },
        associate: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    // Get team performance metrics
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    thisMonthStart.setHours(0, 0, 0, 0)

    const [avgRating, servicesThisMonth, completedShifts, totalShiftsThisMonth] =
      await Promise.all([
        prisma.serviceReview.aggregate({
          _avg: { overallRating: true },
          where: {
            reviewDate: { gte: thisMonthStart },
          },
        }),
        prisma.serviceLog.count({
          where: {
            serviceDate: { gte: thisMonthStart },
          },
        }),
        prisma.shift.count({
          where: {
            date: { gte: thisMonthStart },
            status: 'completed',
          },
        }),
        prisma.shift.count({
          where: {
            date: { gte: thisMonthStart },
          },
        }),
      ])

    const completionRate =
      totalShiftsThisMonth > 0
        ? (completedShifts / totalShiftsThisMonth) * 100
        : 0

    return {
      stats: {
        totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
        outstandingAR: Number(outstandingAR._sum.balanceDue || 0),
        clientCount: clientCount,
        invoiceCount: invoiceCount,
        avgInvoiceAmount: Number(avgInvoiceData._avg.totalAmount || 0),
        mrrAmount: Number(mrrData._sum.monthlyAmount || 0),
        activeLocations: activeLocations,
        totalAssociates: totalAssociates,
        scheduledShiftsThisWeek: scheduledShiftsThisWeek,
        openIssues: openIssuesCount,
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
        clientName: pmt.invoice?.client.name || 'Unknown',
        date: pmt.paymentDate,
      })),
      allClients: allClients.map((client) => ({
        id: client.id,
        name: client.name,
        status: client.status,
        locationCount: client._count.locations,
      })),
      topClients,
      allLocations: allLocations.map((location) => ({
        id: location.id,
        name: location.name,
        clientName: location.client.name,
        isActive: location.isActive,
      })),
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
      upcomingShifts: upcomingShifts.map((shift) => {
        // Get location names from either single location or multiple locations
        const locationNames = shift.shiftLocations.length > 0
          ? shift.shiftLocations.map((sl) => sl.location.name)
          : shift.location
          ? [shift.location.name]
          : []

        return {
          id: shift.id,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          associateName: `${shift.associate.firstName} ${shift.associate.lastName}`,
          locationNames,
          status: shift.status,
        }
      }),
      activeAssignments: activeAssignments.map((assignment) => ({
        id: assignment.id,
        associateName: `${assignment.user.firstName} ${assignment.user.lastName}`,
        locationName: assignment.location.name,
        monthlyPay: Number(assignment.monthlyPay),
        startDate: assignment.startDate,
      })),
      openIssues: openIssues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        category: issue.category,
        severity: issue.severity,
        locationName: issue.location.name,
        clientName: issue.client.name,
        reportedBy: `${issue.reportedBy.firstName} ${issue.reportedBy.lastName}`,
        daysOpen: Math.floor(
          (now.getTime() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      })),
      recentServiceLogs: recentServiceLogs.map((log) => {
        const hoursWorked =
          log.clockIn && log.clockOut
            ? (log.clockOut.getTime() - log.clockIn.getTime()) / (1000 * 60 * 60)
            : undefined

        return {
          id: log.id,
          locationName: log.location.name,
          associateName: `${log.associate.firstName} ${log.associate.lastName}`,
          serviceDate: log.serviceDate,
          status: log.status,
          hoursWorked,
        }
      }),
      teamPerformance: {
        avgServiceRating: Number(avgRating._avg.overallRating || 0),
        totalServicesThisMonth: servicesThisMonth,
        completionRate: Number(completionRate.toFixed(1)),
      },
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
- Monthly Recurring Revenue: $${context.stats.mrrAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Active Clients: ${context.stats.clientCount}
- Active Locations: ${context.stats.activeLocations}
- Total Associates: ${context.stats.totalAssociates}
- Scheduled Shifts This Week: ${context.stats.scheduledShiftsThisWeek}
- Open Issues: ${context.stats.openIssues}

TEAM PERFORMANCE (This Month):
- Average Service Rating: ${context.teamPerformance.avgServiceRating.toFixed(1)}/5.0
- Total Services Completed: ${context.teamPerformance.totalServicesThisMonth}
- Shift Completion Rate: ${context.teamPerformance.completionRate}%

UPCOMING SHIFTS (Next 7 Days):
${context.upcomingShifts.length > 0 ? context.upcomingShifts.slice(0, 10).map((shift) => {
  const dateStr = new Date(shift.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const locations = shift.locationNames.join(', ') || 'No location'
  return `- ${dateStr} ${shift.startTime}-${shift.endTime}: ${shift.associateName} at ${locations} (${shift.status})`
}).join('\n') : '- No upcoming shifts scheduled'}

ACTIVE LOCATION ASSIGNMENTS:
${context.activeAssignments.length > 0 ? context.activeAssignments.slice(0, 8).map((assignment) => {
  const startDate = new Date(assignment.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `- ${assignment.associateName} → ${assignment.locationName} ($${assignment.monthlyPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}/mo since ${startDate})`
}).join('\n') : '- No active assignments'}

OPEN ISSUES:
${context.openIssues.length > 0 ? context.openIssues.map((issue) => `- [${issue.severity.toUpperCase()}] ${issue.title} at ${issue.locationName} (${issue.clientName}) - Reported by ${issue.reportedBy} ${issue.daysOpen} days ago`).join('\n') : '- No open issues'}

RECENT SERVICE LOGS:
${context.recentServiceLogs.length > 0 ? context.recentServiceLogs.slice(0, 5).map((log) => {
  const dateStr = new Date(log.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const hours = log.hoursWorked ? ` (${log.hoursWorked.toFixed(1)}h)` : ''
  return `- ${dateStr}: ${log.associateName} at ${log.locationName}${hours} - ${log.status}`
}).join('\n') : '- No recent service logs'}

ALL ACTIVE CLIENTS (${context.allClients.length} total):
${context.allClients.map((c) => `- ${c.name} (${c.locationCount} location${c.locationCount !== 1 ? 's' : ''})`).join('\n')}

ALL ACTIVE LOCATIONS (${context.allLocations.length} total):
${context.allLocations.map((loc) => `- ${loc.name} (Client: ${loc.clientName})`).join('\n')}

TOP CLIENTS (by revenue):
${context.topClients.length > 0 ? context.topClients.map((c, i) => `${i + 1}. ${c.name}: $${c.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })} (${c.invoiceCount} invoices)`).join('\n') : '- No revenue data yet'}

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
