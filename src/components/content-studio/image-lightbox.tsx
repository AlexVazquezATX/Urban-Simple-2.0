'use client'

import { useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LightboxImage {
  id: string
  src: string
  name: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  currentIndex: number
  open: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  onViewDetails?: (id: string) => void
}

export function ImageLightbox({
  images,
  currentIndex,
  open,
  onClose,
  onNavigate,
  onViewDetails,
}: ImageLightboxProps) {
  const current = images[currentIndex]
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1)
  }, [hasNext, currentIndex, onNavigate])

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1)
  }, [hasPrev, currentIndex, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }

    window.addEventListener('keydown', handleKeyDown)
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, goNext, goPrev])

  if (!open || !current) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90"
        onClick={onClose}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      {/* Image counter */}
      <div className="absolute top-4 left-4 z-10 text-white/70 text-sm font-medium">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Previous button */}
      {hasPrev && (
        <button
          onClick={goPrev}
          className="absolute left-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Next button */}
      {hasNext && (
        <button
          onClick={goNext}
          className="absolute right-4 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Image */}
      <img
        src={current.src}
        alt={current.name}
        className="relative z-[5] max-w-[90vw] max-h-[85vh] object-contain select-none"
        draggable={false}
      />

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <p className="text-white/80 text-sm truncate max-w-[60%]">
          {current.name}
        </p>
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(current.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-white/15 hover:bg-white/25 text-white text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Details
          </button>
        )}
      </div>
    </div>
  )
}
