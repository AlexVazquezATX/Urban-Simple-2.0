import { cn } from '@/lib/utils'

// Pastel chips shared by the issues + requests lists and the detail page:
// open→peach, in progress→sky, resolved→sage. Requests read "Received"
// instead of "Open".

const STATUS_CLASSES: Record<string, string> = {
  open: 'border-peach-line bg-peach-bg text-peach-deep',
  in_progress: 'border-sky-line bg-sky-bg text-sky-deep',
  resolved: 'border-sage-line bg-sage-bg text-sage-deep',
  closed: 'border-sage-line bg-sage-bg text-sage-deep',
}

export function statusChipLabel(status: string, type?: string): string {
  if (status === 'in_progress') return 'In progress'
  if (status === 'resolved' || status === 'closed') return type === 'request' ? 'Done' : 'Resolved'
  return type === 'request' ? "Received. We're on it" : "Open. We're on it"
}

export function StatusChip({ status, type }: { status: string; type?: string }) {
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-[3px] text-[11.5px] font-semibold',
        STATUS_CLASSES[status] ?? STATUS_CLASSES.open
      )}
    >
      {statusChipLabel(status, type)}
    </span>
  )
}

// Distinct badge for associate-flagged unfinished work.
export function UnfinishedBadge() {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full border border-gold-600/30 bg-gold-600/10 px-2.5 py-[2px] text-[11px] font-semibold text-gold-600">
      Unfinished work
    </span>
  )
}
