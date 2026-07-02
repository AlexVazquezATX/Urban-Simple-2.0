'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import {
  IssueSeverityBadge,
  IssueStatusBadge,
  issueStatusLabel,
} from './issue-badges'

interface Person {
  id: string
  firstName: string | null
  lastName: string | null
}

export interface IssueDetailData {
  id: string
  title: string
  description: string | null
  category: string
  severity: string
  status: string
  photos: string[]
  resolution: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  location: { id: string; name: string } | null
  client: { id: string; name: string } | null
  reportedBy: Person | null
  assignedTo: Person | null
  comments: {
    id: string
    comment: string
    isInternal: boolean
    createdAt: string
    user: Person | null
  }[]
}

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
]

function personName(p: Person | null, fallback = 'Unknown') {
  if (!p) return fallback
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return name || fallback
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function IssueDetail({ issue }: { issue: IssueDetailData }) {
  const router = useRouter()
  const [status, setStatus] = useState(issue.status)
  const [resolution, setResolution] = useState(issue.resolution ?? '')
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = status !== issue.status || resolution !== (issue.resolution ?? '')

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const res = await fetch(`/api/issues/${issue.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, resolution: resolution.trim() || null }),
      })
      if (!res.ok) throw new Error('Failed to update issue')
      toast.success('Issue updated')
      router.refresh()
    } catch (error: unknown) {
      console.error('Update error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update issue')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="OPERATIONS · ISSUES"
        title={issue.title}
        backHref="/operations/issues"
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IssueStatusBadge status={issue.status} />
          <IssueSeverityBadge severity={issue.severity} />
          <Badge variant="neutral" className="capitalize">
            {issue.category}
          </Badge>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Report */}
        <div className="space-y-6">
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle>Report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {issue.description?.trim() || 'No description was provided.'}
              </p>

              {issue.photos.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Camera className="size-3.5" />
                    Photos
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {issue.photos.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-[150px]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Issue photo ${index + 1}`}
                          className="h-full w-full rounded-[14px] border border-border object-cover transition-opacity hover:opacity-90"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments */}
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {issue.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                issue.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-[10px] border border-border bg-card p-3"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {personName(comment.user)}
                      </span>
                      <span>{formatDateTime(comment.createdAt)}</span>
                      {comment.isInternal && (
                        <Badge variant="gold" className="gap-1">
                          <Lock className="size-3" />
                          Internal
                        </Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {comment.comment}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: status controls + details */}
        <div className="space-y-6">
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle>Manage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              <div className="space-y-1.5">
                <Label htmlFor="issue-status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="issue-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="issue-resolution">Resolution notes</Label>
                <Textarea
                  id="issue-resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  placeholder="What was done to resolve this? Visible on the client's portal."
                  rows={4}
                />
              </div>

              <Button
                variant="gold"
                className="w-full"
                onClick={handleSave}
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 text-sm">
              <DetailRow icon={Building2} label="Client" value={issue.client?.name ?? 'Unknown'} />
              <DetailRow icon={MapPin} label="Location" value={issue.location?.name ?? 'Unknown'} />
              <DetailRow icon={User} label="Reported by" value={personName(issue.reportedBy)} />
              <DetailRow
                icon={User}
                label="Assigned to"
                value={issue.assignedTo ? personName(issue.assignedTo) : 'Unassigned'}
              />
              <DetailRow icon={Clock} label="Reported" value={formatDateTime(issue.createdAt)} />
              {issue.resolvedAt && (
                <DetailRow
                  icon={CheckCircle2}
                  label="Resolved"
                  value={formatDateTime(issue.resolvedAt)}
                />
              )}
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                Current status: {issueStatusLabel(issue.status)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
