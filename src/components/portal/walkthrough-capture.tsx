'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, X, ThumbsUp, AlertTriangle, Loader2, Plus, Send } from 'lucide-react'
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

interface ZoneState {
  zone: string
  photos: string[]
  notes: string
  rating: 'ok' | 'issue' | null
  uploading?: boolean
}

interface Props {
  locations: Array<{ id: string; name: string }>
  defaultZones: string[]
}

export function WalkthroughCapture({ locations, defaultZones }: Props) {
  const router = useRouter()
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [zones, setZones] = useState<ZoneState[]>(
    defaultZones.map(z => ({ zone: z, photos: [], notes: '', rating: null }))
  )
  const [overallNotes, setOverallNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const addZone = () => {
    setZones(prev => [...prev, { zone: 'New Zone', photos: [], notes: '', rating: null }])
  }

  const removeZone = (idx: number) => {
    setZones(prev => prev.filter((_, i) => i !== idx))
  }

  const updateZone = (idx: number, patch: Partial<ZoneState>) => {
    setZones(prev => prev.map((z, i) => (i === idx ? { ...z, ...patch } : z)))
  }

  const handlePhotoCapture = async (idx: number, file: File) => {
    updateZone(idx, { uploading: true })
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/portal/walkthrough-photo', { method: 'POST', body: fd })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Upload failed')
      setZones(prev =>
        prev.map((z, i) =>
          i === idx ? { ...z, photos: [...z.photos, payload.url as string], uploading: false } : z
        )
      )
    } catch (error: any) {
      toast.error(error.message || 'Upload failed')
      updateZone(idx, { uploading: false })
    }
  }

  const removePhoto = (zoneIdx: number, photoIdx: number) => {
    setZones(prev =>
      prev.map((z, i) =>
        i === zoneIdx ? { ...z, photos: z.photos.filter((_, p) => p !== photoIdx) } : z
      )
    )
  }

  const handleSubmit = async () => {
    if (!locationId) {
      toast.error('Pick a location')
      return
    }
    // Filter out empty zones (no photos AND no notes).
    const populated = zones.filter(z => z.photos.length > 0 || z.notes.trim() || z.rating)
    if (populated.length === 0) {
      toast.error('Capture at least one zone first')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/walkthroughs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          zones: populated.map(z => ({
            zone: z.zone,
            photos: z.photos,
            notes: z.notes,
            rating: z.rating,
          })),
          notes: overallNotes,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || 'Failed to save')
      toast.success('Walkthrough recorded')
      router.push(`/portal/walkthroughs/${payload.id}`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="loc">Location</Label>
        <Select value={locationId} onValueChange={setLocationId}>
          <SelectTrigger id="loc">
            <SelectValue placeholder="Pick a location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {zones.map((zone, idx) => (
          <ZoneCard
            key={idx}
            zone={zone}
            onChange={(patch) => updateZone(idx, patch)}
            onRemove={() => removeZone(idx)}
            onPhotoFile={(file) => handlePhotoCapture(idx, file)}
            onPhotoRemove={(p) => removePhoto(idx, p)}
          />
        ))}
        <button
          type="button"
          onClick={addZone}
          className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-warm-300 bg-white py-3 text-sm text-warm-600 hover:border-ocean-400 hover:text-ocean-600"
        >
          <Plus className="h-4 w-4" />
          Add custom zone
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="overall-notes">Overall notes (optional)</Label>
        <Textarea
          id="overall-notes"
          value={overallNotes}
          onChange={(e) => setOverallNotes(e.target.value)}
          placeholder="Anything else to flag from your walkthrough"
          rows={3}
          className="resize-none"
        />
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-sm"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Recording...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Walkthrough
          </>
        )}
      </Button>
    </div>
  )
}

function ZoneCard({
  zone,
  onChange,
  onRemove,
  onPhotoFile,
  onPhotoRemove,
}: {
  zone: ZoneState
  onChange: (patch: Partial<ZoneState>) => void
  onRemove: () => void
  onPhotoFile: (file: File) => void
  onPhotoRemove: (idx: number) => void
}) {
  return (
    <div className={`rounded-sm border-2 bg-white p-3 ${
      zone.rating === 'issue' ? 'border-amber-300' :
      zone.rating === 'ok' ? 'border-lime-300' :
      'border-warm-200'
    }`}>
      <div className="flex items-center gap-2">
        <Input
          value={zone.zone}
          onChange={(e) => onChange({ zone: e.target.value })}
          className="flex-1 font-medium"
          placeholder="Zone name"
        />
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-sm text-warm-400 hover:bg-warm-100 hover:text-red-600"
          title="Remove zone"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Photo grid */}
      {zone.photos.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {zone.photos.map((url, p) => (
            <div key={p} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-20 w-full rounded-sm object-cover" />
              <button
                type="button"
                onClick={() => onPhotoRemove(p)}
                className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-sm bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action row: photo capture + rating */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-warm-700 hover:border-ocean-400 hover:text-ocean-600">
          {zone.uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onPhotoFile(f)
              e.target.value = ''
            }}
            disabled={zone.uploading}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ rating: zone.rating === 'ok' ? null : 'ok' })}
          className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs ${
            zone.rating === 'ok'
              ? 'border-lime-400 bg-lime-50 text-lime-700'
              : 'border-warm-300 text-warm-700 hover:border-lime-400'
          }`}
        >
          <ThumbsUp className="h-3 w-3" />
          Looks good
        </button>
        <button
          type="button"
          onClick={() => onChange({ rating: zone.rating === 'issue' ? null : 'issue' })}
          className={`flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs ${
            zone.rating === 'issue'
              ? 'border-amber-400 bg-amber-50 text-amber-700'
              : 'border-warm-300 text-warm-700 hover:border-amber-400'
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          Issue
        </button>
      </div>

      {/* Notes — only show when there's something to say */}
      <Textarea
        value={zone.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        placeholder="Quick note (optional)"
        rows={1}
        className="mt-2 resize-none text-xs"
      />
    </div>
  )
}
