'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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

export function ApprovalQueue() {
  const [messages, setMessages] = useState<ApprovalMessage[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editedBody, setEditedBody] = useState<string>('')

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
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <MessageSquare className="h-4 w-4" />
      case 'linkedin':
        return <Linkedin className="h-4 w-4" />
      case 'instagram':
      case 'instagram_dm':
        return <Instagram className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
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
          <CardDescription>
            First-contact messages awaiting your review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No messages pending approval</p>
            <p className="text-sm text-muted-foreground mt-2">
              All first-contact messages have been reviewed
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription>
              {messages.length} first-contact message{messages.length !== 1 ? 's' : ''} awaiting review
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
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(Array.from(selectedIds))}
                  disabled={approving}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Selected ({selectedIds.size})
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="default"
              onClick={handleApproveAll}
              disabled={approving}
            >
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve All
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <Checkbox
                  checked={selectedIds.has(message.id)}
                  onCheckedChange={() => toggleSelect(message.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/growth/prospects/${message.prospectId}`}
                          className="font-semibold hover:text-primary"
                        >
                          {message.prospectName}
                        </Link>
                        {message.isAiGenerated && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Generated
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          {getChannelIcon(message.channel)}
                          {message.channel}
                        </Badge>
                      </div>
                      {message.contactName && (
                        <p className="text-sm text-muted-foreground">
                          To: {message.contactName}
                          {message.contactEmail && ` <${message.contactEmail}>`}
                        </p>
                      )}
                      {message.campaignName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Campaign: {message.campaignName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject([message.id])}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove([message.id])}
                        disabled={approving}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Message Content */}
                  {message.subject && (
                    <div>
                      <p className="text-sm font-medium mb-1">Subject:</p>
                      <p className="text-sm">{message.subject}</p>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Message:</p>
                      {(message.channel === 'linkedin' ||
                        message.channel === 'instagram' ||
                        message.channel === 'instagram_dm') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(message.body)}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                      )}
                    </div>
                    {editingId === message.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedBody}
                          onChange={(e) => setEditedBody(e.target.value)}
                          rows={6}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              // TODO: Save edited message
                              setEditingId(null)
                            }}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null)
                              setEditedBody('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded border">
                        {message.body}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(message.id)
                        setEditedBody(message.body)
                      }}
                    >
                      Edit
                    </Button>
                    <span className="text-xs text-muted-foreground">
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
