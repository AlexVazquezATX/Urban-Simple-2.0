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
import { ISSUE_CATEGORIES } from '@/lib/ops/constants'
import { PhotoPicker } from '@/components/portal/photo-picker'

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low: just a heads up' },
  { value: 'medium', label: 'Medium: please address' },
  { value: 'high', label: 'High: needs attention soon' },
  { value: 'critical', label: 'Critical: urgent' },
]

export function ReportIssueForm({ locations }: { locations: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [category, setCategory] = useState('quality')
  const [severity, setSeverity] = useState('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !locationId) {
      toast.error('Pick a location and add a short title.')
      return
    }
    if (uploading) {
      toast.message('Hang on, your photos are still uploading.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, category, severity, title, description, photos }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to submit')
      toast.success('Thanks. Your account manager has been notified.')
      router.push(`/portal/issues/${payload.id}`)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[18px] border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      {locations.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger id="location" className="rounded-xl bg-cream-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">What&apos;s going on?</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Stained carpet in dining room corner"
          maxLength={200}
          required
          className="rounded-xl bg-cream-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category" className="rounded-xl bg-cream-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="severity">How urgent?</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger id="severity" className="rounded-xl bg-cream-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">More detail (optional)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Where exactly, how big, when you noticed it, etc."
          rows={4}
          maxLength={4000}
          className="resize-none rounded-[13px] bg-cream-50"
        />
      </div>

      <div className="space-y-2">
        <Label>Photos (optional, up to 4)</Label>
        <PhotoPicker value={photos} onChange={setPhotos} onUploadingChange={setUploading} max={4} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          variant="gold"
          disabled={submitting || uploading}
          className="w-full rounded-full px-6 sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send report'
          )}
        </Button>
      </div>
    </form>
  )
}
