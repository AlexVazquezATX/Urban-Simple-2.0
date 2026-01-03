// AI Chat Types

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  attachments?: MessageAttachment[]
}

export interface MessageAttachment {
  type: 'chart' | 'table' | 'action' | 'link'
  data: any
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
  topClients: Array<{
    id: string
    name: string
    totalRevenue: number
    invoiceCount: number
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

  // Current page context
  currentPage?: string
  currentEntity?: {
    type: 'client' | 'invoice' | 'agreement' | 'payment'
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
