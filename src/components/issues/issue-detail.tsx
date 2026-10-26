'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MessageSquareText,
  Send,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { LanguageToggle } from '@/components/layout/language-toggle'
import {
  ISSUE_CATEGORIES,
  ISSUE_STATUSES,
  REQUEST_KINDS,
  SEVERITIES,
  reasonLabel,
  type IncompleteItem,
} from '@/lib/ops/constants'
import { useManagerLang } from '@/lib/i18n/use-manager-lang'
import {
  categoryLabelFor,
  dateFnsLocale,
  localeFor,
  managerStrings,
  type ManagerLang,
} from '@/lib/i18n/manager'
import {
  IssueSeverityBadge,
  IssueSourceBadge,
  IssueStatusBadge,
  IssueTypeBadge,
} from './issue-badges'

interface Person {
  id: string
  firstName: string | null
  lastName: string | null
  role?: string
}

export interface IssueDetailData {
  id: string
  type: string
  source: string
  title: string
  description: string | null
  category: string
  severity: string
  status: string
  photos: string[]
  resolution: string | null
  resolvedAt: string | null
  visibleToClient: boolean
  clientNotifiedAt: string | null
  preferredDate: string | null
  createdAt: string
  updatedAt: string
  location: { id: string; name: string } | null
  client: { id: string; name: string } | null
  reportedBy: Person | null
  assignedTo: Person | null
  serviceLog: {
    id: string
    serviceDate: string
    associate: Person | null
    incompleteItems: IncompleteItem[]
  } | null
  comments: {
    id: string
    comment: string
    isInternal: boolean
    createdAt: string
    user: Person | null
  }[]
}

export interface AlertRecipient {
  id: string
  name: string
  email: string | null
  phone: string | null
  smsOptedOut: boolean
  allLocations: boolean
}

interface IssueDetailProps {
  issue: IssueDetailData
  staff: { id: string; firstName: string; lastName: string; role: string }[]
  recipients: AlertRecipient[]
  textingEnabled: boolean
  canManage: boolean
  canDelete: boolean
}

const UNASSIGNED = '__none__'

