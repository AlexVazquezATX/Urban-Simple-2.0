'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  History,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

interface AuditLogEntry {
  id: string
  userId: string
  action: string
  entityType: string
  entityId: string
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}

interface ChangelogResponse {
  items: AuditLogEntry[]
  nextCursor: string | null
  hasMore: boolean
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: 'Created', icon: Plus, color: 'bg-lime-100 text-lime-700 border-lime-200' },
  update: { label: 'Updated', icon: Pencil, color: 'bg-ocean-100 text-ocean-700 border-ocean-200' },
  delete: { label: 'Deleted', icon: Trash2, color: 'bg-red-100 text-red-700 border-red-200' },
  status_change: { label: 'Status changed', icon: ToggleLeft, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
}

const ENTITY_LABELS: Record<string, string> = {
  facility_profile: 'Facility',
  monthly_override: 'Monthly Override',
  seasonal_rule: 'Seasonal Rule',
  client: 'Client',
}

const FIELD_LABELS: Record<string, string> = {
  defaultMonthlyRate: 'Monthly Rate',
  status: 'Status',
  category: 'Category',
  rateType: 'Rate Type',
  taxBehavior: 'Tax Behavior',
  normalDaysOfWeek: 'Days of Week',
  normalFrequencyPerWeek: 'Frequency',
  seasonalRulesEnabled: 'Seasonal Rules',
  scopeOfWorkNotes: 'Scope of Work',
  goLiveDate: 'Go-Live Date',
  sortOrder: 'Sort Order',
  overrideStatus: 'Override Status',
  overrideRate: 'Override Rate',
  overrideFrequency: 'Override Frequency',
  overrideDaysOfWeek: 'Override Days',
  overrideNotes: 'Notes',
  pauseStartDay: 'Pause Start Day',
  pauseEndDay: 'Pause End Day',
  activeMonths: 'Active Months',
  pausedMonths: 'Paused Months',
  effectiveYearStart: 'Effective Year Start',
  effectiveYearEnd: 'Effective Year End',
  isActive: 'Active',
  notes: 'Notes',
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '-'

  if (field === 'normalDaysOfWeek' || field === 'overrideDaysOfWeek') {
    if (Array.isArray(value)) {
      return value.length === 0 ? '-' : value.map(d => DAY_LABELS[d as number] || d).join(', ')
    }
  }

  if (field === 'activeMonths' || field === 'pausedMonths') {
    if (Array.isArray(value)) {
      return value.length === 0 ? '-' : value.map(m => MONTH_SHORT[m as number] || m).join(', ')
    }
  }

  if (field === 'defaultMonthlyRate' || field === 'overrideRate') {
    return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  if (field === 'normalFrequencyPerWeek' || field === 'overrideFrequency') {
    return `${value}x/week`
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

interface ChangelogTabProps {
  clientId: string
}

export function ChangelogTab({ clientId }: ChangelogTabProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchChangelog = useCallback(async (cursor?: string) => {
    const isLoadMore = !!cursor
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const url = `/api/clients/${clientId}/changelog${cursor ? `?cursor=${cursor}` : ''}`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load changelog')
      }
      const data: ChangelogResponse = await res.json()

      if (isLoadMore) {
        setEntries(prev => [...prev, ...data.items])
      } else {
        setEntries(data.items)
      }
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchChangelog()
  }, [fetchChangelog])

  if (loading) return <ChangelogSkeleton />

  if (error) {
    return (
      <Card className="border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
          <p className="text-sm text-warm-600 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchChangelog()} className="rounded-sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (entries.length === 0) {
    return (
      <Card className="border-warm-200">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <History className="h-12 w-12 text-warm-300 mb-3" />
          <p className="text-sm font-medium text-warm-700">No changes recorded yet</p>
          <p className="text-xs text-warm-500 mt-1">
            Changes to facilities, overrides, and seasonal rules will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group entries by date
  const grouped = groupByDate(entries)

  return (
    <Card className="border-warm-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-display font-medium text-warm-900">
            Change Log
          </CardTitle>
          <span className="text-xs text-warm-500">
            {entries.length} changes{hasMore ? '+' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-warm-100">
          {grouped.map(({ dateLabel, items }) => (
            <div key={dateLabel}>
              <div className="px-4 py-2 bg-warm-50/50 sticky top-0">
                <p className="text-xs font-medium text-warm-500">{dateLabel}</p>
              </div>
              <div className="divide-y divide-warm-100">
                {items.map(entry => (
                  <ChangelogEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="p-4 text-center border-t border-warm-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchChangelog(nextCursor!)}
              disabled={loadingMore}
              className="rounded-sm border-warm-200 text-warm-700"
            >
              {loadingMore ? (
                'Loading...'
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                  Load More
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ChangelogEntry({ entry }: { entry: AuditLogEntry }) {
  const [expanded, setExpanded] = useState(false)
  const config = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update
  const Icon = config.icon
  const entityLabel = ENTITY_LABELS[entry.entityType] || entry.entityType
  const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const hasDetails = (entry.action === 'update' || entry.action === 'status_change')
    && entry.oldValues && entry.newValues
    && Object.keys(entry.oldValues).length > 0

  const hasCreateDetails = entry.action === 'create' && entry.newValues && Object.keys(entry.newValues).length > 0

  return (
    <div className="px-4 py-3">
      <div
        className={`flex items-start gap-3 ${hasDetails || hasCreateDetails ? 'cursor-pointer' : ''}`}
        onClick={() => (hasDetails || hasCreateDetails) && setExpanded(!expanded)}
      >
        <div className={`flex-shrink-0 mt-0.5 p-1 rounded-sm border ${config.color}`}>
          <Icon className="h-3 w-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-warm-800">
              <span className="font-medium">{entry.user.firstName} {entry.user.lastName}</span>
              {' '}{config.label.toLowerCase()}{' '}
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warm-200 text-warm-600">
                {entityLabel}
              </Badge>
            </span>
            {(hasDetails || hasCreateDetails) && (
              <ChevronDown className={`h-3 w-3 text-warm-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            )}
          </div>
          <p className="text-xs text-warm-500 mt-0.5">{time}</p>
        </div>
      </div>

      {/* Field-level changes */}
      {expanded && hasDetails && entry.oldValues && entry.newValues && (
        <div className="mt-2 ml-9 space-y-1.5">
          {Object.keys(entry.newValues).map(field => (
            <div key={field} className="flex items-start gap-2 text-xs">
              <span className="text-warm-500 min-w-[120px] flex-shrink-0">
                {FIELD_LABELS[field] || field}
              </span>
              <span className="text-red-500 line-through">
                {formatFieldValue(field, entry.oldValues![field])}
              </span>
              <span className="text-warm-400">&rarr;</span>
              <span className="text-lime-700 font-medium">
                {formatFieldValue(field, entry.newValues![field])}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create details */}
      {expanded && hasCreateDetails && entry.newValues && (
        <div className="mt-2 ml-9 space-y-1.5">
          {Object.keys(entry.newValues).map(field => (
            <div key={field} className="flex items-start gap-2 text-xs">
              <span className="text-warm-500 min-w-[120px] flex-shrink-0">
                {FIELD_LABELS[field] || field}
              </span>
              <span className="text-lime-700 font-medium">
                {formatFieldValue(field, entry.newValues![field])}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────

function groupByDate(entries: AuditLogEntry[]) {
  const groups: { dateLabel: string; items: AuditLogEntry[] }[] = []
  let currentLabel = ''

  for (const entry of entries) {
    const label = formatDateLabel(entry.createdAt)
    if (label !== currentLabel) {
      currentLabel = label
      groups.push({ dateLabel: label, items: [] })
    }
    groups[groups.length - 1].items.push(entry)
  }

  return groups
}

function formatDateLabel(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = today.getTime() - entryDate.getTime()
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (daysDiff === 0) return 'Today'
  if (daysDiff === 1) return 'Yesterday'
  if (daysDiff < 7) return `${daysDiff} days ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

function ChangelogSkeleton() {
  return (
    <Card className="border-warm-200">
      <CardHeader className="pb-3">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-6 w-6 rounded-sm" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
