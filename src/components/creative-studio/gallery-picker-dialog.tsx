'use client'

import { useState, useEffect } from 'react'
import { Loader2, ImageIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface GalleryItem {
  id: string
  mode: string
  generatedImageUrl?: string | null
  headline?: string | null
  createdAt: string
}

interface GalleryPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (imageDataUrl: string, contentId: string) => void
}

export function GalleryPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: GalleryPickerDialogProps) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadGallery()
    }
  }, [open])

  async function loadGallery() {
    try {
      setLoading(true)
      const response = await fetch('/api/creative-studio/content?limit=30')
      if (response.ok) {
        const data = await response.json()
        // Only show items that have a generated image
        setItems(
          (data.content || []).filter(
            (item: GalleryItem) => item.generatedImageUrl
          )
        )
      }
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSelect(item: GalleryItem) {
    if (item.generatedImageUrl) {
      onSelect(item.generatedImageUrl, item.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Choose from Gallery</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto py-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={cn(
                  'relative aspect-square rounded-sm overflow-hidden border-2 border-transparent',
                  'hover:border-lime-500 hover:shadow-md transition-all cursor-pointer group'
                )}
              >
                <img
                  src={item.generatedImageUrl!}
                  alt={item.headline || 'Generated content'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                {item.headline && (
                  <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-xs text-white truncate">{item.headline}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ImageIcon className="w-10 h-10 text-warm-300 mb-3" />
            <p className="text-sm text-warm-600">No saved content yet</p>
            <p className="text-xs text-warm-500 mt-1">
              Generate and save some content first
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
