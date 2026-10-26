'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PhotoCapture } from '@/components/field/photo-capture'
import { FIELD_STRINGS, PROBLEM_TYPES, type FieldLang } from '@/lib/ops/field-i18n'
import { cn } from '@/lib/utils'

export function ReportProblemButton({
  shiftId,
  locationId,
  locationName,
  lang,
  className,
}: {
  shiftId: string
  locationId: string
  locationName: string
  lang: FieldLang
  className?: string
}) {
  const t = FIELD_STRINGS[lang]
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<string>('equipment')
  const [description, setDescription] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  async function send() {
    if (!description.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/field/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId,
          locationId,
          category,
          severity: urgent ? 'high' : 'medium',
          description,
          photos,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || t.error)
      toast.success(t.problemSent)
      setOpen(false)
      setDescription('')
      setPhotos([])
      setUrgent(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.error)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className={cn('gap-1.5', className)} onClick={() => setOpen(true)}>
        <AlertTriangle className="size-3.5" />
        {t.reportProblem}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.problemTitle}</DialogTitle>
            <DialogDescription>
              {locationName}. {t.problemHint}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t.problemType}</p>
              <div className="grid gap-2">
                {PROBLEM_TYPES.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setCategory(p.id)}
                    className={cn(
                      'min-h-11 rounded-[9px] border px-3 text-left text-sm transition-colors',
                      category === p.id
                        ? 'border-primary bg-primary/10 font-medium text-foreground'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    )}
                  >
                    {p[lang]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">{t.problemDescription}</p>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
            </div>
            <PhotoCapture photos={photos} onChange={setPhotos} label={t.addPhoto} uploadingLabel={t.uploading} />
            <label className="flex min-h-11 items-center gap-3 text-sm text-foreground">
              <Checkbox checked={urgent} onCheckedChange={v => setUrgent(v === true)} className="size-5" />
              {t.urgent}
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button variant="gold" onClick={send} disabled={sending || !description.trim()}>
              {sending && <Loader2 className="size-4 animate-spin" />}
              {t.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
