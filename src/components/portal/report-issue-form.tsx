'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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

const CATEGORIES = [
  { value: 'quality', label: 'Quality issue' },
  { value: 'equipment', label: 'Equipment / supplies' },
  { value: 'communication', label: 'Communication' },
  { value: 'safety', label: 'Safety / health' },
  { value: 'other', label: 'Other' },
]

const SEVERITIES = [
  { value: 'low', label: 'Low — heads up' },
  { value: 'medium', label: 'Medium — please address' },
  { value: 'high', label: 'High — needs attention soon' },
  { value: 'critical', label: 'Critical — urgent' },
]

export function ReportIssueForm({ locations }: { locations: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [category, setCategory] = useState('quality')
  const [severity, setSeverity] = useState('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !locationId) {
      toast.error('Pick a location and add a short title.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, category, severity, title, description }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to submit')
      toast.success('Issue reported. Your team has been notified.')
      router.push(`/portal/issues/${payload.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-sm border border-warm-200 bg-white p-4">
      <div className="space-y-1.5">
        <Label htmlFor="location">Location</Label>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger id="location">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locations.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">What&apos;s going on?</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Stained carpet in dining room corner"
          maxLength={120}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="severity">Severity</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger id="severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">More detail (optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Where exactly, how big, when you noticed it, etc."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting} className="rounded-sm">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit issue'
          )}
        </Button>
      </div>
    </form>
  )
}
