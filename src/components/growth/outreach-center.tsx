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
import { Mail, Phone, MessageSquare, Sparkles, Send, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface Prospect {
  id: string
  companyName: string
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    title?: string | null
  }>
}

export function OutreachCenter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prospectId = searchParams.get('prospect')
  const channelParam = searchParams.get('channel')

  const [prospect, setProspect] = useState<Prospect | null>(null)
  const [channel, setChannel] = useState(channelParam || 'email')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [tone, setTone] = useState('friendly')
  const [purpose, setPurpose] = useState('cold_outreach')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSending, setIsSending] = useState(false)

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

  const handleGenerateContent = async () => {
    if (!prospect) {
      toast.error('Please select a prospect first')
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/growth/ai/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectData: prospect,
          channel,
          tone,
          purpose,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      const data = await response.json()
      
      if (channel === 'email') {
        setSubject(data.content.subject || '')
        setBody(data.content.body || '')
      } else {
        setBody(data.content.message || '')
      }

      toast.success('Content generated successfully')
    } catch (error: any) {
      console.error('Error generating content:', error)
      toast.error(error.message || 'Failed to generate content')
    } finally {
      setIsGenerating(false)
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
      if (channel === 'email') {
        const response = await fetch('/api/growth/outreach/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prospectId,
            to,
            subject,
            body,
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to send email')
        }

        toast.success('Email sent successfully')
        router.push(`/growth/prospects/${prospectId}`)
      } else {
        // For other channels, create activity log
        const response = await fetch(`/api/growth/prospects/${prospectId}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: channel === 'phone' ? 'call' : channel,
            channel,
            title: `${channel === 'phone' ? 'Call' : channel === 'sms' ? 'SMS' : 'Message'} to ${prospect?.companyName}`,
            description: body,
            completedAt: new Date(),
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to log activity')
        }

        toast.success('Activity logged successfully')
        router.push(`/growth/prospects/${prospectId}`)
      }
    } catch (error: any) {
      console.error('Error sending:', error)
      toast.error(error.message || 'Failed to send')
    } finally {
      setIsSending(false)
    }
  }

  if (!prospectId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Please select a prospect to start outreach</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Outreach Center</h1>
        <p className="text-muted-foreground mt-1">
          {prospect ? `Contacting ${prospect.companyName}` : 'Select a prospect to get started'}
        </p>
      </div>

      {prospect && (
        <Card>
          <CardHeader>
            <CardTitle>New {channel === 'email' ? 'Email' : channel === 'phone' ? 'Call' : 'Message'}</CardTitle>
            <CardDescription>
              {prospect.companyName} • {prospect.contacts[0]?.firstName} {prospect.contacts[0]?.lastName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={channel} onValueChange={setChannel}>
              <TabsList>
                <TabsTrigger value="email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </TabsTrigger>
                <TabsTrigger value="sms">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="linkedin">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  LinkedIn
                </TabsTrigger>
                <TabsTrigger value="instagram_dm">
                  <MessageSquare className="h-4 w-4 mr-2" />
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

              <TabsContent value="phone" className="space-y-4">
                <div>
                  <Label>Phone Number</Label>
                  <Input
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label>Call Notes</Label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    placeholder="Call notes and talking points..."
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
                  disabled={isGenerating}
                  variant="outline"
                  size="sm"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Content
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

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4 border-t">
              <Button
                onClick={handleSend}
                disabled={isSending || !to || !body || (channel === 'email' && !subject)}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {channel === 'email' ? 'Send Email' : channel === 'phone' ? 'Log Call' : 'Send'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/growth/prospects/${prospectId}`)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

