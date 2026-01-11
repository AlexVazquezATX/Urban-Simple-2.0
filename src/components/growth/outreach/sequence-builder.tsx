'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SequenceBuilderProps {
  sequenceId?: string
}

interface SequenceStep {
  id: string
  step: number
  delayDays: number
  channel: string
  subject: string
  body: string
}

export function SequenceBuilder({ sequenceId }: SequenceBuilderProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(!!sequenceId)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<SequenceStep[]>([
    {
      id: '1',
      step: 1,
      delayDays: 0,
      channel: 'email',
      subject: '',
      body: '',
    },
  ])

  useEffect(() => {
    if (sequenceId) {
      fetchSequence()
    }
  }, [sequenceId])

  const fetchSequence = async () => {
    try {
      const response = await fetch(`/api/growth/outreach/sequences/${sequenceId}`)
      if (response.ok) {
        const data = await response.json()
        setName(data.name || '')
        setDescription(data.description || '')
        if (data.messages && data.messages.length > 0) {
          setSteps(
            data.messages.map((msg: any) => ({
              id: msg.id,
              step: msg.step,
              delayDays: msg.delayDays,
              channel: msg.channel,
              subject: msg.subject || '',
              body: msg.body,
            }))
          )
        }
      }
    } catch (error) {
      toast.error('Failed to load sequence')
    } finally {
      setLoading(false)
    }
  }

  const addStep = () => {
    setSteps([
      ...steps,
      {
        id: Date.now().toString(),
        step: steps.length + 1,
        delayDays: 3,
        channel: 'email',
        subject: '',
        body: '',
      },
    ])
  }

  const removeStep = (id: string) => {
    if (steps.length === 1) {
      toast.error('Sequence must have at least one step')
      return
    }
    const newSteps = steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, step: i + 1 }))
    setSteps(newSteps)
  }

  const updateStep = (id: string, field: string, value: any) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const handleSave = async () => {
    if (!name || steps.length === 0) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const url = sequenceId
        ? `/api/growth/outreach/sequences/${sequenceId}`
        : '/api/growth/outreach/sequences'
      const method = sequenceId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          messages: steps.map((s) => ({
            delayDays: s.delayDays,
            channel: s.channel,
            subject: s.channel === 'email' ? s.subject : null,
            body: s.body,
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success(`Sequence ${sequenceId ? 'updated' : 'created'} successfully`)
      router.push('/growth/outreach?tab=sequences')
    } catch (error) {
      toast.error('Failed to save sequence')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {sequenceId ? 'Edit Sequence' : 'New Sequence'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a multi-step automated outreach sequence
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sequence Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sequence Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cold Outreach Sequence"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sequence Steps</CardTitle>
              <CardDescription>
                Messages will be sent automatically based on delays
              </CardDescription>
            </div>
            <Button onClick={addStep} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Step {step.step}</CardTitle>
                  {steps.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(step.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Delay (days after previous step)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={step.delayDays}
                      onChange={(e) =>
                        updateStep(step.id, 'delayDays', parseInt(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div>
                    <Label>Channel</Label>
                    <Select
                      value={step.channel}
                      onValueChange={(v) => updateStep(step.id, 'channel', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                        <SelectItem value="instagram_dm">Instagram DM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {step.channel === 'email' && (
                  <div>
                    <Label>Subject</Label>
                    <Input
                      value={step.subject}
                      onChange={(e) => updateStep(step.id, 'subject', e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>
                )}

                <div>
                  <Label>Message Body</Label>
                  <Textarea
                    value={step.body}
                    onChange={(e) => updateStep(step.id, 'body', e.target.value)}
                    rows={6}
                    placeholder="Message content"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Sequence
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
