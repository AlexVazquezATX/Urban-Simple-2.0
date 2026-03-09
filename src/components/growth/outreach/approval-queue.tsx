'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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

  if (loading) {
    return (
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-display font-medium text-warm-900">Approval Queue</CardTitle>
          <CardDescription className="text-xs text-warm-500">Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (messages.length === 0) {
    return (
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-display font-medium text-warm-900">Approval Queue</CardTitle>
          <CardDescription className="text-xs text-warm-500">
            First-contact messages awaiting your review
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-center py-10">
            <CheckCircle2 className="h-10 w-10 mx-auto text-warm-300 mb-3" />
            <p className="text-sm text-warm-500">No messages pending approval</p>
            <p className="text-xs text-warm-400 mt-1">
              All first-contact messages have been reviewed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-sm border-warm-200">
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-display font-medium text-warm-900">Approval Queue</CardTitle>
            <CardDescription className="text-xs text-warm-500">
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
                  className="rounded-sm"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Reject ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  variant="lime"
                  onClick={() => handleApprove(Array.from(selectedIds))}
                  disabled={approving}
                  className="rounded-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Approve ({selectedIds.size})
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="lime"
              onClick={handleApproveAll}
              disabled={approving}
              className="rounded-sm"
            >
              {approving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Approve All
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="space-y-1.5">
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className="rounded-sm border border-warm-200 p-3 hover:border-ocean-400 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedIds.has(message.id)}
                  onCheckedChange={() => toggleSelect(message.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <Link
                          href={`/growth/prospects/${message.prospectId}`}
                          className="text-sm font-medium text-warm-900 hover:text-ocean-600"
                        >
                          {message.prospectName}
                        </Link>
                        {message.isAiGenerated && (
                          <Badge className="rounded-sm text-[10px] px-1.5 py-0 bg-plum-100 text-plum-700 border-plum-200">
                            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                            AI
                          </Badge>
                        )}
                        <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300 flex items-center gap-1">
                          {getChannelIcon(message.channel)}
                          {message.channel}
                        </Badge>
                      </div>
                      {message.contactName && (
                        <p className="text-xs text-warm-500">
                          To: {message.contactName}
                          {message.contactEmail && ` <${message.contactEmail}>`}
                        </p>
                      )}
                      {message.campaignName && (
                        <p className="text-[10px] text-warm-400 mt-0.5">
                          Campaign: {message.campaignName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReject([message.id])}
                        className="h-7 w-7 p-0 text-warm-500 hover:text-red-600"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleApprove([message.id])}
                        disabled={approving}
                        className="h-7 w-7 p-0 text-warm-500 hover:text-lime-600"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Subject (display only when not editing) */}
                  {message.subject && editingId !== message.id && (
                    <div>
                      <p className="text-[10px] font-medium text-warm-500 uppercase tracking-wide mb-0.5">Subject</p>
                      <p className="text-sm text-warm-900">{message.subject}</p>
                    </div>
                  )}

                  {/* Message Content */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[10px] font-medium text-warm-500 uppercase tracking-wide">Message</p>
                      {(message.channel === 'linkedin' ||
                        message.channel === 'instagram' ||
                        message.channel === 'instagram_dm') && editingId !== message.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(message.body)}
                          className="h-6 px-2 text-xs text-warm-500 hover:text-ocean-600"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      )}
                    </div>
                    {editingId === message.id ? (
                      <div className="space-y-2">
                        {message.channel === 'email' && (
                          <div>
                            <p className="text-[10px] font-medium text-warm-500 uppercase tracking-wide mb-0.5">Subject</p>
                            <Input
                              value={editedSubject}
                              onChange={(e) => setEditedSubject(e.target.value)}
                              placeholder="Email subject"
                              className="rounded-sm border-warm-200 text-sm"
                            />
                          </div>
                        )}
                        <Textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={6}
                          className="rounded-sm border-warm-200 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="lime"
                            onClick={() => handleSaveEdit(message.id)}
                            disabled={savingEdit}
                            className="rounded-sm"
                          >
                            {savingEdit ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
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
                            className="rounded-sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : regeneratingId === message.id ? (
                      <div className="flex items-center justify-center py-6 bg-warm-50 rounded-sm border border-warm-200">
                        <Loader2 className="h-4 w-4 animate-spin text-plum-500 mr-2" />
                        <span className="text-xs text-warm-500">Generating new message...</span>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap bg-warm-50 p-2.5 rounded-sm border border-warm-200 text-warm-700">
                        {message.body}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-warm-100">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(message.id)
                        setEditedBody(message.body)
                        setEditedSubject(message.subject || '')
                      }}
                      disabled={regeneratingId === message.id}
                      className="h-6 px-2 text-xs text-warm-500 hover:text-ocean-600"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRegenerate(message.id)}
                      disabled={regeneratingId !== null}
                      className="h-6 px-2 text-xs text-warm-500 hover:text-plum-600"
                    >
                      {regeneratingId === message.id ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    <span className="text-[10px] text-warm-400 ml-auto">
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
