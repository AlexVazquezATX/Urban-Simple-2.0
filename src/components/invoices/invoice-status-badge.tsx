import { Badge } from '@/components/ui/badge'

/**
 * Invoice status chip — one mapping for list + detail:
 * paid → green · draft → neutral · overdue → coral · sent/partial → teal.
 */
export function InvoiceStatusBadge({
  status,
  isOverdue,
}: {
  status: string
  isOverdue: boolean
}) {
  const variant =
    status === 'paid'
      ? 'green'
      : status === 'draft'
        ? 'neutral'
        : isOverdue
          ? 'coral'
          : 'teal'

  return (
    <Badge variant={variant} className="capitalize">
      {status === 'sent' && isOverdue ? 'Overdue' : status}
    </Badge>
  )
}
