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
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateEditorProps {
  templateId?: string
}

export function TemplateEditor({ templateId }: TemplateEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(!!templateId)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: 'general',
    channel: 'email',
    subject: '',
    body: '',
    variables: [] as string[],
  })

  useEffect(() => {
    if (templateId) {
      fetchTemplate()
    }
  }, [templateId])

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/growth/outreach/templates/${templateId}`)
      if (response.ok) {
        const data = await response.json()
        setFormData({
          name: data.name || '',
          category: data.category || 'general',
          channel: data.channel || 'email',
          subject: data.subject || '',
          body: data.body || '',
          variables: data.variables || [],
        })
      }
    } catch (error) {
      toast.error('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name || !formData.body) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const url = templateId
        ? `/api/growth/outreach/templates/${templateId}`
        : '/api/growth/outreach/templates'
      const method = templateId ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success(`Template ${templateId ? 'updated' : 'created'} successfully`)
      router.push('/growth/outreach?tab=templates')
    } catch (error) {
      toast.error('Failed to save template')
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
    <div className="space-y-6">
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
            {templateId ? 'Edit Template' : 'New Template'}
          </span>
        }
        subtitle="Create a reusable message template"
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
                  Save Template
                </>
              )}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Use variables like {`{{company_name}}`}, {`{{contact_first_name}}`}, {`{{your_name}}`} for personalization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Cold Outreach Email"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Channel *</Label>
              <Select value={formData.channel} onValueChange={(v) => setFormData({ ...formData, channel: v })}>
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

          {formData.channel === 'email' && (
            <div>
              <Label>Subject</Label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Email subject (use {{company_name}} for personalization)"
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label>Message Body *</Label>
            <Textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={12}
              placeholder="Message body (use {{company_name}}, {{contact_first_name}}, {{your_name}} for personalization)"
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
