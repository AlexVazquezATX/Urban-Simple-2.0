'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  EyeOff,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  User,
  UserX,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { currentManagerStrings, useManagerLang } from '@/lib/i18n/use-manager-lang'
import { categoryLabelFor, dateFnsLocale, localeFor } from '@/lib/i18n/manager'
import {
  IssueSeverityBadge,
  IssueSourceBadge,
  IssueStatusBadge,
  IssueTypeBadge,
} from './issue-badges'
import { NewIssueDialog, type LocationOption } from './new-issue-dialog'

interface IssueListItem {
  id: string
  type: string
  source: string
  title: string
  description: string | null
  category: string
  severity: string
  status: string
  photos: string[]
  visibleToClient: boolean
  preferredDate: string | null
  createdAt: string
  resolvedAt: string | null
  location: { id: string; name: string } | null
  client: { id: string; name: string } | null
  reportedBy: { id: string; firstName: string | null; lastName: string | null } | null
  assignedTo: { id: string; firstName: string | null; lastName: string | null } | null
  _count: { comments: number }
}

const VIEWS = ['all', 'unfinished', 'client', 'requests', 'internal'] as const
type View = (typeof VIEWS)[number]

const STATUS_FILTERS = ['active', 'open', 'in_progress', 'resolved', 'closed', 'all'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

function matchesView(issue: IssueListItem, view: View) {
  switch (view) {
    case 'unfinished':
      return issue.type === 'incomplete_work'
    case 'client':
      return issue.source === 'client' && issue.type !== 'request'
    case 'requests':
      return issue.type === 'request'
    case 'internal':
      return !issue.visibleToClient
    default:
      return true
  }
}

function matchesStatus(issue: IssueListItem, status: StatusFilter) {
  if (status === 'all') return true
  if (status === 'active') return issue.status === 'open' || issue.status === 'in_progress'
  return issue.status === status
}

function personName(
  p: { firstName: string | null; lastName: string | null } | null,
  fallback = 'Unknown'
) {
  if (!p) return fallback
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return name || fallback
}

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function IssuesList({
  locations,
  initialView,
  initialStatus,
  initialLocationId,
  initialClientId,
}: {
  locations: LocationOption[]
  initialView?: string
  initialStatus?: string
  initialLocationId?: string
  initialClientId?: string
}) {
  const [issues, setIssues] = useState<IssueListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<View>(pick(initialView, VIEWS, 'all'))
  const [status, setStatus] = useState<StatusFilter>(pick(initialStatus, STATUS_FILTERS, 'active'))
  const [locationId, setLocationId] = useState(initialLocationId || 'all')
  const [clientId, setClientId] = useState(initialClientId || 'all')
  const { lang, t } = useManagerLang()
  const it = t.issues

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/issues', { credentials: 'include', cache: 'no-store' })
      if (!res.ok) throw new Error(currentManagerStrings().issues.loadFailed)
      setIssues((await res.json()) as IssueListItem[])
    } catch (error: unknown) {
      console.error('Fetch error:', error)
      toast.error(error instanceof Error ? error.message : currentManagerStrings().issues.loadFailed)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Filter options come from the loaded set plus the location list, so a
  // deep link to a quiet location still shows its name.
  const locationOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const issue of issues) if (issue.location) map.set(issue.location.id, issue.location.name)
    if (initialLocationId) {
      const l = locations.find((x) => x.id === initialLocationId)
      if (l) map.set(l.id, l.name)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [issues, locations, initialLocationId])

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const issue of issues) if (issue.client) map.set(issue.client.id, issue.client.name)
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [issues])

  const scoped = useMemo(
    () =>
      issues.filter((issue) => {
        if (locationId !== 'all' && issue.location?.id !== locationId) return false
        if (clientId !== 'all' && issue.client?.id !== clientId) return false
        return true
      }),
    [issues, locationId, clientId]
  )

  const counts = useMemo(() => {
    const active = scoped.filter((i) => i.status === 'open' || i.status === 'in_progress')
    return {
      open: scoped.filter((i) => i.status === 'open').length,
      in_progress: scoped.filter((i) => i.status === 'in_progress').length,
      unassigned: active.filter((i) => !i.assignedTo).length,
      views: Object.fromEntries(VIEWS.map((v) => [v, active.filter((i) => matchesView(i, v)).length])) as Record<
        View,
        number
      >,
    }
  }, [scoped])

  const filtered = scoped.filter((issue) => matchesView(issue, view) && matchesStatus(issue, status))

  const header = (
    <PageHeader
      kicker={it.kicker}
      title={it.title}
      subtitle={it.subtitle}
      actions={
        <>
          <LanguageToggle />
          <NewIssueDialog
            locations={locations}
            defaultLocationId={locationId !== 'all' ? locationId : undefined}
            onCreated={load}
          >
            <Button variant="gold">
              <Plus className="size-4" />
              {it.newIssue}
            </Button>
          </NewIssueDialog>
        </>
      }
    />
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="flex items-center justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label={it.open}
          value={counts.open}
          icon={AlertTriangle}
          tone={counts.open > 0 ? 'coral' : 'neutral'}
          sub={it.notStarted}
        />
        <StatCard
          label={it.inProgress}
          value={counts.in_progress}
          icon={Clock}
          tone={counts.in_progress > 0 ? 'gold' : 'neutral'}
          sub={it.beingWorked}
        />
        <StatCard
          label={it.unassigned}
          value={counts.unassigned}
          icon={UserX}
          tone={counts.unassigned > 0 ? 'gold' : 'neutral'}
          sub={it.noOwner}
        />
      </div>

      <div className="space-y-3">
        <div className="-mx-1 overflow-x-auto px-1">
          <Tabs value={view} onValueChange={(value) => setView(value as View)}>
            <TabsList>
              <ViewTab value="all" label={it.viewAll} count={counts.views.all} />
              <ViewTab value="unfinished" label={it.viewUnfinished} count={counts.views.unfinished} />
              <ViewTab value="client" label={it.viewClient} count={counts.views.client} />
              <ViewTab value="requests" label={it.viewRequests} count={counts.views.requests} />
              <ViewTab value="internal" label={it.viewInternal} count={counts.views.internal} />
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {it.statusFilter[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder={it.allClients} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{it.allClients}</SelectItem>
              {clientOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder={it.allLocations} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{it.allLocations}</SelectItem>
              {locationOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="py-2">
            <CardContent className="px-4">
              <EmptyState
                icon={CheckCircle2}
                title={it.emptyTitle}
                description={it.emptyBody}
              />
            </CardContent>
          </Card>
        ) : (
          filtered.map((issue) => (
            <Link key={issue.id} href={`/operations/issues/${issue.id}`} className="block">
              <Card className="gap-0 py-0 transition-colors hover:border-gold-600/30 dark:hover:border-gold-400/25">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
                          {issue.title}
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <IssueStatusBadge status={issue.status} lang={lang} />
                        {issue.type !== 'issue' && <IssueTypeBadge type={issue.type} lang={lang} />}
                        {issue.source === 'client' && <IssueSourceBadge source={issue.source} lang={lang} />}
                        {issue.type !== 'request' && <IssueSeverityBadge severity={issue.severity} lang={lang} />}
                        <Badge variant="neutral">{categoryLabelFor(issue.category, issue.type, lang)}</Badge>
                        {!issue.visibleToClient && (
                          <Badge variant="neutral" className="gap-1">
                            <EyeOff className="size-3" />
                            {t.common.internal}
                          </Badge>
                        )}
                      </div>

                      {issue.description && (
                        <p className="line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                          {issue.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {issue.location?.name ?? it.unknownLocation}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5" />
                          {issue.client?.name ?? it.unknownClient}
                        </span>
                        <span className="flex items-center gap-1.5" title={new Date(issue.createdAt).toLocaleString(localeFor(lang))}>
                          <Clock className="size-3.5" />
                          {formatDistanceToNow(new Date(issue.createdAt), {
                            addSuffix: true,
                            locale: dateFnsLocale(lang),
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="size-3.5" />
                          {personName(issue.reportedBy, t.common.unknown)}
                        </span>
                        {issue.type === 'request' && issue.preferredDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3.5" />
                            {it.wants}{' '}
                            {new Date(issue.preferredDate).toLocaleDateString(localeFor(lang), {
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'UTC',
                            })}
                          </span>
                        )}
                        {issue.photos.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Camera className="size-3.5" />
                            {issue.photos.length}
                          </span>
                        )}
                        {issue._count.comments > 0 && (
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="size-3.5" />
                            {issue._count.comments}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-xs text-muted-foreground">
                      {issue.assignedTo ? (
                        <>
                          {it.assignedTo}{' '}
                          <span className="font-medium text-foreground">
                            {personName(issue.assignedTo, t.common.unknown)}
                          </span>
                        </>
                      ) : (
                        t.common.unassigned
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

function ViewTab({ value, label, count }: { value: View; label: string; count: number }) {
  return (
    <TabsTrigger value={value} className="gap-1.5">
      {label}
      {count > 0 && (
        <span className="rounded-full bg-secondary px-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}
