'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Send,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export function BulkSender() {
  const [prospects, setProspects] = useState<any[]>([])
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set())
  const [channel, setChannel] = useState('email')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [templates, setTemplates] = useState<any[]>([])
  const [isSending, setIsSending] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all',
    businessType: 'all',
  })

  useEffect(() => {
    fetchProspects()
    fetchTemplates()
  }, [channel])

  const fetchProspects = async () => {
    try {
      const response = await fetch('/api/growth/prospects')
      if (response.ok) {
        const data = await response.json()
        setProspects(data || [])
      }
    } catch (error) {
      console.error('Error fetching prospects:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/growth/outreach/templates?channel=${channel}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  const filteredProspects = prospects.filter((p) => {
    if (filters.status !== 'all' && p.status !== filters.status) return false
    if (filters.businessType !== 'all' && p.businessType !== filters.businessType) return false
    return true
  })

  const handleSelectAll = () => {
    if (selectedProspects.size === filteredProspects.length) {
      setSelectedProspects(new Set())
    } else {
      setSelectedProspects(new Set(filteredProspects.map((p) => p.id)))
    }
  }

  const handleToggleProspect = (id: string) => {
    const newSelected = new Set(selectedProspects)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedProspects(newSelected)
  }

  const handleUseTemplate = () => {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      if (template.subject) setSubject(template.subject)
      setBody(template.body)
    }
  }

  const handleSend = async () => {
    if (selectedProspects.size === 0) {
      toast.error('Please select at least one prospect')
      return
    }

    if (!body) {
      toast.error('Please enter a message')
      return
    }

    if (channel === 'email' && !subject) {
      toast.error('Please enter an email subject')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/growth/outreach/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectIds: Array.from(selectedProspects),
          channel,
          subject: channel === 'email' ? subject : null,
          body,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send')
      }

      const result = await response.json()
      toast.success(`Sent to ${result.sent} prospects`)

      // Reset
      setSelectedProspects(new Set())
      setSubject('')
      setBody('')
      setTemplateId('')
    } catch (error: any) {
      console.error('Error sending bulk:', error)
      toast.error(error.message || 'Failed to send messages')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Outreach</CardTitle>
          <CardDescription>
            Send personalized messages to multiple prospects at once
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Filter by Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filter by Business Type</Label>
              <Select value={filters.businessType} onValueChange={(v) => setFilters({ ...filters, businessType: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="resort">Resort</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prospect Selection */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Select Prospects ({selectedProspects.size} selected)</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="h-7 px-2 text-xs">
                {selectedProspects.size === filteredProspects.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-[12px] border border-border p-3">
              {filteredProspects.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No prospects match your filters
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-secondary/60"
                    >
                      <Checkbox
                        checked={selectedProspects.has(prospect.id)}
                        onCheckedChange={() => handleToggleProspect(prospect.id)}
                      />
                      <span className="flex-1 text-sm text-foreground">{prospect.companyName}</span>
                      <Badge variant="neutral">{prospect.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Channel Selection */}
          <div>
            <Label>Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="size-3.5 text-muted-foreground" />
                    SMS
                  </div>
                </SelectItem>
                <SelectItem value="linkedin">
                  <div className="flex items-center gap-2">
                    <Linkedin className="size-3.5 text-muted-foreground" />
                    LinkedIn
                  </div>
                </SelectItem>
                <SelectItem value="instagram_dm">
                  <div className="flex items-center gap-2">
                    <Instagram className="size-3.5 text-muted-foreground" />
                    Instagram DM
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <Label>Use Template (Optional)</Label>
              <div className="mt-1 flex gap-2">
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleUseTemplate} disabled={!templateId}>
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Message Composition */}
          {channel === 'email' && (
            <div>
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject (use {{company_name}} for personalization)"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder={`${channel === 'email' ? 'Email' : channel.toUpperCase()} message (use {{company_name}}, {{contact_first_name}} for personalization)`}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Variables: {`{{company_name}}`}, {`{{contact_first_name}}`}, {`{{your_name}}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 border-t border-border pt-4">
            <Button
              onClick={handleSend}
              disabled={isSending || selectedProspects.size === 0 || !body || (channel === 'email' && !subject)}
              variant="gold"
            >
              {isSending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Send to {selectedProspects.size} Prospects
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Messages will be sent with a 30-second delay between each to avoid spam detection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
