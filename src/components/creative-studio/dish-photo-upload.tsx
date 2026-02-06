'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X, Camera, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DishPhotoUploadProps {
  onImageSelect: (base64: string) => void
  value?: string | null
  disabled?: boolean
  className?: string
}

/**
 * Dish Photo Upload Component
 *
 * Handles image upload with client-side compression to avoid 413 errors.
 * Resizes images to max 1024px dimension and converts to JPEG at 80% quality.
 */
export function DishPhotoUpload({
  onImageSelect,
  value,
  disabled = false,
  className,
}: DishPhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      setError(null)

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file')
        return
      }

      // Validate file size (max 20MB before compression)
      if (file.size > 20 * 1024 * 1024) {
        setError('Image must be under 20MB')
        return
      }

      try {
        setIsProcessing(true)
        const base64 = await compressAndConvertToBase64(file)
        onImageSelect(base64)
      } catch (err) {
        console.error('Image processing error:', err)
        setError('Failed to process image. Please try another.')
      } finally {
        setIsProcessing(false)
      }
    },
    [onImageSelect]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleClear = () => {
    onImageSelect('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled && !isProcessing) {
      fileInputRef.current?.click()
    }
  }

  // Show preview if we have an image
  if (value) {
    return (
      <div className={cn('relative rounded-sm overflow-hidden', className)}>
        <img
          src={value}
          alt="Uploaded dish"
          className="w-full h-full object-cover"
        />
        {!disabled && (
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 bg-warm-900/80 hover:bg-warm-900 rounded-sm text-white transition-colors"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {!disabled && (
          <button
            onClick={handleClick}
            className="absolute bottom-2 right-2 p-2 bg-white/90 hover:bg-white rounded-sm text-warm-700 transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Camera className="w-3.5 h-3.5" />
            Change
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'relative rounded-sm border-2 border-dashed transition-colors cursor-pointer',
        isDragging
          ? 'border-lime-500 bg-lime-50'
          : 'border-warm-300 hover:border-lime-400 bg-warm-50',
        disabled && 'opacity-50 cursor-not-allowed',
        isProcessing && 'pointer-events-none',
        className
      )}
    >
      <div className="flex flex-col items-center justify-center p-8 text-center">
        {isProcessing ? (
          <>
            <Loader2 className="w-10 h-10 text-lime-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-warm-700">Processing image...</p>
            <p className="text-xs text-warm-500 mt-1">Compressing for upload</p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
            <p className="text-sm font-medium text-red-600">{error}</p>
            <p className="text-xs text-warm-500 mt-1">Click to try again</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-sm bg-lime-100 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-lime-600" />
            </div>
            <p className="text-sm font-medium text-warm-900">
              Drop your dish photo here
            </p>
            <p className="text-xs text-warm-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-warm-400 mt-3">
              JPG, PNG up to 20MB
            </p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        disabled={disabled || isProcessing}
        className="hidden"
      />
    </div>
  )
}

/**
 * Compress and convert an image file to base64.
 * Resizes large images to reduce payload size and avoid Vercel 413 errors.
 *
 * @param file - The image file to process
 * @param maxSize - Maximum dimension in pixels (default 1024)
 * @returns Promise<string> - Base64 data URL
 */
async function compressAndConvertToBase64(
  file: File,
  maxSize = 1024
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
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

      // Draw to canvas and compress
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // Convert to JPEG for better compression (quality 0.8)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // Clean up object URL
      URL.revokeObjectURL(img.src)

      resolve(dataUrl)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

export default DishPhotoUpload
