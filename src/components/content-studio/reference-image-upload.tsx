'use client'

import { useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { REFERENCE_MODES, type ReferenceMode } from '@/lib/config/content-studio'

interface ReferenceImageUploadProps {
  images: string[] // base64 data URLs
  onChange: (images: string[]) => void
  referenceModes: ReferenceMode[]
  onReferenceModesChange: (modes: ReferenceMode[]) => void
  maxImages?: number
  disabled?: boolean
}

/**
 * Compress an image file to max dimensions and return as base64 data URL.
 */
async function compressImage(file: File, maxSize = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

export function ReferenceImageUpload({
  images,
  onChange,
  referenceModes,
  onReferenceModesChange,
  maxImages = 3,
  disabled,
}: ReferenceImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newImages: string[] = [...images]
    for (let i = 0; i < files.length && newImages.length < maxImages; i++) {
      try {
        const compressed = await compressImage(files[i])
        newImages.push(compressed)
      } catch (err) {
        console.error('Failed to compress reference image:', err)
      }
    }
    onChange(newImages)

    // Reset input so the same file can be selected again
    if (inputRef.current) inputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index)
    onChange(updated)
    // Clear modes if no images left
    if (updated.length === 0 && referenceModes.length > 0) {
      onReferenceModesChange([])
    }
  }

  const toggleMode = (modeId: ReferenceMode) => {
    if (referenceModes.includes(modeId)) {
      onReferenceModesChange(referenceModes.filter((m) => m !== modeId))
    } else {
      onReferenceModesChange([...referenceModes, modeId])
    }
  }

  return (
    <div className="bg-card rounded-[14px] border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="text-sm font-medium text-foreground">Reference Images</label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload images to guide the generation
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Optional</span>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        {images.map((img, index) => (
          <div
            key={index}
            className="relative w-20 h-20 rounded-[10px] overflow-hidden border border-border"
          >
            <img src={img} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(index)}
              disabled={disabled}
              className="absolute top-1 right-1 w-5 h-5 bg-ink-950/60 hover:bg-ink-950/80 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <label
            className={cn(
              'w-20 h-20 rounded-[10px] border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-gold-600/40 hover:bg-gold-600/5 dark:hover:border-gold-400/30 dark:hover:bg-gold-400/5 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={disabled}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Reference mode pills — only visible when images are uploaded */}
      {images.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">
            What should I extract from {images.length === 1 ? 'this image' : 'these images'}?
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {REFERENCE_MODES.map((mode) => {
              const isActive = referenceModes.includes(mode.id)
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => toggleMode(mode.id)}
                  disabled={disabled}
                  title={mode.description}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-semibold transition-all border',
                    isActive
                      ? 'bg-teal-600/10 text-teal-600 border-teal-600/30 dark:bg-teal-300/12 dark:text-teal-300 dark:border-teal-300/25'
                      : 'bg-secondary text-muted-foreground border-border hover:text-foreground',
                    disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {mode.label}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            {referenceModes.length === 0
              ? 'None selected — general inspiration will be used'
              : `${referenceModes.length} mode${referenceModes.length > 1 ? 's' : ''} active`}
          </p>
        </div>
      )}
    </div>
  )
}
