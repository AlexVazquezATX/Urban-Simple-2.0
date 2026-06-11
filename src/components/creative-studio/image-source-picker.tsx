'use client'

import { useState } from 'react'
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react'
import { DishPhotoUpload } from './dish-photo-upload'
import { GalleryPickerDialog } from './gallery-picker-dialog'
import { cn } from '@/lib/utils'

type SourceType = 'upload' | 'gallery' | 'none'

interface ImageSourcePickerProps {
  value: string | null
  onChange: (base64: string | null) => void
  sourceType: SourceType
  onSourceTypeChange: (type: SourceType) => void
  disabled?: boolean
}

const SOURCE_OPTIONS: { id: SourceType; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'gallery', label: 'From Gallery', icon: ImageIcon },
  { id: 'none', label: 'None', icon: Sparkles },
]

export function ImageSourcePicker({
  value,
  onChange,
  sourceType,
  onSourceTypeChange,
  disabled = false,
}: ImageSourcePickerProps) {
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)

  function handleSourceTypeChange(type: SourceType) {
    onSourceTypeChange(type)
    // Clear image when switching to none
    if (type === 'none') {
      onChange(null)
    }
  }

  function handleGallerySelect(imageDataUrl: string) {
    onChange(imageDataUrl)
  }

  return (
    <div className="space-y-3">
      {/* Segmented control */}
      <div className="flex overflow-hidden rounded-[12px] border border-border">
        {SOURCE_OPTIONS.map((option) => {
          const Icon = option.icon
          const isSelected = sourceType === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSourceTypeChange(option.id)}
              disabled={disabled}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400'
                  : 'bg-card text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                option.id !== 'upload' && 'border-l border-border',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <Icon className="size-3.5" />
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Conditional content */}
      {sourceType === 'upload' && (
        <DishPhotoUpload
          onImageSelect={(base64) => onChange(base64 || null)}
          value={value}
          disabled={disabled}
          className="aspect-video"
        />
      )}

      {sourceType === 'gallery' && (
        <>
          {value ? (
            <div className="relative aspect-video overflow-hidden rounded-[12px] bg-secondary">
              <img
                src={value}
                alt="Selected from gallery"
                className="h-full w-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => setShowGalleryPicker(true)}
                  className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:bg-white"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowGalleryPicker(true)}
              disabled={disabled}
              className={cn(
                'w-full cursor-pointer rounded-[12px] border-2 border-dashed border-border bg-secondary/40 transition-colors hover:border-gold-600/40 dark:hover:border-gold-400/40',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 grid size-12 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
                  <ImageIcon className="size-5 text-gold-600 dark:text-gold-400" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Choose from Gallery
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a previously generated image
                </p>
              </div>
            </button>
          )}
          <GalleryPickerDialog
            open={showGalleryPicker}
            onOpenChange={setShowGalleryPicker}
            onSelect={handleGallerySelect}
          />
        </>
      )}

      {sourceType === 'none' && (
        <div className="rounded-[12px] border border-border bg-secondary/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            The AI will generate a fully original graphic from your headline and brand kit.
          </p>
        </div>
      )}
    </div>
  )
}
