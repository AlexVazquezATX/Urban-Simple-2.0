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
  Users,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProspectSelector } from './prospect-selector'

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
      <Card className="rounded-sm border-warm-200">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-display font-medium text-warm-900">Bulk Outreach</CardTitle>
          <CardDescription className="text-xs text-warm-500">
            Send personalized messages to multiple prospects at once
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-6">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-warm-700">Filter by Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="rounded-sm border-warm-200 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium text-warm-700">Filter by Business Type</Label>
              <Select value={filters.businessType} onValueChange={(v) => setFilters({ ...filters, businessType: v })}>
                <SelectTrigger className="rounded-sm border-warm-200 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-sm">
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
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-warm-700">Select Prospects ({selectedProspects.size} selected)</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll} className="rounded-sm h-7 px-2 text-xs">
                {selectedProspects.size === filteredProspects.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="border border-warm-200 rounded-sm p-3 max-h-64 overflow-y-auto">
              {filteredProspects.length === 0 ? (
                <p className="text-sm text-warm-500 text-center py-4">
                  No prospects match your filters
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-warm-50"
                    >
                      <Checkbox
                        checked={selectedProspects.has(prospect.id)}
                        onCheckedChange={() => handleToggleProspect(prospect.id)}
                      />
                      <span className="text-sm text-warm-900 flex-1">{prospect.companyName}</span>
                      <Badge variant="outline" className="rounded-sm text-[10px] px-1.5 py-0 border-warm-300">
                        {prospect.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Channel Selection */}
          <div>
            <Label className="text-xs font-medium text-warm-700">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="rounded-sm border-warm-200 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-sm">
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-ocean-500" />
                    Email
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-lime-600" />
                    SMS
                  </div>
                </SelectItem>
                <SelectItem value="linkedin">
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-3.5 w-3.5 text-ocean-600" />
                    LinkedIn
                  </div>
                </SelectItem>
                <SelectItem value="instagram_dm">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-3.5 w-3.5 text-plum-500" />
                    Instagram DM
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          {templates.length > 0 && (
            <div>
              <Label className="text-xs font-medium text-warm-700">Use Template (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger className="rounded-sm border-warm-200">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-sm">
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleUseTemplate} disabled={!templateId} className="rounded-sm">
                  Apply
                </Button>
              </div>
            </div>
          )}

          {/* Message Composition */}
          {channel === 'email' && (
            <div>
              <Label className="text-xs font-medium text-warm-700">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject (use {{company_name}} for personalization)"
                className="rounded-sm border-warm-200 mt-1"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-warm-700">Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder={`${channel === 'email' ? 'Email' : channel.toUpperCase()} message (use {{company_name}}, {{contact_first_name}} for personalization)`}
              className="rounded-sm border-warm-200 mt-1"
            />
            <p className="text-[10px] text-warm-400 mt-1">
              Variables: {`{{company_name}}`}, {`{{contact_first_name}}`}, {`{{your_name}}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t border-warm-200">
            <Button
              onClick={handleSend}
              disabled={isSending || selectedProspects.size === 0 || !body || (channel === 'email' && !subject)}
              variant="lime"
              className="rounded-sm"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send to {selectedProspects.size} Prospects
                </>
              )}
            </Button>
            <p className="text-xs text-warm-500">
              Messages will be sent with a 30-second delay between each to avoid spam detection
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
