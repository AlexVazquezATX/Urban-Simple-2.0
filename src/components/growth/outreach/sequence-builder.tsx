'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Save, Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
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
  const [generatingStepId, setGeneratingStepId] = useState<string | null>(null)
  const [tone, setTone] = useState<'professional' | 'friendly' | 'casual' | 'warm'>('friendly')
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

  const handleGenerateStepContent = async (stepId: string) => {
    const step = steps.find((s) => s.id === stepId)
    if (!step) return

    if (!name) {
      toast.error('Please enter a sequence name first')
      return
    }

    setGeneratingStepId(stepId)
    try {
      // Get previous steps' content for context
      const previousStepsContext = steps
        .filter((s) => s.step < step.step)
        .map((s) => s.body)
        .filter((b) => b.length > 0)

      const response = await fetch('/api/growth/outreach/sequences/generate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: step.channel,
          stepNumber: step.step,
          totalSteps: steps.length,
          sequenceName: name,
          sequenceDescription: description,
          tone,
          previousStepsContext,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      const data = await response.json()

      if (data.content) {
        setSteps((prev) =>
          prev.map((s) =>
            s.id === stepId
              ? {
                  ...s,
                  subject: data.content.subject || s.subject,
                  body: data.content.body || s.body,
                }
              : s
          )
        )
        toast.success(`Step ${step.step} content generated!`)
      }
    } catch (error: any) {
      console.error('Error generating step content:', error)
      toast.error(error.message || 'Failed to generate content')
    } finally {
      setGeneratingStepId(null)
    }
  }

  const handleGenerateAllSteps = async () => {
    if (!name) {
      toast.error('Please enter a sequence name first')
      return
    }

    for (const step of steps) {
      await handleGenerateStepContent(step.id)
    }
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
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <PageHeader
        kicker="GROWTH · OUTREACH"
        title={
          <span className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Back"
              className="grid size-8 shrink-0 place-items-center rounded-[9px] border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            {sequenceId ? 'Edit Sequence' : 'New Sequence'}
          </span>
        }
        subtitle="Create a multi-step automated outreach sequence"
        actions={
          <>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button variant="gold" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Sequence
                </>
              )}
            </Button>
          </>
        }
      />

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
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional description"
              className="mt-1"
            />
          </div>
          <div>
            <Label>AI Tone</Label>
            <Select value={tone} onValueChange={(v: any) => setTone(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Sets the tone for AI-generated content
            </p>
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
            <div className="flex items-center gap-2">
              <Button
                onClick={handleGenerateAllSteps}
                variant="outline"
                size="sm"
                disabled={!!generatingStepId || !name}
              >
                <Sparkles className="size-4" />
                Generate All with AI
              </Button>
              <Button onClick={addStep} variant="outline" size="sm">
                <Plus className="size-4" />
                Add Step
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Step {step.step}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateStepContent(step.id)}
                      disabled={generatingStepId === step.id || !name}
                    >
                      {generatingStepId === step.id ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" />
                          Generate with AI
                        </>
                      )}
                    </Button>
                    {steps.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeStep(step.id)}
                        aria-label={`Remove step ${step.step}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
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
                      className="mt-1 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <Label>Channel</Label>
                    <Select
                      value={step.channel}
                      onValueChange={(v) => updateStep(step.id, 'channel', v)}
                    >
                      <SelectTrigger className="mt-1">
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
                      className="mt-1"
                    />
                  </div>
                )}

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Message Body</Label>
                    <p className="text-xs text-muted-foreground">
                      Use {'{{company_name}}'}, {'{{contact_name}}'}, {'{{location}}'} for personalization
                    </p>
                  </div>
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
    </div>
  )
}
