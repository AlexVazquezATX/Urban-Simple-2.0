'use client'

import { Badge } from '@/components/ui/badge'

// Facility status → chip tone mapping: success is green, paused needs a
// glance (gold), seasonal pause is informational (teal), pending is neutral,
// closed is attention (coral — never red outside confirm dialogs).
const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'neutral' | 'gold' | 'teal' | 'coral' | 'green' }
> = {
  ACTIVE: { label: 'Active', variant: 'green' },
  PAUSED: { label: 'Paused', variant: 'gold' },
  SEASONAL_PAUSED: { label: 'Seasonal', variant: 'teal' },
  PENDING_APPROVAL: { label: 'Pending', variant: 'neutral' },
  CLOSED: { label: 'Closed', variant: 'coral' },
}

export function FacilityStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING_APPROVAL

  return <Badge variant={config.variant}>{config.label}</Badge>
}
