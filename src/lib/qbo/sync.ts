/**
 * QBO mirror sync (phase 1: QuickBooks is the source of truth).
 *
 * Pulls invoices and payments changed in QBO since the last sync and mirrors
 * them into the portal for clients linked via Client.qbCustomerId. Customers
 * without a linked portal client are skipped on purpose: stale and dead
 * accounts stay out of the portal.
 *
 * Phase 2 (portal -> QBO invoice push) will live alongside this; nothing here
 * writes to QuickBooks.
 */
import { prisma } from '@/lib/db'
import { qboQueryAll } from '@/lib/qbo/client'

interface QboLine {
  DetailType?: string
  Description?: string
  Amount?: number
  SalesItemLineDetail?: { Qty?: number; UnitPrice?: number }
  LinkedTxn?: Array<{ TxnId: string; TxnType: string }>
}

interface QboInvoice {
  Id: string
  DocNumber?: string
  TxnDate: string
  DueDate?: string
  TotalAmt: number
  Balance: number
  PrivateNote?: string
  CustomerRef: { value: string }
  TxnTaxDetail?: { TotalTax?: number }
  Line?: QboLine[]
  MetaData?: { LastUpdatedTime?: string }
}

interface QboPayment {
  Id: string
  TxnDate: string
  TotalAmt: number
  PaymentRefNum?: string
  PrivateNote?: string
  CustomerRef?: { value: string }
  PaymentMethodRef?: { name?: string }
  Line?: QboLine[]
  MetaData?: { LastUpdatedTime?: string }
}

export interface QboSyncResult {
  invoicesCreated: number
  invoicesUpdated: number
  invoicesSkipped: number
  paymentsCreated: number
  paymentsSkipped: number
}

const FIRST_SYNC_FROM = '2023-01-01T00:00:00Z'
// Re-scan a day of overlap so edits racing the previous sync are not missed.
const OVERLAP_MS = 24 * 60 * 60 * 1000

function invoiceStatus(total: number, balance: number, current?: string): string {
  if (balance <= 0) return total === 0 && current === 'void' ? 'void' : 'paid'
  if (balance < total) return 'partial'
  // Leave portal-side lifecycle statuses alone for still-unpaid invoices.
  return current && ['sent', 'viewed', 'overdue'].includes(current) ? current : 'sent'
}

function mapPaymentMethod(name?: string): string {
  const n = (name ?? '').toLowerCase()
  if (n.includes('check')) return 'check'
  if (n.includes('cash')) return 'cash'
  if (n.includes('credit') || n.includes('card')) return 'credit_card'
  if (n.includes('ach') || n.includes('bank') || n.includes('transfer') || n.includes('wire')) return 'ach'
  return 'other'
}

