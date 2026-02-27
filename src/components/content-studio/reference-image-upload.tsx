'use client'

import { useRef } from 'react'
import { Plus, X, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReferenceImageUploadProps {
  images: string[] // base64 data URLs
  onChange: (images: string[]) => void
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
    onChange(images.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-white rounded-sm border border-warm-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="text-sm font-medium text-warm-900">Reference Images</label>
          <p className="text-xs text-warm-400 mt-0.5">
            Upload images for composition/mood inspiration
          </p>
        </div>
        <span className="text-xs text-warm-400">Optional</span>
      </div>

      <div className="flex gap-2.5 flex-wrap">
        {images.map((img, index) => (
          <div
            key={index}
            className="relative w-20 h-20 rounded-sm overflow-hidden border border-warm-200"
          >
            <img src={img} alt={`Reference ${index + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(index)}
              disabled={disabled}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <label
            className={cn(
              'w-20 h-20 rounded-sm border-2 border-dashed border-warm-300 flex flex-col items-center justify-center cursor-pointer hover:border-lime-400 hover:bg-lime-50/30 transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Plus className="w-5 h-5 text-warm-400" />
            <span className="text-[10px] text-warm-400 mt-0.5">Add</span>
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
    </div>
  )
}
