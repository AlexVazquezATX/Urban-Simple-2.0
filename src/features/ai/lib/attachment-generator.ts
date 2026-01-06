/**
 * AI Attachment Generator
 * Generates rich attachments (charts, tables, actions) based on query intent and business context
 */

import type {
  MessageAttachment,
  ChartAttachment,
  TableAttachment,
  ActionAttachment,
  ListAttachment,
  BusinessContext,
} from '../types/ai-types'
import type { QueryIntent } from './query-classifier'

export function generateAttachments(
  intent: QueryIntent,
  context: BusinessContext,
  query: string
): MessageAttachment[] {
  const attachments: MessageAttachment[] = []
  const lowerQuery = query.toLowerCase()

  // Check if user explicitly wants visualizations
  const wantsVisuals =
    lowerQuery.includes('visualize') ||
    lowerQuery.includes('chart') ||
    lowerQuery.includes('graph') ||
    lowerQuery.includes('show me') ||
    lowerQuery.includes('show') ||
    lowerQuery.includes('display') ||
    lowerQuery.includes('table') ||
    lowerQuery.includes('list')

  // ONLY generate attachments if user explicitly asks for them
  if (!wantsVisuals) {
    return []
  }

  // Finance-related attachments
  if (intent === 'finance') {
    // Revenue trend chart
    if (
      lowerQuery.includes('revenue') ||
      lowerQuery.includes('sales') ||
      lowerQuery.includes('trend')
    ) {
      attachments.push(generateRevenueChart(context))
    }

    // Overdue invoices table
    if (
      lowerQuery.includes('overdue') ||
      lowerQuery.includes('owe') ||
      lowerQuery.includes('invoice') ||
      lowerQuery.includes('outstanding') ||
      lowerQuery.includes('ar') ||
      lowerQuery.includes('receivable') ||
      lowerQuery.includes('money')
    ) {
      if (context.overdueInvoices.length > 0) {
        attachments.push(generateOverdueInvoicesTable(context))
        attachments.push(generateCollectionAction())
      }
    }

    // AR aging chart
    if (lowerQuery.includes('aging') || lowerQuery.includes('receivable') || lowerQuery.includes('breakdown')) {
      attachments.push(generateARAgingChart(context))
    }

    // Recent payments table
    if (lowerQuery.includes('payment') || lowerQuery.includes('paid') || lowerQuery.includes('received')) {
      attachments.push(generateRecentPaymentsTable(context))
    }
  }

  // Schedule-related attachments
  if (intent === 'schedule') {
    attachments.push(generateUpcomingShiftsTable(context))
    attachments.push(generateScheduleAction())
  }

  // Team-related attachments
  if (intent === 'team') {
    attachments.push(generateTeamPerformanceList(context))
    attachments.push(generateActiveAssignmentsTable(context))
  }

  // Issues-related attachments
  if (intent === 'issues') {
    attachments.push(generateOpenIssuesTable(context))
    attachments.push(generateIssuesAction())
  }

  // Client-related attachments
  if (intent === 'clients') {
    if (lowerQuery.includes('top') || lowerQuery.includes('best')) {
      attachments.push(generateTopClientsTable(context))
    }
  }

  return attachments
}

function generateRevenueChart(context: BusinessContext): ChartAttachment {
  const months = Object.keys(context.monthlyRevenue).sort()
  const last6Months = months.slice(-6)

  return {
    type: 'chart',
    data: {
      title: 'Revenue Trend (Last 6 Months)',
      chartType: 'line' as const,
      labels: last6Months.map((month) => {
        const [year, monthNum] = month.split('-')
        const date = new Date(parseInt(year), parseInt(monthNum) - 1)
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }),
      datasets: [
        {
          label: 'Revenue',
          data: last6Months.map((month) => context.monthlyRevenue[month] || 0),
          color: '#10b981',
        },
      ],
    },
  }
}

function generateARAgingChart(context: BusinessContext): ChartAttachment {
  const { agingBuckets } = context

  return {
    type: 'chart',
    data: {
      title: 'AR Aging',
      chartType: 'bar' as const,
      labels: ['Current', '1-30 days', '31-60 days', '61-90 days', '90+ days'],
      datasets: [
        {
          label: 'Amount ($)',
          data: [
            agingBuckets.current,
            agingBuckets.days30,
            agingBuckets.days60,
            agingBuckets.days90,
            agingBuckets.days90Plus,
          ],
          color: '#ef4444',
        },
      ],
    },
  }
}