export async function syncFromQbo(companyId: string): Promise<QboSyncResult> {
  const startedAt = new Date()
  const connection = await prisma.qBOConnection.findUnique({ where: { companyId } })
  if (!connection || !connection.isActive) {
    throw new Error('QuickBooks is not connected for this company')
  }

  const since = connection.lastSyncAt
    ? new Date(connection.lastSyncAt.getTime() - OVERLAP_MS).toISOString()
    : FIRST_SYNC_FROM

  const result: QboSyncResult = {
    invoicesCreated: 0,
    invoicesUpdated: 0,
    invoicesSkipped: 0,
    paymentsCreated: 0,
    paymentsSkipped: 0,
  }

  try {
    const clients = await prisma.client.findMany({
      where: { companyId, qbCustomerId: { not: null } },
      select: { id: true, qbCustomerId: true },
    })
    const clientByQbId = new Map(clients.map((c) => [c.qbCustomerId as string, c.id]))

    // --- Invoices changed since last sync (payments bump LastUpdatedTime too) ---
    const invoices = await qboQueryAll<QboInvoice>(
      companyId,
      `SELECT * FROM Invoice WHERE MetaData.LastUpdatedTime >= '${since}'`
    )

    for (const inv of invoices) {
      const clientId = clientByQbId.get(inv.CustomerRef?.value)
      if (!clientId) {
        result.invoicesSkipped++
        continue
      }

      const total = Number(inv.TotalAmt ?? 0)
      const balance = Number(inv.Balance ?? 0)
      const amountPaid = Math.max(0, +(total - balance).toFixed(2))
      const taxAmount = Number(inv.TxnTaxDetail?.TotalTax ?? 0)
      const subtotal = +(total - taxAmount).toFixed(2)

      const existing = await prisma.invoice.findFirst({
        where: { qbInvoiceId: inv.Id, clientId },
        select: { id: true, status: true, paidAt: true },
      })

      if (existing) {
        const status = invoiceStatus(total, balance, existing.status)
        await prisma.invoice.update({
          where: { id: existing.id },
          data: {
            totalAmount: total,
            subtotal,
            taxAmount,
            amountPaid,
            balanceDue: balance,
            status,
            ...(inv.DueDate ? { dueDate: new Date(inv.DueDate) } : {}),
            paidAt:
              status === 'paid' && !existing.paidAt
                ? new Date(inv.MetaData?.LastUpdatedTime ?? Date.now())
                : existing.paidAt,
          },
        })
        result.invoicesUpdated++
        continue
      }

      // New to the portal. Skip fully-voided shells; mirror everything else,
      // including invoices that were created and paid between syncs.
      if (total === 0) {
        result.invoicesSkipped++
        continue
      }

      const lines = (inv.Line ?? []).filter(
        (l) => l.DetailType === 'SalesItemLineDetail'
      )
      const status = invoiceStatus(total, balance)
      await prisma.invoice.create({
        data: {
          clientId,
          invoiceNumber: inv.DocNumber || `QB-${inv.Id}`,
          status,
          issueDate: new Date(inv.TxnDate),
          dueDate: new Date(inv.DueDate ?? inv.TxnDate),
          subtotal,
          taxAmount,
          totalAmount: total,
          amountPaid,
          balanceDue: balance,
          notes: inv.PrivateNote || null,
          sentAt: new Date(inv.TxnDate),
          paidAt: status === 'paid' ? new Date(inv.MetaData?.LastUpdatedTime ?? Date.now()) : null,
          qbInvoiceId: inv.Id,
          lineItems: {
            create: lines.map((l, idx) => ({
              description: l.Description || 'Service',
              quantity: l.SalesItemLineDetail?.Qty ?? 1,
              unitPrice: l.SalesItemLineDetail?.UnitPrice ?? Number(l.Amount ?? 0),
              amount: Number(l.Amount ?? 0),
              sortOrder: idx,
            })),
          },
        },
      })
      result.invoicesCreated++
    }

    // --- Payments changed since last sync ---
    const payments = await qboQueryAll<QboPayment>(
      companyId,
      `SELECT * FROM Payment WHERE MetaData.LastUpdatedTime >= '${since}'`
    )

    for (const pay of payments) {
      const clientId = clientByQbId.get(pay.CustomerRef?.value ?? '')
      if (!clientId) {
        result.paymentsSkipped++
        continue
      }

      const already = await prisma.payment.findFirst({
        where: { qbPaymentId: pay.Id },
        select: { id: true },
      })
      if (already) {
        result.paymentsSkipped++
        continue
      }

      // A QBO payment can settle several invoices; create one portal row per
      // linked invoice so invoice payment history lines up.
      const applications: Array<{ invoiceId: string | null; amount: number }> = []
      for (const line of pay.Line ?? []) {
        const linkedInvoice = (line.LinkedTxn ?? []).find((t) => t.TxnType === 'Invoice')
        if (!linkedInvoice || !line.Amount) continue
        const portalInvoice = await prisma.invoice.findFirst({
          where: { qbInvoiceId: linkedInvoice.TxnId, clientId },
          select: { id: true },
        })
        applications.push({
          invoiceId: portalInvoice?.id ?? null,
          amount: Number(line.Amount),
        })
      }
      if (applications.length === 0) {
        applications.push({ invoiceId: null, amount: Number(pay.TotalAmt ?? 0) })
      }

      for (const app of applications) {
        await prisma.payment.create({
          data: {
            clientId,
            invoiceId: app.invoiceId,
            amount: app.amount,
            paymentMethod: mapPaymentMethod(pay.PaymentMethodRef?.name),
            referenceNumber: pay.PaymentRefNum || null,
            paymentDate: new Date(pay.TxnDate),
            status: 'completed',
            notes: pay.PrivateNote || null,
            qbPaymentId: pay.Id,
          },
        })
      }
      result.paymentsCreated++
    }

    await prisma.qBOConnection.update({
      where: { companyId },
      data: { lastSyncAt: startedAt, lastSyncStatus: 'success', lastSyncError: null },
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await prisma.qBOConnection.update({
      where: { companyId },
      data: { lastSyncStatus: 'error', lastSyncError: message.slice(0, 1000) },
    })
    throw error
  }
}
