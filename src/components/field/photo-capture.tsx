'use client'

// Phone-friendly photo capture: opens the camera, converts HEIC, downsizes to
// keep uploads fast on cellular, uploads via /api/upload, and returns URLs.

import { useRef, useState } from 'react'
import { Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ensureWebCompatible } from '@/lib/image-utils'

async function downscale(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality))
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file
  } catch {
    return file
  }
}

export function PhotoCapture({
  photos,
  onChange,
  max = 4,
  folder = 'field',
  label = 'Add photo',
  uploadingLabel = 'Uploading...',
  disabled,
}: {
  photos: string[]
  onChange: (photos: string[]) => void
  max?: number
  folder?: 'field' | 'issues' | 'reviews'
  label?: string
  uploadingLabel?: string
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    const added: string[] = []
    try {
      for (const original of Array.from(files).slice(0, max - photos.length)) {
        const file = await downscale(await ensureWebCompatible(original))
        const fd = new FormData()
        fd.append('file', file)
        fd.append('folder', folder)
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')
        added.push(data.url)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      if (added.length) onChange([...photos, ...added])
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {photos.map(url => (
        <div key={url} className="relative size-16 overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="" className="size-full object-cover" />
          {!disabled && (
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(photos.filter(p => p !== url))}
              className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/60 text-white"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {!disabled && photos.length < max && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-16 gap-1.5"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            {uploading ? uploadingLabel : label}
          </Button>
        </>
      )}
    </div>
  )
}