function personName(p: Person | null, fallback = 'Unknown') {
  if (!p) return fallback
  const name = `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()
  return name || fallback
}

function formatDateTime(value: string, lang: ManagerLang) {
  return new Date(value).toLocaleString(localeFor(lang), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Calendar dates (service date, preferred date) are stored at UTC midnight.
function formatCalendarDate(value: string, lang: ManagerLang) {
  return new Date(value).toLocaleDateString(localeFor(lang), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function IssueDetail({
  issue,
  staff,
  recipients,
  textingEnabled,
  canManage,
  canDelete,
}: IssueDetailProps) {
  const router = useRouter()
  const { lang, t } = useManagerLang()
  const d = t.issue
  const isRequest = issue.type === 'request'
  const isUnfinished = issue.type === 'incomplete_work'
  const noun = d.noun(isRequest)
  const unknown = t.common.unknown

  // Manage form
  const [status, setStatus] = useState(issue.status)
  const [resolution, setResolution] = useState(issue.resolution ?? '')
  const [assignedToId, setAssignedToId] = useState(issue.assignedTo?.id ?? UNASSIGNED)
  const [severity, setSeverity] = useState(issue.severity)
  const [category, setCategory] = useState(issue.category)
  const [isSaving, setIsSaving] = useState(false)

  // Client visibility
  const [visible, setVisible] = useState(issue.visibleToClient)
  const [togglingVisible, setTogglingVisible] = useState(false)
  const [clientMessage, setClientMessage] = useState('')
  const [sending, setSending] = useState(false)

  // Comments
  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(!issue.visibleToClient)
  const [posting, setPosting] = useState(false)

  // Photo lightbox + delete
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const categoryOptions: ReadonlyArray<{ id: string; label: string }> = isRequest
    ? REQUEST_KINDS
    : ISSUE_CATEGORIES
  const categoryKnown = categoryOptions.some((c) => c.id === issue.category)

  const isDirty =
    status !== issue.status ||
    resolution !== (issue.resolution ?? '') ||
    assignedToId !== (issue.assignedTo?.id ?? UNASSIGNED) ||
    severity !== issue.severity ||
    category !== issue.category

  const itemsBySection = useMemo(() => {
    const groups = new Map<string, IncompleteItem[]>()
    for (const item of issue.serviceLog?.incompleteItems ?? []) {
      const key = item.section || t.common.general
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()]
  }, [issue.serviceLog, t])

  const patch = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/issues/${issue.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || d.toastUpdateFailed(noun))
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const body: Record<string, unknown> = {}
      if (status !== issue.status) body.status = status
      if (resolution !== (issue.resolution ?? '')) body.resolution = resolution.trim() || null
      if (assignedToId !== (issue.assignedTo?.id ?? UNASSIGNED)) {
        body.assignedToId = assignedToId === UNASSIGNED ? null : assignedToId
      }
      if (severity !== issue.severity) body.severity = severity
      if (category !== issue.category) body.category = category
      await patch(body)
      const closing = (status === 'resolved' || status === 'closed') && status !== issue.status
      toast.success(closing && visible ? d.toastSavedResolved : d.toastSaved)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : d.toastUpdateFailed(noun))
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleVisible = async (next: boolean) => {
    setTogglingVisible(true)
    setVisible(next)
    try {
      await patch({ visibleToClient: next })
      toast.success(next ? d.toastVisible : d.toastHidden)
      router.refresh()
    } catch (error: unknown) {
      setVisible(!next)
      toast.error(error instanceof Error ? error.message : d.toastVisibilityFailed)
    } finally {
      setTogglingVisible(false)
    }
  }

  const handleSendToClient = async () => {
    try {
      setSending(true)
      const res = await fetch(`/api/issues/${issue.id}/notify-client`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clientMessage.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || d.toastSendFailed)
      const delivered = (data.emailed ?? 0) + (data.texted ?? 0)
      if (delivered > 0) toast.success(data.message || d.toastSent)
      else toast.warning(data.message || d.toastNobody)
      setVisible(true)
      setClientMessage('')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : d.toastSendFailed)
    } finally {
      setSending(false)
    }
  }

  const handlePostComment = async () => {
    if (!comment.trim()) return
    try {
      setPosting(true)
      const res = await fetch(`/api/issues/${issue.id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim(), isInternal }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || d.toastCommentFailed)
      }
      toast.success(!isInternal && visible ? d.toastReplyEmailed : d.toastCommentPosted)
      setComment('')
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : d.toastCommentFailed)
    } finally {
      setPosting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const res = await fetch(`/api/issues/${issue.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || d.toastDeleteFailed(noun))
      }
      toast.success(d.toastDeleted(noun))
      router.push('/operations/issues')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : d.toastDeleteFailed(noun))
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={d.kicker(t.issueType[issue.type] ?? t.issueType.issue)}
        title={issue.title}
        backHref="/operations/issues"
        actions={<LanguageToggle />}
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <IssueTypeBadge type={issue.type} lang={lang} />
          <IssueSourceBadge source={issue.source} lang={lang} />
          <IssueStatusBadge status={issue.status} lang={lang} />
          {!isRequest && <IssueSeverityBadge severity={issue.severity} lang={lang} />}
          <Badge variant="neutral">{categoryLabelFor(issue.category, issue.type, lang)}</Badge>
          {!issue.visibleToClient && (
            <Badge variant="neutral" className="gap-1">
              <EyeOff className="size-3" />
              {t.common.internal}
            </Badge>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* Report */}
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle>{isRequest ? d.request : d.report}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5">
              {isRequest && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <ListChecks className="size-3.5" />
                    {d.requestTypeColon}
                    <span className="font-medium text-foreground">
                      {categoryLabelFor(issue.category, issue.type, lang)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-3.5" />
                    {d.preferredDate}
                    <span className="font-medium text-foreground">
                      {issue.preferredDate ? formatCalendarDate(issue.preferredDate, lang) : d.noPreference}
                    </span>
                  </span>
                </div>
              )}

              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {issue.description?.trim() || d.noDescription}
              </p>

              {issue.photos.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Camera className="size-3.5" />
                    {t.common.photos}
                  </div>
                  <PhotoGrid photos={issue.photos} onOpen={setLightbox} lang={lang} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unfinished items from the associate's visit */}
          {isUnfinished && issue.serviceLog && (
            <Card className="gap-0 py-0">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="size-4 text-muted-foreground" />
                  {d.notFinished(issue.serviceLog.incompleteItems.length)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {formatCalendarDate(issue.serviceLog.serviceDate, lang)}
                  {issue.serviceLog.associate && ` · ${personName(issue.serviceLog.associate, unknown)}`}
                </p>
              </CardHeader>
              <CardContent className="space-y-5 px-5 pb-5">
                {itemsBySection.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{d.noItemDetails}</p>
                ) : (
                  itemsBySection.map(([section, items]) => (
                    <div key={section}>
                      <p className="kicker mb-2 text-muted-foreground">{section}</p>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.itemId}
                            className="rounded-[10px] border border-border bg-card p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">{item.text}</p>
                              <Badge variant="gold">{reasonLabel(item.reason, lang)}</Badge>
                            </div>
                            {item.note && (
                              <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
                                {item.note}
                              </p>
                            )}
                            {item.photos && item.photos.length > 0 && (
                              <div className="mt-2">
                                <PhotoGrid photos={item.photos} onOpen={setLightbox} compact lang={lang} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4 text-muted-foreground" />
                {d.discussion}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5">
              {issue.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{d.noComments}</p>
              ) : (
                issue.comments.map((c) => (
                  <div
                    key={c.id}
                    className={
                      c.isInternal
                        ? 'rounded-[10px] border border-dashed border-border bg-secondary/40 p-3'
                        : 'rounded-[10px] border border-border bg-card p-3'
                    }
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{personName(c.user, unknown)}</span>
                      {c.user?.role === 'CLIENT_USER' && <Badge variant="teal">{d.client}</Badge>}
                      <span>{formatDateTime(c.createdAt, lang)}</span>
                      {c.isInternal && (
                        <Badge variant="neutral" className="gap-1">
                          <Lock className="size-3" />
                          {t.common.internal}
                        </Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {c.comment}
                    </p>
                  </div>
                ))
              )}

              <div className="space-y-3 border-t border-border pt-4">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={isInternal ? d.notePlaceholder : d.replyPlaceholder}
                  rows={3}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  {canManage ? (
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Switch checked={isInternal} onCheckedChange={setIsInternal} />
                      {d.internalToggle}
                    </label>
                  ) : (
                    <span className="text-xs text-muted-foreground">{d.managersOnly}</span>
                  )}
                  <Button
                    onClick={handlePostComment}
                    disabled={!comment.trim() || posting}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {posting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {isInternal ? d.addNote : d.sendReply}
                  </Button>
                </div>
                {canManage && !isInternal && (
                  <p className="text-xs text-muted-foreground">
                    {visible ? d.replyVisible : d.replyHidden(noun)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: manage, client visibility, details */}
        <div className="space-y-6">
          {canManage && (
            <Card className="gap-0 py-0">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle>{d.manage}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <div className="space-y-1.5">
                  <Label htmlFor="issue-status">{d.status}</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="issue-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t.issueStatus[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issue-assignee">{d.assignedTo}</Label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger id="issue-assignee" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>{t.common.unassigned}</SelectItem>
                      {issue.assignedTo && !staff.some((s) => s.id === issue.assignedTo!.id) && (
                        <SelectItem value={issue.assignedTo.id}>
                          {personName(issue.assignedTo, unknown)}
                        </SelectItem>
                      )}
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {`${s.firstName} ${s.lastName}`.trim()}
                          {s.role === 'ASSOCIATE' ? d.associateSuffix : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {!isRequest && (
                    <div className="space-y-1.5">
                      <Label htmlFor="issue-severity">{d.severity}</Label>
                      <Select value={severity} onValueChange={setSeverity}>
                        <SelectTrigger id="issue-severity" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITIES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {t.severity[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className={isRequest ? 'col-span-2 space-y-1.5' : 'space-y-1.5'}>
                    <Label htmlFor="issue-category">{isRequest ? d.requestType : d.category}</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="issue-category" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {!categoryKnown && (
                          <SelectItem value={issue.category}>
                            {categoryLabelFor(issue.category, issue.type, lang)}
                          </SelectItem>
                        )}
                        {categoryOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {categoryLabelFor(c.id, issue.type, lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issue-resolution">{d.resolution}</Label>
                  <Textarea
                    id="issue-resolution"
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                    placeholder={
                      isRequest ? d.resolutionPlaceholderRequest : d.resolutionPlaceholderIssue
                    }
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    {d.resolutionHint(noun)}
                  </p>
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
                      {d.saving}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" />
                      {d.saveChanges}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {canManage && (
            <Card className="gap-0 py-0">
              <CardHeader className="px-5 pb-3 pt-5">
                <CardTitle>{d.clientVisibility}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5">
                <label className="flex items-start justify-between gap-3">
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      {visible ? d.clientCanSee : d.hiddenFromClient}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {visible ? d.visibleHint : d.hiddenHint}
                    </span>
                  </span>
                  <Switch
                    checked={visible}
                    onCheckedChange={handleToggleVisible}
                    disabled={togglingVisible}
                    aria-label={d.visibleAria}
                  />
                </label>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.lastNotified}</span>
                  <span className="text-right font-medium text-foreground">
                    {issue.clientNotifiedAt
                      ? formatDistanceToNow(new Date(issue.clientNotifiedAt), {
                          addSuffix: true,
                          locale: dateFnsLocale(lang),
                        })
                      : d.never}
                  </span>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    {d.recipientsFor(issue.location?.name ?? null)}
                  </p>
                  {recipients.length === 0 ? (
                    <p className="rounded-[10px] border border-dashed border-border p-3 text-xs text-muted-foreground">
                      {d.noRecipients}{' '}
                      {issue.client && (
                        <Link href={`/clients/${issue.client.id}`} className="font-medium text-primary hover:underline">
                          {d.setUpAlerts}
                        </Link>
                      )}
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {recipients.map((r) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate text-foreground">{r.name}</span>
                          <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                            {r.email && (
                              <span title={r.email}>
                                <Mail className="size-3.5" />
                              </span>
                            )}
                            {r.phone && (
                              <span title={textingEnabled ? r.phone : d.textingOff(r.phone)}>
                                <MessageSquareText
                                  className={textingEnabled ? 'size-3.5' : 'size-3.5 opacity-40'}
                                />
                              </span>
                            )}
                            {r.smsOptedOut && <span className="text-[11px]">{d.textsStopped}</span>}
                          </span>
                        </div>
                      ))}
                      {issue.client && (
                        <Link
                          href={`/clients/${issue.client.id}`}
                          className="inline-block pt-1 text-xs font-medium text-primary hover:underline"
                        >
                          {d.editContacts}
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-border pt-4">
                  <Label htmlFor="client-message">{d.messageToClient}</Label>
                  <Textarea
                    id="client-message"
                    value={clientMessage}
                    onChange={(e) => setClientMessage(e.target.value)}
                    placeholder={d.messagePlaceholder}
                    rows={3}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSendToClient}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {d.sendToClient}
                  </Button>
                  <p className="text-xs text-muted-foreground">{d.sendHint}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="gap-0 py-0">
            <CardHeader className="px-5 pb-3 pt-5">
              <CardTitle>{d.details}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 text-sm">
              <DetailRow
                icon={Building2}
                label={d.client}
                value={issue.client?.name ?? unknown}
                href={issue.client ? `/clients/${issue.client.id}` : undefined}
              />
              <DetailRow
                icon={MapPin}
                label={d.location}
                value={issue.location?.name ?? unknown}
                href={issue.location ? `/locations/${issue.location.id}` : undefined}
              />
              <DetailRow icon={User} label={d.reportedBy} value={personName(issue.reportedBy, unknown)} />
              <DetailRow
                icon={User}
                label={d.assignedTo}
                value={issue.assignedTo ? personName(issue.assignedTo, unknown) : t.common.unassigned}
              />
              <DetailRow
                icon={Clock}
                label={d.reported}
                value={formatDateTime(issue.createdAt, lang)}
              />
              {issue.resolvedAt && (
                <DetailRow
                  icon={CheckCircle2}
                  label={d.resolved}
                  value={formatDateTime(issue.resolvedAt, lang)}
                />
              )}
            </CardContent>
          </Card>

          {canDelete && (
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
              {d.deleteNoun(noun)}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!lightbox} onOpenChange={(open) => !open && setLightbox(null)}>
        <DialogContent className="max-w-[min(960px,calc(100vw-24px))] border-border bg-card p-2 sm:p-3">
          <DialogTitle className="sr-only">{t.common.photo}</DialogTitle>
          {lightbox && (
            <a href={lightbox} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox}
                alt={d.fullPhoto}
                className="max-h-[80vh] w-full rounded-[10px] object-contain"
              />
            </a>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{d.deleteTitle(noun)}</AlertDialogTitle>
            <AlertDialogDescription>{d.deleteBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.common.cancel}</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {d.delete}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PhotoGrid({
  photos,
  onOpen,
  compact,
  lang,
}: {
  photos: string[]
  onOpen: (url: string) => void
  compact?: boolean
  lang: ManagerLang
}) {
  const d = managerStrings(lang).issue
  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'grid grid-cols-2 gap-3 sm:grid-cols-3'}>
      {photos.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          onClick={() => onOpen(url)}
          className={compact ? 'block size-16' : 'block h-[150px]'}
          aria-label={d.openPhoto(index + 1)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={d.photoN(index + 1)}
            className="h-full w-full rounded-[10px] border border-border object-cover transition-opacity hover:opacity-90"
          />
        </button>
      ))}
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Building2
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      {href ? (
        <Link href={href} className="text-right font-medium text-foreground hover:text-primary">
          {value}
        </Link>
      ) : (
        <span className="text-right font-medium text-foreground">{value}</span>
      )}
    </div>
  )
}
