'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IssueSeverityBadge, IssueStatusBadge } from './issue-badges'

interface IssueListItem {
  id: string
  title: string
  description: string | null
  category: string
  severity: string
  status: string
  photos: string[]
  createdAt: string
  resolvedAt: string | null
  location: { id: string; name: string } | null
  client: { id: string; name: string } | null
  reportedBy: { id: string; firstName: string | null; lastName: string | null } | null
  assignedTo: { id: string; firstName: string | null; lastName: string | null } | null
  _count: { comments: number }
}

type StatusFilter = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'

function personName(
  p: { firstName: string | null; lastName: string | null } | null,
  fallback = 'Unknown'
) {
  if (!p) return fallback
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return name || fallback
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function IssuesList() {
  const [issues, setIssues] = useState<IssueListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<StatusFilter>('open')
  const [locationId, setLocationId] = useState('all')
  const [clientId, setClientId] = useState('all')

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/issues', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to load issues')
        const data = (await res.json()) as IssueListItem[]
        if (active) setIssues(data)
      } catch (error: unknown) {
        console.error('Fetch error:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to load issues')
      } finally {
        if (active) setIsLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  // Filter options derive from the loaded set, so we never need extra endpoints.
  const locationOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const issue of issues) {
      if (issue.location) map.set(issue.location.id, issue.location.name)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [issues])

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const issue of issues) {
      if (issue.client) map.set(issue.client.id, issue.client.name)
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [issues])

  const counts = useMemo(
    () => ({
      open: issues.filter((i) => i.status === 'open').length,
      in_progress: issues.filter((i) => i.status === 'in_progress').length,
      resolved: issues.filter((i) => i.status === 'resolved').length,
    }),
    [issues]
  )

  const filtered = issues.filter((issue) => {
    if (status !== 'all' && issue.status !== status) return false
    if (locationId !== 'all' && issue.location?.id !== locationId) return false
    if (clientId !== 'all' && issue.client?.id !== clientId) return false
    return true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open"
          value={counts.open}
          icon={AlertTriangle}
          tone={counts.open > 0 ? 'coral' : 'neutral'}
          sub="reported, not yet started"
        />
        <StatCard
          label="In Progress"
          value={counts.in_progress}
          icon={Clock}
          tone={counts.in_progress > 0 ? 'gold' : 'neutral'}
          sub="being worked"
        />
        <StatCard
          label="Resolved"
          value={counts.resolved}
          icon={CheckCircle2}
          tone="neutral"
          sub="closed out"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="All clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clientOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
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
                title="Nothing in this queue"
                description="No issues match the current filters. Client-reported issues land here the moment they come in."
              />
            </CardContent>
          </Card>
        ) : (
          filtered.map((issue) => (
            <Link
              key={issue.id}
              href={`/operations/issues/${issue.id}`}
              className="block"
            >
              <Card className="gap-0 py-0 transition-colors hover:border-gold-600/30 dark:hover:border-gold-400/25">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[15px] font-semibold tracking-[-0.2px] text-foreground">
                          {issue.title}
                        </h3>
                        <IssueStatusBadge status={issue.status} />
                        <IssueSeverityBadge severity={issue.severity} />
                      </div>

                      {issue.description && (
                        <p className="line-clamp-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
                          {issue.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5" />
                          {issue.client?.name ?? 'Unknown client'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {issue.location?.name ?? 'Unknown location'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <User className="size-3.5" />
                          {personName(issue.reportedBy)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" />
                          {formatDate(issue.createdAt)}
                        </span>
                        {issue.photos.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Camera className="size-3.5" />
                            {issue.photos.length} photo{issue.photos.length === 1 ? '' : 's'}
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
                      {issue.assignedTo
                        ? `Assigned to ${personName(issue.assignedTo)}`
                        : 'Unassigned'}
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
