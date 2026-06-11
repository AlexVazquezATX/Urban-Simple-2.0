'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import {
  CheckCircle2,
  XCircle,
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Copy,
  Sparkles,
  Loader2,
  Pencil,
  RefreshCw,
  Check,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { format } from 'date-fns'

interface ApprovalMessage {
  id: string
  prospectId: string
  prospectName: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  channel: string
  subject: string | null
  body: string
  isAiGenerated: boolean
  createdAt: string
  campaignName: string | null
}

export function ApprovalQueue({ searchQuery = '' }: { searchQuery?: string }) {
  const [messages, setMessages] = useState<ApprovalMessage[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedBody, setEditedBody] = useState<string>('')
  const [editedSubject, setEditedSubject] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)

  const filteredMessages = useMemo(() => {
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
  }, [messages, searchQuery])

  useEffect(() => {
    fetchQueue()
  }, [])

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/growth/outreach/approval-queue')
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching approval queue:', error)
      toast.error('Failed to load approval queue')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (messageIds: string[]) => {
    setApproving(true)
    try {
      const response = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds,
          action: 'approve',
        }),
      })

      if (!response.ok) throw new Error('Failed to approve')
      const data = await response.json()

      toast.success(`Approved ${data.updated} message(s)`)
      setSelectedIds(new Set())
      fetchQueue()
    } catch (error) {
      console.error('Error approving messages:', error)
      toast.error('Failed to approve messages')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async (messageIds: string[]) => {
    try {
      const response = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageIds,
          action: 'reject',
        }),
      })

      if (!response.ok) throw new Error('Failed to reject')
      const data = await response.json()

      toast.success(`Rejected ${data.updated} message(s)`)
      setSelectedIds(new Set())
      fetchQueue()
    } catch (error) {
      console.error('Error rejecting messages:', error)
      toast.error('Failed to reject messages')
    }
  }

  const handleApproveAll = async () => {
    if (!confirm('Approve all pending messages?')) return

    setApproving(true)
    try {
      const response = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_all',
        }),
      })

      if (!response.ok) throw new Error('Failed to approve all')
      const data = await response.json()

      toast.success(`Approved ${data.approved} messages`)
      fetchQueue()
    } catch (error) {
      console.error('Error approving all:', error)
      toast.error('Failed to approve all messages')
    } finally {
      setApproving(false)
    }
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!editedBody.trim()) {
      toast.error('Message body cannot be empty')
      return
    }

    setSavingEdit(true)
    try {
      const response = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          messageId,
          body: editedBody,
          subject: editedSubject || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save edit')
      }

      const data = await response.json()

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, body: data.message.body, subject: data.message.subject, isAiGenerated: false }
            : m
        )
      )

      setEditingId(null)
      setEditedBody('')
      setEditedSubject('')
      toast.success('Message updated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRegenerate = async (messageId: string) => {
    setRegeneratingId(messageId)
    try {
      const response = await fetch('/api/growth/outreach/approval-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          messageId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to regenerate')
      }

      const data = await response.json()

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, body: data.message.body, subject: data.message.subject ?? m.subject, isAiGenerated: true }
            : m
        )
      )

      toast.success('Message regenerated')
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate message')
    } finally {
      setRegeneratingId(null)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="size-3" />
      case 'sms':
        return <MessageSquare className="size-3" />
      case 'linkedin':
        return <Linkedin className="size-3" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="size-3" />
      default:
        return <Mail className="size-3" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Queue</CardTitle>
          <CardDescription>First-contact messages awaiting your review</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={CheckCircle2}
            title="Queue's clear — nothing waiting on you"
            description="Every first-contact message has been reviewed. New drafts will land here for approval."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription className="mt-1">
              {filteredMessages.length}{searchQuery ? ` of ${messages.length}` : ''} first-contact message{filteredMessages.length !== 1 ? 's' : ''} awaiting review
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(Array.from(selectedIds))}
                >
                  <XCircle className="size-3.5" />
                  Reject ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApprove(Array.from(selectedIds))}
                  disabled={approving}
                >
                  <CheckCircle2 className="size-3.5 text-green-600 dark:text-green-300" />
                  Approve ({selectedIds.size})
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="gold"
              onClick={handleApproveAll}
              disabled={approving}
            >
              {approving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Approve All
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className="rounded-[12px] border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(message.id)}
                  onCheckedChange={() => toggleSelect(message.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1 space-y-2.5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/growth/prospects/${message.prospectId}`}
                          className="text-sm font-semibold text-foreground hover:text-primary"
                        >
                          {message.prospectName}
                        </Link>
                        {message.isAiGenerated && (
                          <Badge variant="gold">
                            <Sparkles className="size-3" />
                            AI
                          </Badge>
                        )}
                        <Badge variant="neutral">
                          {getChannelIcon(message.channel)}
                          {message.channel}
                        </Badge>
                      </div>
                      {message.contactName && (
                        <p className="text-xs text-muted-foreground">
                          To: {message.contactName}
                          {message.contactEmail && ` <${message.contactEmail}>`}
                        </p>
                      )}
                      {message.campaignName && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Campaign: {message.campaignName}
                        </p>
                      )}
                    </div>
                    {/* Per-card approve / dismiss */}
                    <div className="ml-2 flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleReject([message.id])}
                        aria-label="Dismiss message"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-4" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleApprove([message.id])}
                        disabled={approving}
                        aria-label="Approve message"
                        className="text-green-600 hover:text-green-600 dark:text-green-300 dark:hover:text-green-300 hover:bg-green-600/10 dark:hover:bg-green-300/12"
                      >
                        <Check className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Subject (display only when not editing) */}
                  {message.subject && editingId !== message.id && (
                    <div>
                      <p className="kicker mb-1 text-muted-foreground">Subject</p>
                      <p className="text-sm text-foreground">{message.subject}</p>
                    </div>
                  )}

                  {/* Message Content */}
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="kicker text-muted-foreground">Message</p>
                      {(message.channel === 'linkedin' ||
                        message.channel === 'instagram' ||
                        message.channel === 'instagram_dm') && editingId !== message.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(message.body)}
                          className="h-6 px-2 text-xs"
                        >
                          <Copy className="size-3" />
                          Copy
                        </Button>
                      )}
                    </div>
                    {editingId === message.id ? (
                      <div className="space-y-2">
                        {message.channel === 'email' && (
                          <div>
                            <p className="kicker mb-1 text-muted-foreground">Subject</p>
                            <Input
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                              placeholder="Email subject"
                              className="text-sm"
                            />
                          </div>
                        )}
                        <Textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={6}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="gold"
                            onClick={() => handleSaveEdit(message.id)}
                            disabled={savingEdit}
                          >
                            {savingEdit ? (
                              <>
                                <Loader2 className="size-3 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null)
                              setEditedBody('')
                              setEditedSubject('')
                            }}
                            disabled={savingEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : regeneratingId === message.id ? (
                      <div className="flex items-center justify-center rounded-[10px] border border-border bg-secondary/50 py-6">
                        <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Generating new message...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap rounded-[10px] border border-border bg-secondary/50 p-3 text-sm leading-relaxed text-foreground">
                        {message.body}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-border pt-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(message.id)
                        setEditedBody(message.body)
                        setEditedSubject(message.subject || '')
                      }}
                      disabled={regeneratingId === message.id}
                      className="h-6 px-2 text-xs"
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerate(message.id)}
                      disabled={regeneratingId !== null}
                      className="h-6 px-2 text-xs"
                    >
                      {regeneratingId === message.id ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="size-3" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
                      Created {format(new Date(message.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
