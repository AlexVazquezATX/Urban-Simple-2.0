'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

  const handleTabChange = (tab: string) => {
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
        return <Mail className="h-3.5 w-3.5 text-warm-500" />
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-400" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by prospect, contact, subject, or campaign..."
          className="pl-8 h-8 text-xs rounded-sm border-warm-200"
        />
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4 rounded-none bg-white border-b border-warm-200 p-0 h-auto">
          <TabsTrigger
            value="pending"
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50"
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
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50"
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
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50"
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
            className="flex items-center gap-1.5 text-xs py-2.5 rounded-none data-[state=active]:bg-warm-100 data-[state=active]:text-warm-900 text-warm-500 hover:bg-warm-50"
          >
            <Send className="h-3.5 w-3.5 text-plum-500" />
            <span>Sent</span>
            {sentMessages.length > 0 && (
              <Badge className="ml-0.5 rounded-full text-[10px] px-1.5 py-0 bg-warm-200 text-warm-600">
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
          <Card className="rounded-sm border-warm-200">
            <CardContent className="p-4">
              {loadingApproved ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-400" />
                </div>
              ) : approvedMessages.length === 0 ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-warm-300 mb-3" />
                  <p className="text-sm text-warm-500">No approved messages waiting to send</p>
                  <p className="text-xs text-warm-400 mt-1">
                    Approve messages in the Pending Review tab first
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-warm-600">
                        {filteredApproved.length}{searchQuery ? ` of ${approvedMessages.length}` : ''} message{filteredApproved.length !== 1 ? 's' : ''} ready
                      </p>
                      <p className="text-[10px] text-warm-400">
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
          <Card className="rounded-sm border-warm-200">
            <CardContent className="p-4">
              {loadingScheduled ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-400" />
                </div>
              ) : scheduledMessages.length === 0 ? (
                <div className="text-center py-10">
                  <Clock className="h-10 w-10 mx-auto text-warm-300 mb-3" />
                  <p className="text-sm text-warm-500">No scheduled follow-ups</p>
                  <p className="text-xs text-warm-400 mt-1">
                    Follow-up steps from sequences will appear here before their send date
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-warm-600 mb-4">
                    {filteredScheduled.length}{searchQuery ? ` of ${scheduledMessages.length}` : ''} follow-up{filteredScheduled.length !== 1 ? 's' : ''} scheduled
                  </p>
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
          <Card className="rounded-sm border-warm-200">
            <CardContent className="p-4">
              {loadingSent ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-warm-400" />
                </div>
              ) : sentMessages.length === 0 ? (
                <div className="text-center py-10">
                  <Send className="h-10 w-10 mx-auto text-warm-300 mb-3" />
                  <p className="text-sm text-warm-500">No sent messages yet</p>
                  <p className="text-xs text-warm-400 mt-1">
                    Messages will appear here after you send them
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-warm-600 mb-4">
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
    </div>
  )
}

// ── Shared message card for Approved + Sent views ──
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
}) {
  const [editingEmail, setEditingEmail] = useState(false)
  const borderHover = mode === 'approved' ? 'hover:border-lime-400' : mode === 'scheduled' ? 'hover:border-amber-300' : ''
  const effectiveEmail = emailOverride?.trim() || msg.contactEmail || ''

  return (
    <div className={`rounded-sm border border-warm-200 p-3 transition-colors ${borderHover}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <Link
              href={`/growth/prospects/${msg.prospectId}`}
              className="text-sm font-medium text-warm-900 hover:text-ocean-600"
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
              className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 flex items-center gap-1"
            >
              {getChannelIcon(msg.channel)}
              {msg.channel}
            </Badge>
            {mode === 'sent' && (
              <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-lime-100 text-lime-700 border-lime-200">
                Sent
              </Badge>
            )}
          </div>

          {/* Editable To field for approved messages */}
          {mode === 'approved' && msg.channel === 'email' ? (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs text-warm-500 shrink-0">To:</span>
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
                  className="h-6 text-xs rounded-sm border-warm-300 px-1.5 py-0 max-w-xs"
                  placeholder="recipient@example.com"
                />
              ) : (
                <button
                  onClick={() => setEditingEmail(true)}
                  className="flex items-center gap-1 text-xs text-warm-700 hover:text-ocean-600 group"
                >
                  <span>{effectiveEmail || 'No email — click to add'}</span>
                  <Pencil className="h-2.5 w-2.5 text-warm-400 group-hover:text-ocean-500" />
                </button>
              )}
            </div>
          ) : (
            (msg.contactName || msg.contactEmail) && (
              <p className="text-xs text-warm-500">
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
            <span className="text-[10px] text-warm-400 whitespace-nowrap">
              {format(new Date(msg.sentAt), 'MMM d, h:mm a')}
            </span>
          )}
        </div>
      </div>

      {/* Subject */}
      {msg.subject && (
        <div className="mt-2">
          <p className="text-[10px] font-medium text-warm-500 uppercase tracking-wide mb-0.5">
            Subject
          </p>
          <p className="text-sm text-warm-900">{msg.subject}</p>
        </div>
      )}

      {/* Message body (collapsible) */}
      <div className="mt-2">
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-1 text-[10px] font-medium text-warm-500 uppercase tracking-wide hover:text-warm-700"
        >
          {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Message
        </button>
        {expanded && (
          <div className="mt-1 text-sm whitespace-pre-wrap bg-warm-50 p-2.5 rounded-sm border border-warm-200 text-warm-700">
            {msg.body}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-warm-100">
        {mode === 'approved' && msg.approvedAt && (
          <span className="text-[10px] text-warm-400">
            Approved {format(new Date(msg.approvedAt), 'MMM d, h:mm a')}
          </span>
        )}
        {mode === 'scheduled' && msg.campaignName && (
          <span className="text-[10px] text-warm-400">Sequence: {msg.campaignName}</span>
        )}
        {mode === 'sent' && msg.campaignName && (
          <span className="text-[10px] text-warm-400">Campaign: {msg.campaignName}</span>
        )}
      </div>
    </div>
  )
}
