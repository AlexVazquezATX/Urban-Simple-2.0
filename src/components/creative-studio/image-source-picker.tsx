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
      <div className="flex rounded-sm border border-warm-200 overflow-hidden">
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
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                isSelected
                  ? 'bg-plum-50 text-plum-700 border-plum-500'
                  : 'bg-white text-warm-600 hover:bg-warm-50',
                option.id !== 'upload' && 'border-l border-warm-200',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
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
            <div className="relative rounded-sm overflow-hidden aspect-video bg-warm-100">
              <img
                src={value}
                alt="Selected from gallery"
                className="w-full h-full object-cover"
              />
              {!disabled && (
                <button
                  onClick={() => setShowGalleryPicker(true)}
                  className="absolute bottom-2 right-2 px-3 py-1.5 bg-white/90 hover:bg-white rounded-sm text-xs font-medium text-warm-700 transition-colors"
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
                'w-full rounded-sm border-2 border-dashed border-warm-300 hover:border-plum-400 bg-warm-50 transition-colors cursor-pointer',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 rounded-sm bg-plum-100 flex items-center justify-center mb-2">
                  <ImageIcon className="w-5 h-5 text-plum-600" />
                </div>
                <p className="text-sm font-medium text-warm-900">
                  Choose from Gallery
                </p>
                <p className="text-xs text-warm-500 mt-1">
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
        <div className="rounded-sm bg-warm-50 border border-warm-200 px-4 py-3">
          <p className="text-xs text-warm-600">
            The AI will generate a fully original graphic from your headline and brand kit.
          </p>
        </div>
      )}
    </div>
  )
}
