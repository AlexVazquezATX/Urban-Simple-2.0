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
import { REQUEST_KINDS } from '@/lib/ops/constants'
import { PhotoPicker } from '@/components/portal/photo-picker'

const TITLE_HINTS: Record<string, string> = {
  extra_cleaning: 'Deep clean the hood vents',
  supplies: 'Restock paper towels in the restrooms',
  schedule_change: 'Skip cleaning on Thursday night',
  special_event: 'Private event Saturday, need a reset after',
  other: 'Tell us what you need',
}

export function RequestForm({
  locations,
  minDate,
}: {
  locations: Array<{ id: string; name: string }>
  /** yyyy-MM-dd, today in the company timezone */
  minDate: string
}) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [kind, setKind] = useState<string>('extra_cleaning')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !locationId) {
      toast.error('Pick a location and add a short summary.')
      return
    }
    if (uploading) {
      toast.message('Hang on, your photos are still uploading.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationId, kind, title, details, preferredDate, photos }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to send')
      toast.success('Request sent. Your account manager has it.')
      router.push(`/portal/issues/${payload.id}`)
      router.refresh()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to send')
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
        <Label htmlFor="kind">What do you need?</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger id="kind" className="rounded-xl bg-cream-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REQUEST_KINDS.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Short summary</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={TITLE_HINTS[kind] ?? TITLE_HINTS.other}
          maxLength={200}
          required
          className="rounded-xl bg-cream-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Details (optional)</Label>
        <Textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Anything that helps us plan: which areas, access, timing."
          rows={4}
          maxLength={4000}
          className="resize-none rounded-[13px] bg-cream-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preferredDate">Preferred date (optional)</Label>
        <Input
          id="preferredDate"
          type="date"
          min={minDate}
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          className="rounded-xl bg-cream-50 sm:max-w-[220px]"
        />
        <p className="text-xs text-muted-foreground">
          This is a preference. Your account manager will follow up on timing.
        </p>
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
            'Send request'
          )}
        </Button>
      </div>
    </form>
  )
}
