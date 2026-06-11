'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  Plus,
  Send,
  ThumbsUp,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { LivePageHead } from '@/components/portal/live-shell'

// LiveWalkthrough capture (spec: usp-live-pages.jsx) — zone list left with
// sage check circles + gold-lined active card + NOW tag; capture panel right
// with display zone title, photo slots, dashed gold "More photos" tile, note
// textarea, gold pill "Mark zone complete" + outline "Skip for now".
// Upload + submit flows are unchanged from the original capture component.

interface ZoneState {
  zone: string
  photos: string[]
  notes: string
  rating: 'ok' | 'issue' | null
  uploading?: boolean
  // Client-side flag set by "Mark zone complete" — drives the sage circles
  // and the progress bar; stripped from the submit payload.
  done?: boolean
}

interface Props {
  kicker: string
  locations: Array<{ id: string; name: string }>
  defaultZones: string[]
}

export function WalkthroughCapture({ kicker, locations, defaultZones }: Props) {
  const router = useRouter()
  const [locationId, setLocationId] = useState(locations[0]?.id ?? '')
  const [zones, setZones] = useState<ZoneState[]>(
    defaultZones.map(z => ({ zone: z, photos: [], notes: '', rating: null }))
  )
  const [activeIdx, setActiveIdx] = useState(0)
  const [overallNotes, setOverallNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const active = zones[activeIdx] ?? zones[0]
  const doneCount = zones.filter(z => z.done).length
  const pct = zones.length > 0 ? Math.round((doneCount / zones.length) * 100) : 0

  const addZone = () => {
    setZones(prev => [...prev, { zone: 'New Zone', photos: [], notes: '', rating: null }])
    setActiveIdx(zones.length)
  }

  const removeZone = (idx: number) => {
    setZones(prev => prev.filter((_, i) => i !== idx))
    setActiveIdx(prev => Math.max(0, prev >= idx ? prev - 1 : prev))
  }

  const updateZone = (idx: number, patch: Partial<ZoneState>) => {
    setZones(prev => prev.map((z, i) => (i === idx ? { ...z, ...patch } : z)))
  }

  // Advance to the next zone that isn't marked complete (wrapping).
  const advance = (fromIdx: number, doneList: ZoneState[]) => {
    const n = doneList.length
    for (let step = 1; step <= n; step++) {
      const i = (fromIdx + step) % n
      if (!doneList[i].done) {
        setActiveIdx(i)
        return
      }
    }
  }

  const markComplete = () => {
    const next = zones.map((z, i) =>
      i === activeIdx ? { ...z, done: true, rating: z.rating ?? ('ok' as const) } : z
    )
    setZones(next)
    advance(activeIdx, next)
  }

  const skipZone = () => {
    advance(activeIdx, zones)
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
    <div>
      <LivePageHead
        kicker={kicker}
        title="Walkthrough"
        sub="Move through the kitchen zone by zone — photos and notes land straight in your log."
        right={
          <div className="text-right">
            <div className="mb-2 font-mono text-[11.5px] tabular-nums text-cream-700">
              {doneCount} of {zones.length} zones
            </div>
            <div className="h-1.5 w-40 rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gold-600 transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        }
      />

      {/* Location picker (kept from the original flow) */}
      {locations.length > 1 && (
        <div className="mb-5 max-w-xs space-y-2">
          <Label htmlFor="loc">Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger id="loc" className="rounded-xl bg-card">
              <SelectValue placeholder="Pick a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid items-start gap-5 md:grid-cols-[300px_1fr]">
        {/* Zone list */}
        <div className="flex flex-col gap-2">
          {zones.map((z, idx) => {
            const isDone = !!z.done
            const isActive = idx === activeIdx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={cn(
                  'flex items-center gap-3 rounded-[13px] border px-4 py-3 text-left transition-colors',
                  isActive
                    ? 'border-gold-600/30 bg-card shadow-soft'
                    : 'border-border bg-transparent hover:bg-card/60'
                )}
              >
                <span
                  className={cn(
                    'grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-[1.5px]',
                    isDone
                      ? 'border-sage-line bg-sage-bg'
                      : isActive
                        ? 'border-gold-600'
                        : 'border-border'
                  )}
                >
                  {isDone && (
                    <Check className="h-[11px] w-[11px] text-sage-deep" strokeWidth={2.4} />
                  )}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    isActive ? 'font-semibold' : 'font-medium',
                    isDone ? 'text-muted-foreground' : 'text-foreground'
                  )}
                >
                  {z.zone}
                </span>
                {isActive && (
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[1.4px] text-gold-600">
                    Now
                  </span>
                )}
              </button>
            )
          })}

          <button
            type="button"
            onClick={addZone}
            className="flex items-center justify-center gap-1.5 rounded-[13px] border border-dashed border-border py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-gold-600/30 hover:text-gold-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Add custom zone
          </button>
        </div>

        {/* Capture panel */}
        {active && (
          <div className="rounded-[18px] border border-border bg-card p-6 shadow-soft sm:p-7">
            <div className="flex items-center gap-3">
              <input
                value={active.zone}
                onChange={(e) => updateZone(activeIdx, { zone: e.target.value })}
                placeholder="Zone name"
                className="min-w-0 flex-1 border-none bg-transparent font-display text-[23px] font-bold tracking-[-0.5px] text-foreground outline-none placeholder:text-muted-foreground"
              />
              {active.done && (
                <span className="shrink-0 rounded-full border border-sage-line bg-sage-bg px-2.5 py-0.5 text-[11.5px] font-semibold text-sage-deep">
                  Complete
                </span>
              )}
              <button
                type="button"
                onClick={() => removeZone(activeIdx)}
                title="Remove zone"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-5 mt-1 text-[13.5px] text-cream-700">
              Snap a photo or two, add a note if something needs attention.
            </p>

            {/* Photo slots + dashed gold "More photos" tile */}
            <div className="mb-4.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {active.photos.map((url, p) => (
                <div key={p} className="relative h-[150px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full rounded-[14px] border border-border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(activeIdx, p)}
                    className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink-950/60 text-cream-50"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="grid h-[150px] cursor-pointer place-items-center rounded-[14px] border-[1.5px] border-dashed border-gold-600/30 bg-gold-600/10 text-gold-600 transition-colors hover:border-gold-600/50">
                <div className="text-center">
                  {active.uploading ? (
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  ) : (
                    <Camera className="mx-auto h-5 w-5" />
                  )}
                  <div className="mt-1.5 text-xs font-semibold">
                    {active.photos.length > 0 ? 'More photos' : 'Tap to add photo'}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handlePhotoCapture(activeIdx, f)
                    e.target.value = ''
                  }}
                  disabled={active.uploading}
                />
              </label>
            </div>

            {/* Condition toggle (kept from the original flow) */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateZone(activeIdx, { rating: active.rating === 'ok' ? null : 'ok' })
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  active.rating === 'ok'
                    ? 'border-sage-line bg-sage-bg text-sage-deep'
                    : 'border-border text-cream-700 hover:border-sage-line'
                )}
              >
                <ThumbsUp className="h-3 w-3" />
                Looks good
              </button>
              <button
                type="button"
                onClick={() =>
                  updateZone(activeIdx, { rating: active.rating === 'issue' ? null : 'issue' })
                }
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  active.rating === 'issue'
                    ? 'border-peach-line bg-peach-bg text-peach-deep'
                    : 'border-border text-cream-700 hover:border-peach-line'
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                Issue
              </button>
            </div>

            <Textarea
              value={active.notes}
              onChange={(e) => updateZone(activeIdx, { notes: e.target.value })}
              placeholder={`A note about the ${active.zone.toLowerCase()}… (optional)`}
              rows={3}
              className="min-h-[84px] resize-y rounded-[13px] bg-cream-50 px-4 py-3.5 text-sm"
            />

            <div className="mt-4.5 flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="gold"
                onClick={markComplete}
                className="rounded-full px-5"
              >
                <Check className="h-3.5 w-3.5" />
                Mark zone complete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={skipZone}
                className="rounded-full px-5"
              >
                Skip for now
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">
                Photos save as you go
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Wrap-up: overall notes + submit */}
      <div className="mt-5 rounded-[18px] border border-border bg-card p-6 shadow-soft">
        <div className="space-y-2">
          <Label htmlFor="overall-notes">Overall notes (optional)</Label>
          <Textarea
            id="overall-notes"
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            placeholder="Anything else to flag from your walkthrough"
            rows={3}
            className="resize-none rounded-[13px] bg-cream-50"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Captured zones submit together — most walkthroughs take about 60 seconds.
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-foreground bg-foreground px-6 py-2.5 text-sm font-semibold text-cream-50 transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit walkthrough
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
