'use client'

import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-lime-100 text-lime-700 border-lime-200',
  },
  PAUSED: {
    label: 'Paused',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  SEASONAL_PAUSED: {
    label: 'Seasonal',
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  PENDING_APPROVAL: {
    label: 'Pending',
    className: 'bg-warm-100 text-warm-600 border-warm-200',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
}

export function FacilityStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_APPROVAL

  return (
    <Badge className={`rounded-sm text-[10px] px-1.5 py-0 ${config.className}`}>
      {config.label}
    </Badge>
  )
}
