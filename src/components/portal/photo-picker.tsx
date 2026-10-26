'use client'

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { Camera, Loader2, X } from 'lucide-react'
import { ensureWebCompatible } from '@/lib/image-utils'

// Up-to-N photo attachments for issue reports and service requests. Each
// photo uploads as soon as it's picked (iPhone HEIC is converted to JPEG
// first) so the form only submits URLs.

export function PhotoPicker({
  value,
  onChange,
  onUploadingChange,
  max = 4,
}: {
  value: string[]
  onChange: Dispatch<SetStateAction<string[]>>
  onUploadingChange?: (uploading: boolean) => void
  max?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(0)

  useEffect(() => {
    onUploadingChange?.(uploading > 0)
  }, [uploading, onUploadingChange])

  const setBusy = (delta: number) => setUploading(prev => Math.max(0, prev + delta))

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const room = max - value.length - uploading
    const picked = Array.from(files).slice(0, Math.max(0, room))
    if (files.length > picked.length) toast.message(`You can add up to ${max} photos.`)

    await Promise.all(
      picked.map(async raw => {
        setBusy(1)
        try {
          const file = await ensureWebCompatible(raw)
          const fd = new FormData()
          fd.append('file', file)
          const res = await fetch('/api/portal/issue-photo', { method: 'POST', body: fd })
          const payload = await res.json().catch(() => ({}))
          if (!res.ok) throw new Error(payload.error || 'Upload failed')
          onChange(prev => [...prev, payload.url as string].slice(0, max))
        } catch (error: unknown) {
          toast.error(error instanceof Error ? error.message : 'Upload failed')
        } finally {
          setBusy(-1)
        }
      })
    )
    if (inputRef.current) inputRef.current.value = ''
  }

  const canAdd = value.length + uploading < max

  return (
    <div className="flex flex-wrap gap-2">
      {value.map((url, idx) => (
        <div key={url} className="relative h-[76px] w-[96px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Photo ${idx + 1}`}
            className="h-full w-full rounded-[10px] border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(prev => prev.filter(u => u !== url))}
            className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft hover:text-foreground"
            aria-label="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {Array.from({ length: uploading }).map((_, i) => (
        <div
          key={`up-${i}`}
          className="grid h-[76px] w-[96px] place-items-center rounded-[10px] border border-border bg-secondary"
        >
          <Loader2 className="h-4 w-4 animate-spin text-gold-600" />
        </div>
      ))}
      {canAdd && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-[76px] w-[96px] flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-gold-600/40 bg-gold-600/5 text-[11.5px] font-semibold text-gold-600 hover:bg-gold-600/10"
        >
          <Camera className="h-4 w-4" />
          Add photo
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
