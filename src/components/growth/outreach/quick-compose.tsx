'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  MessageSquare,
  Linkedin,
  Instagram,
  Sparkles,
  Send,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { ProspectSelector } from './prospect-selector'

export function QuickCompose() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prospectIdParam = searchParams.get('prospect')
  const channelParam = searchParams.get('channel')

  const [prospectId, setProspectId] = useState<string | null>(prospectIdParam)
  const [prospect, setProspect] = useState<any>(null)
  const [channel, setChannel] = useState(channelParam || 'email')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tone, setTone] = useState('friendly')
  const [purpose, setPurpose] = useState('cold_outreach')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [scheduleFor, setScheduleFor] = useState<string>('')
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  useEffect(() => {
    if (prospectId) {
      fetch(`/api/growth/prospects/${prospectId}`)
        .then(res => res.json())
        .then(data => {
          setProspect(data)
          if (data.contacts?.[0]?.email) {
            setTo(data.contacts[0].email)
          }
        })
        .catch(err => {
          console.error('Error fetching prospect:', err)
          toast.error('Failed to load prospect')
        })
    }
  }, [prospectId])

  useEffect(() => {
    // Load templates for current channel
    fetch(`/api/growth/outreach/templates?channel=${channel}`)
      .then(res => res.json())
      .then(data => setTemplates(data || []))
      .catch(() => setTemplates([]))
  }, [channel])

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplate)
      if (template) {
        if (template.subject) setSubject(template.subject)
        setBody(template.body)
      }
    }
  }, [selectedTemplate, templates])

  const handleGenerateContent = async () => {
    if (!prospectId) {
      toast.error('Please select a prospect first')
      return
    }

    setIsGeneratingAI(true)
    try {
      const response = await fetch('/api/growth/outreach/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId,
          channel,
          tone,
          purpose,
          templateId: selectedTemplate || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      const data = await response.json()
      
      if (data.message) {
        if (channel === 'email' && data.message.subject) {
          setSubject(data.message.subject)
        }
        if (data.message.body) {
          setBody(data.message.body)
        }
        
        // Auto-fill contact info if available
        if (prospect && prospect.contacts && prospect.contacts.length > 0) {
          const contact = prospect.contacts[0]
          if (channel === 'email' && contact.email) {
            setTo(contact.email)
          } else if (channel === 'sms' && contact.phone) {
            setTo(contact.phone)
          }
        }
      }

      toast.success('AI-generated content ready!')
    } catch (error: any) {
      console.error('Error generating content:', error)
      toast.error(error.message || 'Failed to generate content')
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const handleSend = async () => {
    if (!prospectId || !to || !body) {
      toast.error('Please fill in all required fields')
      return
    }

    if (channel === 'email' && !subject) {
      toast.error('Email subject is required')
      return
    }

    setIsSending(true)
    try {
      const sendData: any = {
        prospectId,
        to,
        body,
        channel,
      }

      if (channel === 'email') {
        sendData.subject = subject
      }

      if (scheduleFor) {
        sendData.scheduledAt = new Date(scheduleFor).toISOString()
      }

      const response = await fetch('/api/growth/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sendData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send')
      }

      if (scheduleFor) {
        toast.success('Message scheduled successfully')
      } else {
        toast.success('Message sent successfully')
      }
      
      // Reset form
      setSubject('')
      setBody('')
      setScheduleFor('')
      setSelectedTemplate('')
      
      router.push(`/growth/prospects/${prospectId}`)
    } catch (error: any) {
      console.error('Error sending:', error)
      toast.error(error.message || 'Failed to send')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Compose</CardTitle>
          <CardDescription>
            Send a message to a prospect or schedule it for later
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prospect Selector */}
          <div>
            <Label>Select Prospect</Label>
            <ProspectSelector
              value={prospectId || ''}
              onValueChange={(id) => {
                setProspectId(id)
                setProspect(null)
                setTo('')
                setSubject('')
                setBody('')
              }}
            />
          </div>

          {prospectId && (
            <>
              <Tabs value={channel} onValueChange={setChannel}>
                <TabsList>
                  <TabsTrigger value="email">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger value="sms">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </TabsTrigger>
                  <TabsTrigger value="linkedin">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn
                  </TabsTrigger>
                  <TabsTrigger value="instagram_dm">
                    <Instagram className="h-4 w-4 mr-2" />
                    Instagram DM
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-4">
                  <div>
                    <Label>To</Label>
                    <Input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={10}
                      placeholder="Email body..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="sms" className="space-y-4">
                  <div>
                    <Label>Phone Number</Label>
                    <Input
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label>Message (160 characters max)</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={4}
                      maxLength={160}
                      placeholder="SMS message..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {body.length}/160 characters
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="linkedin" className="space-y-4">
                  <div>
                    <Label>LinkedIn Message</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      placeholder="LinkedIn message..."
                    />
                  </div>
                </TabsContent>

                <TabsContent value="instagram_dm" className="space-y-4">
                  <div>
                    <Label>Instagram DM</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={8}
                      placeholder="Instagram DM message..."
                    />
                  </div>
                </TabsContent>
              </Tabs>

              {/* Template Selector */}
              {templates.length > 0 && (
                <div>
                  <Label>Use Template</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
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
                </div>
              )}

              {/* AI Content Generator */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Content Assistant
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Generate personalized outreach content
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateContent}
                    disabled={isGeneratingAI}
                    variant="outline"
                    size="sm"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate with AI
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Purpose</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="introduction">Introduction</SelectItem>
                        <SelectItem value="proposal">Proposal Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Schedule Option */}
              <div className="border-t pt-4">
                <Label>Schedule (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={scheduleFor}
                  onChange={(e) => setScheduleFor(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to send immediately
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <Button
                  onClick={handleSend}
                  disabled={isSending || !to || !body || (channel === 'email' && !subject)}
                >
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {scheduleFor ? 'Scheduling...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      {scheduleFor ? (
                        <>
                          <Calendar className="mr-2 h-4 w-4" />
                          Schedule
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Now
                        </>
                      )}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubject('')
                    setBody('')
                    setScheduleFor('')
                    setSelectedTemplate('')
                  }}
                >
                  Clear
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
