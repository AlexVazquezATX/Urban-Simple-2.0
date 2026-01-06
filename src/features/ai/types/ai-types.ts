// AI Chat Types

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  type: 'chart' | 'table' | 'action' | 'link' | 'list'
  data: any
}

export interface ChartAttachment extends MessageAttachment {
  type: 'chart'
  data: {
    title: string
    chartType: 'line' | 'bar' | 'pie'
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      color?: string
    }>
  }
}

export interface TableAttachment extends MessageAttachment {
  type: 'table'
  data: {
    title: string
    headers: string[]
    rows: Array<{
      cells: string[]
      link?: string // Deep link to entity
    }>
  }
}

export interface ActionAttachment extends MessageAttachment {
  type: 'action'
  data: {
    label: string
    href: string
    variant?: 'default' | 'secondary' | 'destructive'
  }
}

export interface ListAttachment extends MessageAttachment {
  type: 'list'
  data: {
    title: string
    items: Array<{
      label: string
      value: string
      link?: string
    }>
  }
}

export interface BusinessContext {
  // Current business snapshot
  stats: {
    totalRevenue: number
    outstandingAR: number
    clientCount: number
    invoiceCount: number
    avgInvoiceAmount: number
    mrrAmount: number
    activeLocations: number
    totalAssociates: number
    scheduledShiftsThisWeek: number
    openIssues: number
  }

  // Recent activity
  recentInvoices: Array<{
    id: string
    invoiceNumber: string
    clientName: string
    amount: number
    status: string
    dueDate: Date
  }>

  recentPayments: Array<{
    id: string
    amount: number
    clientName: string
    date: Date
  }>

  // Client data
  allClients: Array<{
    id: string
    name: string
    status: string
    locationCount: number
  }>

  topClients: Array<{
    id: string
    name: string
    totalRevenue: number
    invoiceCount: number
  }>

  // Location data
  allLocations: Array<{
    id: string
    name: string
    clientName: string
    isActive: boolean
  }>

  // Time period data
  monthlyRevenue: Record<string, number>

  // AR aging
  agingBuckets: {
    current: number
    days30: number
    days60: number
    days90: number
    days90Plus: number
  }

  // Overdue invoices with details
  overdueInvoices: Array<{
    id: string
    invoiceNumber: string
    clientName: string
    amount: number
    dueDate: Date
    daysOverdue: number
  }>

  // Operations data
  upcomingShifts: Array<{
    id: string
    date: Date
    startTime: string
    endTime: string
    associateName: string
    locationNames: string[]
    status: string
  }>

  activeAssignments: Array<{
    id: string
    associateName: string
    locationName: string
    monthlyPay: number
    startDate: Date
  }>

  openIssues: Array<{
    id: string
    title: string
    category: string
    severity: string
    locationName: string
    clientName: string
    reportedBy: string
    daysOpen: number
  }>

  recentServiceLogs: Array<{
    id: string
    locationName: string
    associateName: string
    serviceDate: Date
    status: string
    hoursWorked?: number
  }>

  teamPerformance: {
    avgServiceRating: number
    totalServicesThisMonth: number
    completionRate: number
  }

  // Current page context
  currentPage?: string
  currentEntity?: {
    type: 'client' | 'invoice' | 'agreement' | 'payment' | 'location' | 'shift' | 'associate'
    id: string
    data: any
  }
}

export interface AIQueryResult {
  success: boolean
  response?: string
  error?: string
  suggestions?: string[]
  attachments?: MessageAttachment[]
}

export interface ConversationHistory {
  messages: ChatMessage[]
  lastUpdated: Date
}
