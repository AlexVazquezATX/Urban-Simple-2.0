import { Badge } from '@/components/ui/badge'

// Shared status/severity chips for the staff issue surface. Kept in one place so
// the list and detail views read identically. Tones follow the house palette:
// coral = needs attention, gold = in flight, green = done, neutral = closed.

type BadgeTone = 'neutral' | 'gold' | 'teal' | 'coral' | 'green'

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: 'Open', tone: 'coral' },
  in_progress: { label: 'In Progress', tone: 'gold' },
  resolved: { label: 'Resolved', tone: 'green' },
  closed: { label: 'Closed', tone: 'neutral' },
}

const SEVERITY_META: Record<string, { label: string; tone: BadgeTone }> = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'teal' },
  high: { label: 'High', tone: 'gold' },
  critical: { label: 'Critical', tone: 'coral' },
}

export function IssueStatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: 'neutral' as BadgeTone }
  return <Badge variant={meta.tone}>{meta.label}</Badge>
}

export function IssueSeverityBadge({ severity }: { severity: string }) {
  const meta = SEVERITY_META[severity] ?? { label: severity, tone: 'neutral' as BadgeTone }
  return <Badge variant={meta.tone}>{meta.label}</Badge>
}

export function issueStatusLabel(status: string) {
  return STATUS_META[status]?.label ?? status
}
