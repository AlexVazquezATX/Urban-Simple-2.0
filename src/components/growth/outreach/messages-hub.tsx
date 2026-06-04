'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ApprovalQueue } from './approval-queue'
import {
  Send,
  CheckCircle2,
  Inbox,
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Pencil,
  Clock,
  XCircle,
  Search,
  Eye,
  MousePointerClick,
  AlertTriangle,
  CheckCircle,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'

interface MessageItem {
  id: string
  prospectId: string
  prospectName: string
  contactName: string | null
  contactEmail: string | null
  channel: string
  subject: string | null
  body: string
  step?: number
  scheduledAt?: string | null
  isAiGenerated: boolean
  createdAt: string
  approvedAt: string | null
  sentAt: string | null
  campaignName: string | null
  // Tracking fields (populated by Resend webhooks)
  status?: string
  deliveredAt?: string | null
  openedAt?: string | null
  clickedAt?: string | null
  bouncedAt?: string | null
  openCount?: number
  clickCount?: number
}

export function MessagesHub() {
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingCount, setPendingCount] = useState(0)
  const [approvedMessages, setApprovedMessages] = useState<MessageItem[]>([])
  const [scheduledMessages, setScheduledMessages] = useState<MessageItem[]>([])
  const [sentMessages, setSentMessages] = useState<MessageItem[]>([])
  const [loadingApproved, setLoadingApproved] = useState(true)
  const [loadingScheduled, setLoadingScheduled] = useState(true)
  const [loadingSent, setLoadingSent] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set())
  const [sendingAll, setSendingAll] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // Editable "To" email overrides per message
  const [emailOverrides, setEmailOverrides] = useState<Record<string, string>>({})
  // Search filter
  const [searchQuery, setSearchQuery] = useState('')

  // Multi-select state for Ready-to-Send and Scheduled tabs. Separate Sets per
  // tab so a selection on one doesn't bleed into the other; both are cleared
  // when the user switches tabs.
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<Set<string>>(new Set())
  const [selectedScheduledIds, setSelectedScheduledIds] = useState<Set<string>>(new Set())
  // Per-row in-flight delete state (for the trash icon's spinner)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  // Disables the bulk Delete action while in-flight
  const [bulkDeleting, setBulkDeleting] = useState(false)
  // Drives the destructive-confirmation AlertDialog. `null` = closed.
  const [deleteConfirmOpen, setDeleteConfirmOpen] =
    useState<null | { tab: 'approved' | 'scheduled'; ids: string[]; single: boolean }>(null)

  const filterMessages = (messages: MessageItem[]) => {
    if (!searchQuery.trim()) return messages
    const q = searchQuery.toLowerCase()
    return messages.filter(
      (m) =>
        m.prospectName?.toLowerCase().includes(q) ||
        m.contactName?.toLowerCase().includes(q) ||
        m.contactEmail?.toLowerCase().includes(q) ||
        m.subject?.toLowerCase().includes(q) ||
        m.body?.toLowerCase().includes(q) ||
        m.campaignName?.toLowerCase().includes(q)
    )
  }

  const filteredApproved = useMemo(() => filterMessages(approvedMessages), [approvedMessages, searchQuery])
  const filteredScheduled = useMemo(() => filterMessages(scheduledMessages), [scheduledMessages, searchQuery])
  const filteredSent = useMemo(() => filterMessages(sentMessages), [sentMessages, searchQuery])

  useEffect(() => {
    fetchPendingCount()
    fetchApproved()
    fetchScheduled()
    fetchSent()
  }, [])

  // Clear selections when the search filter changes. Otherwise a user who
  // select-alls under one filter and then changes the query would have an
  // invisible selection — "Delete Selected (N)" would delete rows they
  // can no longer see, which is the textbook destructive-action footgun.
  useEffect(() => {
    setSelectedApprovedIds(new Set())
    setSelectedScheduledIds(new Set())
  }, [searchQuery])

  const handleTabChange = (tab: string) => {
    // Clear selections so stale checkboxes don't carry over when the user
    // switches between Ready-to-Send and Scheduled.
    setSelectedApprovedIds(new Set())
    setSelectedScheduledIds(new Set())
    setActiveTab(tab)
    if (tab === 'pending') fetchPendingCount()
    else if (tab === 'approved') fetchApproved()
    else if (tab === 'scheduled') fetchScheduled()
    else if (tab === 'sent') fetchSent()
  }

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/growth/outreach/approval-queue')
      if (res.ok) {
        const data = await res.json()
        setPendingCount(data.messages?.length || 0)
      }
    } catch {}
  }

  const fetchApproved = async () => {
    setLoadingApproved(true)
    try {
      const res = await fetch('/api/growth/outreach/approval-queue?view=approved')
      if (res.ok) {
        const data = await res.json()
        setApprovedMessages(data.messages || [])
      }
    } catch {
      toast.error('Failed to load approved messages')
    } finally {
      setLoadingApproved(false)
    }
  }

  const fetchScheduled = async () => {
    setLoadingScheduled(true)
    try {
      const res = await fetch('/api/growth/outreach/approval-queue?view=scheduled')
      if (res.ok) {
        const data = await res.json()
        setScheduledMessages(data.messages || [])
      }
    } catch {
      toast.error('Failed to load scheduled messages')
    } finally {
      setLoadingScheduled(false)
    }
  }

  const fetchSent = async () => {
    setLoadingSent(true)
    try {
      const res = await fetch('/api/growth/outreach/approval-queue?view=sent')
      if (res.ok) {
        const data = await res.json()
        setSentMessages(data.messages || [])
      }
    } catch {
      toast.error('Failed to load sent messages')
    } finally {
      setLoadingSent(false)
    }
  }

  // Soft-delete one or many messages from Ready-to-Send / Scheduled. Routes
  // through the existing /approval-queue endpoint with action='reject'; the
  // API also flips status to 'cancelled' so autopilot rows are stopped at the
  // cron level. Optimistically removes the rows from the local list on
  // success and clears the matching selection Set.
  const handleDelete = async (tab: 'approved' | 'scheduled', ids: string[]) => {
    if (ids.length === 0) return
    if (ids.length === 1) {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.add(ids[0])
        return next
      })
    } else {
      setBulkDeleting(true)
    }
    try {
      const res = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', messageIds: ids }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to delete')
        return
      }
      const updatedCount = typeof data.updated === 'number' ? data.updated : ids.length
      const idSet = new Set(ids)
      if (tab === 'approved') {
        setApprovedMessages((prev) => prev.filter((m) => !idSet.has(m.id)))
        // Subtract just the deleted ids — don't blow away an unrelated bulk
        // selection if the user clicked the per-row trash on a single row.
        setSelectedApprovedIds((prev) => {
          const next = new Set(prev)
          idSet.forEach((id) => next.delete(id))
          return next
        })
      } else {
        setScheduledMessages((prev) => prev.filter((m) => !idSet.has(m.id)))
        setSelectedScheduledIds((prev) => {
          const next = new Set(prev)
          idSet.forEach((id) => next.delete(id))
          return next
        })
      }
      if (updatedCount < ids.length) {
        toast.warning(
          `Deleted ${updatedCount} of ${ids.length}. ${ids.length - updatedCount} had already been sent or removed.`
        )
      } else {
        toast.success(`Deleted ${updatedCount} message${updatedCount === 1 ? '' : 's'}`)
      }
    } catch {
      toast.error('Failed to delete')
    } finally {
      if (ids.length === 1) {
        setDeletingIds((prev) => {
          const next = new Set(prev)
          ids.forEach((id) => next.delete(id))
          return next
        })
      } else {
        setBulkDeleting(false)
      }
      setDeleteConfirmOpen(null)
    }
  }

  const handleCancelScheduled = async (messageId: string) => {
    setCancellingId(messageId)
    try {
      const res = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', messageIds: [messageId] }),
      })
      if (res.ok) {
        toast.success('Scheduled message cancelled')
        fetchScheduled()
      } else {
        toast.error('Failed to cancel message')
      }
    } catch {
      toast.error('Failed to cancel message')
    } finally {
      setCancellingId(null)
    }
  }

  const handleSend = async (messageIds: string[]) => {
    const newSending = new Set(sendingIds)
    messageIds.forEach((id) => newSending.add(id))
    setSendingIds(newSending)

    // Build toOverrides from edited emails
    const toOverrides: Record<string, string> = {}
    for (const id of messageIds) {
      if (emailOverrides[id]?.trim()) {
        toOverrides[id] = emailOverrides[id].trim()
      }
    }

    try {
      const res = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          messageIds,
          toOverrides: Object.keys(toOverrides).length > 0 ? toOverrides : undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to send')
      }

      const data = await res.json()
      const sentCount = data.sent || 0
      const failedCount = (data.total || 0) - sentCount

      if (sentCount > 0) {
        toast.success(`Sent ${sentCount} message${sentCount > 1 ? 's' : ''}`)
      }
      if (failedCount > 0) {
        const failedResults = (data.results || []).filter((r: any) => r.status === 'failed')
        const reasons = failedResults.map((r: any) => r.reason).filter(Boolean)
        toast.error(`${failedCount} failed: ${reasons[0] || 'Unknown error'}`)
      }

      // Clear overrides for sent messages
      const newOverrides = { ...emailOverrides }
      for (const id of messageIds) {
        delete newOverrides[id]
      }
      setEmailOverrides(newOverrides)

      fetchApproved()
      fetchSent()
    } catch (err: any) {
      toast.error(err.message || 'Failed to send messages')
    } finally {
      setSendingIds(new Set())
    }
  }

  const handleSendAll = async () => {
    if (filteredApproved.length === 0) return
    if (!confirm(`Send all ${filteredApproved.length} approved message${filteredApproved.length > 1 ? 's' : ''}?`)) return

    setSendingAll(true)
    await handleSend(filteredApproved.map((m) => m.id))
    setSendingAll(false)
  }

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedIds(next)
  }

  const updateEmailOverride = (id: string, email: string) => {
    setEmailOverrides((prev) => ({ ...prev, [id]: email }))
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-3.5 w-3.5 text-ocean-500" />
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5 text-lime-600" />
      case 'linkedin':
        return <Linkedin className="h-3.5 w-3.5 text-ocean-600" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-3.5 w-3.5 text-plum-500" />
      default:
        return <Mail className="h-3.5 w-3.5 text-warm-500 dark:text-cream-400" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-400 dark:text-cream-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by prospect, contact, subject, or campaign..."
          className="pl-8 h-8 text-xs rounded-sm border-warm-200 dark:border-charcoal-700"
        />
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 rounded-none bg-white dark:bg-charcoal-900 border-b border-warm-200 dark:border-charcoal-700 p-0 h-auto">
          <TabsTrigger
            value="pending"
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:dark:bg-charcoal-800 data-[state=active]:text-warm-900 data-[state=active]:dark:text-cream-100 text-warm-500 dark:text-cream-400 hover:bg-warm-50 dark:hover:bg-charcoal-800"
          >
            <Inbox className="h-3.5 w-3.5 text-ocean-500" />
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <Badge className="ml-0.5 rounded-full text-[10px] px-1.5 py-0 bg-ocean-100 text-ocean-700 border-ocean-200">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:dark:bg-charcoal-800 data-[state=active]:text-warm-900 data-[state=active]:dark:text-cream-100 text-warm-500 dark:text-cream-400 hover:bg-warm-50 dark:hover:bg-charcoal-800"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-lime-600" />
            <span>Ready to Send</span>
            {approvedMessages.length > 0 && (
              <Badge className="ml-0.5 rounded-full text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">
                {approvedMessages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="scheduled"
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:dark:bg-charcoal-800 data-[state=active]:text-warm-900 data-[state=active]:dark:text-cream-100 text-warm-500 dark:text-cream-400 hover:bg-warm-50 dark:hover:bg-charcoal-800"
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span>Scheduled</span>
            {scheduledMessages.length > 0 && (
              <Badge className="ml-0.5 rounded-full text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                {scheduledMessages.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="sent"
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:dark:bg-charcoal-800 data-[state=active]:text-warm-900 data-[state=active]:dark:text-cream-100 text-warm-500 dark:text-cream-400 hover:bg-warm-50 dark:hover:bg-charcoal-800"
          >
            <Send className="h-3.5 w-3.5 text-plum-500" />
            <span>Sent</span>
            {sentMessages.length > 0 && (
              <Badge className="ml-0.5 rounded-full text-[10px] px-1.5 py-0 bg-warm-200 dark:bg-charcoal-700 text-warm-600 dark:text-cream-400">
                {sentMessages.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Pending Review ── */}
        <TabsContent value="pending" className="mt-4">
          <ApprovalQueue searchQuery={searchQuery} />
        </TabsContent>

        {/* ── Ready to Send ── */}
        <TabsContent value="approved" className="mt-4">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              {loadingApproved ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-400 dark:text-cream-500" />
                </div>
              ) : approvedMessages.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-warm-300 dark:text-charcoal-500 mb-3" />
                  <p className="text-sm text-warm-500 dark:text-cream-400">No approved messages waiting to send</p>
                  <p className="text-xs text-warm-400 dark:text-cream-500 mt-1">
                    Approve messages in the Pending Review tab first
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-warm-600 dark:text-cream-400">
                        {filteredApproved.length}{searchQuery ? ` of ${approvedMessages.length}` : ''} message{filteredApproved.length !== 1 ? 's' : ''} ready
                      </p>
                      <p className="text-[10px] text-warm-400 dark:text-cream-500">
                        Your email signature will be appended automatically
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="lime"
                      onClick={handleSendAll}
                      disabled={sendingAll}
                      className="rounded-sm"
                    >
                      {sendingAll ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Send All ({filteredApproved.length})
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Bulk action bar — appears whenever the user has selected
                      one or more rows. Mirrors the prospects-list pattern but
                      collapses to a single primary destructive action since
                      Ready-to-Send has no other multi-row operations beyond
                      Send All and Delete. */}
                  {selectedApprovedIds.size > 0 && (
                    <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-sm bg-lime-50 dark:bg-lime-500/10 border border-lime-200 dark:border-lime-500/30">
                      <span className="text-xs text-warm-700 dark:text-cream-200">
                        {selectedApprovedIds.size} message{selectedApprovedIds.size === 1 ? '' : 's'} selected
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedApprovedIds(new Set())}
                          className="h-7 px-2 text-xs rounded-sm"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDeleteConfirmOpen({
                              tab: 'approved',
                              ids: Array.from(selectedApprovedIds),
                              single: false,
                            })
                          }
                          disabled={bulkDeleting}
                          className="h-7 px-2 text-xs rounded-sm bg-red-600 hover:bg-red-700 text-white"
                        >
                          {bulkDeleting ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Delete Selected ({selectedApprovedIds.size})
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Select-all row */}
                  {filteredApproved.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Checkbox
                        checked={
                          filteredApproved.length > 0 &&
                          filteredApproved.every((m) => selectedApprovedIds.has(m.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedApprovedIds(new Set(filteredApproved.map((m) => m.id)))
                          } else {
                            setSelectedApprovedIds(new Set())
                          }
                        }}
                        aria-label="Select all"
                      />
                      <span className="text-[11px] text-warm-500 dark:text-cream-400">
                        Select all
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {filteredApproved.map((msg) => (
                      <MessageCard
                        key={msg.id}
                        msg={msg}
                        mode="approved"
                        expanded={expandedIds.has(msg.id)}
                        onToggleExpand={() => toggleExpanded(msg.id)}
                        sending={sendingIds.has(msg.id) || sendingAll}
                        onSend={() => handleSend([msg.id])}
                        emailOverride={emailOverrides[msg.id] ?? ''}
                        onEmailChange={(email) => updateEmailOverride(msg.id, email)}
                        getChannelIcon={getChannelIcon}
                        selectable
                        selected={selectedApprovedIds.has(msg.id)}
                        onSelectToggle={() => {
                          setSelectedApprovedIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(msg.id)) next.delete(msg.id)
                            else next.add(msg.id)
                            return next
                          })
                        }}
                        onDelete={() =>
                          setDeleteConfirmOpen({ tab: 'approved', ids: [msg.id], single: true })
                        }
                        deleting={deletingIds.has(msg.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Scheduled Follow-ups ── */}
        <TabsContent value="scheduled" className="mt-4">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              {loadingScheduled ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-400 dark:text-cream-500" />
                </div>
              ) : scheduledMessages.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="h-10 w-10 mx-auto text-warm-300 dark:text-charcoal-500 mb-3" />
                  <p className="text-sm text-warm-500 dark:text-cream-400">No scheduled follow-ups</p>
                  <p className="text-xs text-warm-400 dark:text-cream-500 mt-1">
                    Follow-up steps from sequences will appear here before their send date
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-warm-600 dark:text-cream-400 mb-4">
                    {filteredScheduled.length}{searchQuery ? ` of ${scheduledMessages.length}` : ''} follow-up{filteredScheduled.length !== 1 ? 's' : ''} scheduled
                  </p>

                  {/* Bulk action bar for Scheduled tab */}
                  {selectedScheduledIds.size > 0 && (
                    <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-sm bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                      <span className="text-xs text-warm-700 dark:text-cream-200">
                        {selectedScheduledIds.size} follow-up{selectedScheduledIds.size === 1 ? '' : 's'} selected
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedScheduledIds(new Set())}
                          className="h-7 px-2 text-xs rounded-sm"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setDeleteConfirmOpen({
                              tab: 'scheduled',
                              ids: Array.from(selectedScheduledIds),
                              single: false,
                            })
                          }
                          disabled={bulkDeleting}
                          className="h-7 px-2 text-xs rounded-sm bg-red-600 hover:bg-red-700 text-white"
                        >
                          {bulkDeleting ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Delete Selected ({selectedScheduledIds.size})
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Select-all row */}
                  {filteredScheduled.length > 0 && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <Checkbox
                        checked={
                          filteredScheduled.length > 0 &&
                          filteredScheduled.every((m) => selectedScheduledIds.has(m.id))
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedScheduledIds(new Set(filteredScheduled.map((m) => m.id)))
                          } else {
                            setSelectedScheduledIds(new Set())
                          }
                        }}
                        aria-label="Select all"
                      />
                      <span className="text-[11px] text-warm-500 dark:text-cream-400">
                        Select all
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {filteredScheduled.map((msg) => (
                      <MessageCard
                        key={msg.id}
                        msg={msg}
                        mode="scheduled"
                        expanded={expandedIds.has(msg.id)}
                        onToggleExpand={() => toggleExpanded(msg.id)}
                        getChannelIcon={getChannelIcon}
                        onCancel={() => handleCancelScheduled(msg.id)}
                        cancelling={cancellingId === msg.id}
                        selectable
                        selected={selectedScheduledIds.has(msg.id)}
                        onSelectToggle={() => {
                          setSelectedScheduledIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(msg.id)) next.delete(msg.id)
                            else next.add(msg.id)
                            return next
                          })
                        }}
                        onDelete={() =>
                          setDeleteConfirmOpen({ tab: 'scheduled', ids: [msg.id], single: true })
                        }
                        deleting={deletingIds.has(msg.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sent History ── */}
        <TabsContent value="sent" className="mt-4">
          <Card className="rounded-sm border-warm-200 dark:border-charcoal-700">
            <CardContent className="p-4">
              {loadingSent ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-400 dark:text-cream-500" />
                </div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-10">
                  <Send className="h-10 w-10 mx-auto text-warm-300 dark:text-charcoal-500 mb-3" />
                  <p className="text-sm text-warm-500 dark:text-cream-400">No sent messages yet</p>
                  <p className="text-xs text-warm-400 dark:text-cream-500 mt-1">
                    Messages will appear here after you send them
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-warm-600 dark:text-cream-400 mb-4">
                    {filteredSent.length}{searchQuery ? ` of ${sentMessages.length}` : ''} message{filteredSent.length !== 1 ? 's' : ''} sent
                  </p>
                  <div className="space-y-1.5">
                    {filteredSent.map((msg) => (
                      <MessageCard
                        key={msg.id}
                        msg={msg}
                        mode="sent"
                        expanded={expandedIds.has(msg.id)}
                        onToggleExpand={() => toggleExpanded(msg.id)}
                        getChannelIcon={getChannelIcon}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(() => {
        // Single combined in-flight flag — covers both the bulk path (which
        // toggles bulkDeleting) and the single-row path (which toggles an
        // entry in deletingIds). Used to gate Cancel, the destructive
        // action, and the dialog dismissal so a user can't double-click or
        // Escape past an in-progress request.
        const inFlight =
          bulkDeleting ||
          (deleteConfirmOpen?.ids ?? []).some((id) => deletingIds.has(id))
        return (
          <AlertDialog
            open={!!deleteConfirmOpen}
            onOpenChange={(open) => {
              if (!open && !inFlight) setDeleteConfirmOpen(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {deleteConfirmOpen?.single
                    ? 'Delete this message?'
                    : `Delete ${deleteConfirmOpen?.ids.length ?? 0} messages?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {deleteConfirmOpen?.tab === 'scheduled'
                    ? 'Scheduled follow-up(s) will be cancelled and removed from the queue. The executor cron will skip them. This cannot be undone from the UI.'
                    : 'Approved draft(s) will be removed from Ready to Send. The recipients will not receive them. This cannot be undone from the UI.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={inFlight}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={inFlight}
                  onClick={(e) => {
                    // Don't auto-close — handleDelete clears state itself
                    // after the API call resolves.
                    e.preventDefault()
                    if (deleteConfirmOpen && !inFlight) {
                      void handleDelete(deleteConfirmOpen.tab, deleteConfirmOpen.ids)
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {inFlight ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )
      })()}
    </div>
  )
}

// ── Shared message card for Approved, Scheduled, and Sent views ──
function MessageCard({
  msg,
  mode,
  expanded,
  onToggleExpand,
  sending,
  onSend,
  emailOverride,
  onEmailChange,
  getChannelIcon,
  onCancel,
  cancelling,
  selectable,
  selected,
  onSelectToggle,
  onDelete,
  deleting,
}: {
  msg: MessageItem
  mode: 'approved' | 'sent' | 'scheduled'
  expanded: boolean
  onToggleExpand: () => void
  sending?: boolean
  onSend?: () => void
  emailOverride?: string
  onEmailChange?: (email: string) => void
  getChannelIcon: (channel: string) => React.ReactNode
  onCancel?: () => void
  cancelling?: boolean
  // Multi-select hooks — only passed by Ready-to-Send and Scheduled tabs;
  // Sent intentionally omits them so the row stays read-only.
  selectable?: boolean
  selected?: boolean
  onSelectToggle?: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  const [editingEmail, setEditingEmail] = useState(false)
  const borderHover = mode === 'approved' ? 'hover:border-lime-400' : mode === 'scheduled' ? 'hover:border-amber-300' : ''
  const effectiveEmail = emailOverride?.trim() || msg.contactEmail || ''

  return (
    <div className={`rounded-sm border border-warm-200 dark:border-charcoal-700 p-3 transition-colors ${borderHover}`}>
      <div className="flex items-start justify-between gap-2">
        {/* Multi-select checkbox — leading the row when selectable */}
        {selectable && (
          <div className="pt-0.5 shrink-0">
            <Checkbox
              checked={!!selected}
              onCheckedChange={() => onSelectToggle?.()}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select message"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <Link
              href={`/growth/prospects/${msg.prospectId}`}
              className="text-sm font-medium text-warm-900 dark:text-cream-100 hover:text-ocean-600"
            >
              {msg.prospectName}
            </Link>
            {msg.step && msg.step > 1 && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                Step {msg.step}
              </Badge>
            )}
            {msg.isAiGenerated && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-plum-100 text-plum-700 border-plum-200">
                <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                AI
              </Badge>
            )}
            <Badge
              variant="outline"
              className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 dark:border-charcoal-700 flex items-center gap-1"
            >
              {getChannelIcon(msg.channel)}
              {msg.channel}
            </Badge>
            {mode === 'sent' && msg.bouncedAt && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-red-200 flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                Bounced
              </Badge>
            )}
            {mode === 'sent' && !msg.bouncedAt && msg.openedAt && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-plum-100 text-plum-700 border-plum-200 flex items-center gap-0.5">
                <Eye className="h-2.5 w-2.5" />
                Opened{msg.openCount && msg.openCount > 1 ? ` (${msg.openCount}x)` : ''}
              </Badge>
            )}
            {mode === 'sent' && msg.clickedAt && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-0.5">
                <MousePointerClick className="h-2.5 w-2.5" />
                Clicked{msg.clickCount && msg.clickCount > 1 ? ` (${msg.clickCount}x)` : ''}
              </Badge>
            )}
            {mode === 'sent' && !msg.bouncedAt && msg.deliveredAt && !msg.openedAt && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200 flex items-center gap-0.5">
                <CheckCircle className="h-2.5 w-2.5" />
                Delivered
              </Badge>
            )}
            {mode === 'sent' && !msg.bouncedAt && !msg.deliveredAt && !msg.openedAt && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-warm-100 dark:bg-charcoal-800 text-warm-600 dark:text-cream-400 border-warm-200 dark:border-charcoal-700">
                Sent
              </Badge>
            )}
          </div>

          {/* Editable To field for approved messages */}
          {mode === 'approved' && msg.channel === 'email' ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-warm-500 dark:text-cream-400 shrink-0">To:</span>
              {editingEmail ? (
                <Input
                  type="email"
                  value={emailOverride ?? msg.contactEmail ?? ''}
                  onChange={(e) => onEmailChange?.(e.target.value)}
                  onBlur={() => setEditingEmail(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setEditingEmail(false)
                  }}
                  autoFocus
                  className="h-6 text-xs rounded-sm border-warm-300 dark:border-charcoal-700 px-1.5 py-0 max-w-xs"
                  placeholder="recipient@example.com"
                />
              ) : (
                <button
                  onClick={() => setEditingEmail(true)}
                  className="flex items-center gap-1 text-xs text-warm-700 dark:text-cream-300 hover:text-ocean-600 group"
                >
                  <span>{effectiveEmail || 'No email — click to add'}</span>
                  <Pencil className="h-2.5 w-2.5 text-warm-400 dark:text-cream-500 group-hover:text-ocean-500" />
                </button>
              )}
            </div>
          ) : (
            (msg.contactName || msg.contactEmail) && (
              <p className="text-xs text-warm-500 dark:text-cream-400">
                To:{' '}
                {msg.contactName
                  ? `${msg.contactName}${msg.contactEmail ? ` <${msg.contactEmail}>` : ''}`
                  : msg.contactEmail}
              </p>
            )
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          {mode === 'approved' && onSend && (
            <Button
              size="sm"
              variant="lime"
              onClick={onSend}
              disabled={sending}
              className="rounded-sm"
            >
              {sending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Send
                </>
              )}
            </Button>
          )}
          {mode === 'scheduled' && (
            <div className="flex items-center gap-2">
              {msg.scheduledAt && (
                <span className="text-[10px] text-amber-600 whitespace-nowrap">
                  <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                  {format(new Date(msg.scheduledAt), 'MMM d, yyyy')}
                </span>
              )}
              {onCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancel}
                  disabled={cancelling}
                  className="rounded-sm h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                  {cancelling ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          {mode === 'sent' && msg.sentAt && (
            <span className="text-[10px] text-warm-400 dark:text-cream-500 whitespace-nowrap">
              {format(new Date(msg.sentAt), 'MMM d, h:mm a')}
            </span>
          )}
          {/* Per-row delete — only rendered when the parent passes onDelete.
              Sent mode never passes it (rows must stay for Resend webhook
              tracking + analytics). */}
          {onDelete && (mode === 'approved' || mode === 'scheduled') && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              disabled={deleting}
              aria-label="Delete message"
              className="h-7 w-7 p-0 rounded-sm text-warm-400 dark:text-cream-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Subject */}
      {msg.subject && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide mb-0.5">
            Subject
          </p>
          <p className="text-sm text-warm-900 dark:text-cream-100">{msg.subject}</p>
        </div>
      )}

      {/* Message body (collapsible) */}
      <div className="mt-2">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-[10px] font-medium text-warm-500 dark:text-cream-400 uppercase tracking-wide hover:text-warm-700 dark:hover:text-cream-300"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Message
        </button>
        {expanded && (
          <div className="mt-1 text-sm whitespace-pre-wrap bg-warm-50 dark:bg-charcoal-800 p-2.5 rounded-sm border border-warm-200 dark:border-charcoal-700 text-warm-700 dark:text-cream-300">
            {msg.body}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-warm-100 dark:border-charcoal-700">
        {mode === 'approved' && msg.approvedAt && (
          <span className="text-[10px] text-warm-400 dark:text-cream-500">
            Approved {format(new Date(msg.approvedAt), 'MMM d, h:mm a')}
          </span>
        )}
        {mode === 'scheduled' && msg.campaignName && (
          <span className="text-[10px] text-warm-400 dark:text-cream-500">Sequence: {msg.campaignName}</span>
        )}
        {mode === 'sent' && msg.campaignName && (
          <span className="text-[10px] text-warm-400 dark:text-cream-500">Campaign: {msg.campaignName}</span>
        )}
        {mode === 'sent' && (msg.deliveredAt || msg.openedAt || msg.clickedAt) && (
          <span className="text-[10px] text-warm-400 dark:text-cream-500 ml-auto flex items-center gap-2">
            {msg.deliveredAt && (
              <span title={`Delivered ${format(new Date(msg.deliveredAt), 'MMM d, h:mm a')}`}>
                <CheckCircle className="h-2.5 w-2.5 inline mr-0.5 text-lime-500" />
                {format(new Date(msg.deliveredAt), 'MMM d')}
              </span>
            )}
            {msg.openedAt && (
              <span title={`First opened ${format(new Date(msg.openedAt), 'MMM d, h:mm a')}`}>
                <Eye className="h-2.5 w-2.5 inline mr-0.5 text-plum-500" />
                {format(new Date(msg.openedAt), 'MMM d')}
                {msg.openCount && msg.openCount > 1 ? ` (${msg.openCount}x)` : ''}
              </span>
            )}
            {msg.clickedAt && (
              <span title={`First clicked ${format(new Date(msg.clickedAt), 'MMM d, h:mm a')}`}>
                <MousePointerClick className="h-2.5 w-2.5 inline mr-0.5 text-amber-500" />
                {format(new Date(msg.clickedAt), 'MMM d')}
                {msg.clickCount && msg.clickCount > 1 ? ` (${msg.clickCount}x)` : ''}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  )
}