function generateOverdueInvoicesTable(context: BusinessContext): TableAttachment {
  const topOverdue = context.overdueInvoices.slice(0, 10)

  return {
    type: 'table',
    data: {
      title: 'Overdue Invoices',
      headers: ['Invoice #', 'Client', 'Amount', 'Days Overdue'],
      rows: topOverdue.map((inv) => ({
        cells: [
          inv.invoiceNumber,
          inv.clientName,
          `$${inv.amount.toLocaleString()}`,
          `${inv.daysOverdue} days`,
        ],
        link: `/invoices/${inv.id}`,
      })),
    },
  }
}

function generateRecentPaymentsTable(context: BusinessContext): TableAttachment {
  const recentPayments = context.recentPayments.slice(0, 10)

  return {
    type: 'table',
    data: {
      title: 'Recent Payments',
      headers: ['Client', 'Amount', 'Date'],
      rows: recentPayments.map((pmt) => ({
        cells: [
          pmt.clientName,
          `$${pmt.amount.toLocaleString()}`,
          new Date(pmt.date).toLocaleDateString(),
        ],
      })),
    },
  }
}

function generateUpcomingShiftsTable(context: BusinessContext): TableAttachment {
  const upcoming = context.upcomingShifts.slice(0, 10)

  return {
    type: 'table',
    data: {
      title: 'Upcoming Shifts',
      headers: ['Date', 'Time', 'Associate', 'Locations', 'Status'],
      rows: upcoming.map((shift) => ({
        cells: [
          new Date(shift.date).toLocaleDateString(),
          `${shift.startTime} - ${shift.endTime}`,
          shift.associateName,
          shift.locationNames.join(', '),
          shift.status,
        ],
        link: `/operations/schedule?shiftId=${shift.id}`,
      })),
    },
  }
}

function generateActiveAssignmentsTable(context: BusinessContext): TableAttachment {
  const assignments = context.activeAssignments.slice(0, 10)

  return {
    type: 'table',
    data: {
      title: 'Active Assignments',
      headers: ['Associate', 'Location', 'Monthly Pay', 'Start Date'],
      rows: assignments.map((assignment) => ({
        cells: [
          assignment.associateName,
          assignment.locationName,
          `$${assignment.monthlyPay.toLocaleString()}`,
          new Date(assignment.startDate).toLocaleDateString(),
        ],
      })),
    },
  }
}

function generateTeamPerformanceList(context: BusinessContext): ListAttachment {
  const { teamPerformance } = context

  return {
    type: 'list',
    data: {
      title: 'Team Performance',
      items: [
        {
          label: 'Average Service Rating',
          value: `${teamPerformance.avgServiceRating.toFixed(1)}/5.0`,
        },
        {
          label: 'Services This Month',
          value: teamPerformance.totalServicesThisMonth.toString(),
        },
        {
          label: 'Completion Rate',
          value: `${teamPerformance.completionRate.toFixed(1)}%`,
        },
      ],
    },
  }
}

function generateOpenIssuesTable(context: BusinessContext): TableAttachment {
  const issues = context.openIssues.slice(0, 10)

  return {
    type: 'table',
    data: {
      title: 'Open Issues',
      headers: ['Title', 'Location', 'Severity', 'Days Open'],
      rows: issues.map((issue) => ({
        cells: [
          issue.title,
          `${issue.locationName} (${issue.clientName})`,
          issue.severity,
          `${issue.daysOpen} days`,
        ],
      })),
    },
  }
}

function generateTopClientsTable(context: BusinessContext): TableAttachment {
  const topClients = context.topClients.slice(0, 10)

  return {
    type: 'table',
    data: {
      title: 'Top Clients by Revenue',
      headers: ['Client', 'Total Revenue', 'Invoices'],
      rows: topClients.map((client) => ({
        cells: [
          client.name,
          `$${client.totalRevenue.toLocaleString()}`,
          client.invoiceCount.toString(),
        ],
        link: `/clients/${client.id}`,
      })),
    },
  }
}

function generateCollectionAction(): ActionAttachment {
  return {
    type: 'action',
    data: {
      label: 'Send Payment Reminders',
      href: '/billing?action=send-reminders',
      variant: 'default' as const,
    },
  }
}

function generateScheduleAction(): ActionAttachment {
  return {
    type: 'action',
    data: {
      label: 'View Full Schedule',
      href: '/operations/schedule',
      variant: 'secondary' as const,
    },
  }
}

function generateIssuesAction(): ActionAttachment {
  return {
    type: 'action',
    data: {
      label: 'View All Issues',
      href: '/operations',
      variant: 'secondary' as const,
    },
  }
}
