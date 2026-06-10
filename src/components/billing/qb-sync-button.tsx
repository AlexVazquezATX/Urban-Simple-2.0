import { ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface QBSyncButtonProps {
  invoiceId?: string
  qbInvoiceId?: string | null
}

// Mirror-first model: invoices flow FROM QuickBooks, so this shows where the
// invoice lives in QBO instead of pretending to push. Per-invoice push to QBO
// is phase 2 of the integration.
export function QBSyncButton({ qbInvoiceId }: QBSyncButtonProps) {
  if (!qbInvoiceId) return null

  // Backfilled/synced ids are numeric QBO transaction ids; anything else
  // (e.g. legacy placeholder ids) gets a plain badge without a link.
  if (!/^\d+$/.test(qbInvoiceId)) {
    return (
      <Badge variant="outline" className="rounded-sm font-mono text-xs">
        QB: {qbInvoiceId}
      </Badge>
    )
  }

  return (
    <a
      href={`https://qbo.intuit.com/app/invoice?txnId=${qbInvoiceId}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Badge
        variant="outline"
        className="rounded-sm text-xs gap-1 hover:bg-warm-50 dark:hover:bg-charcoal-800"
      >
        View in QuickBooks
        <ExternalLink className="h-3 w-3" />
      </Badge>
    </a>
  )
}
