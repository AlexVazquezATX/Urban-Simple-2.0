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
  hasImage?: boolean
  headline?: string | null
  createdAt: string
}

interface GalleryPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (imageDataUrl: string, contentId: string) => void
}

function imageUrl(id: string) {
  return `/api/creative-studio/content/image?id=${id}`
}

export function GalleryPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: GalleryPickerDialogProps) {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)

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
        setItems(
          (data.content || []).filter(
            (item: GalleryItem) => item.hasImage
          )
        )
      }
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelect(item: GalleryItem) {
    setSelecting(item.id)
    try {
      // Fetch the full content item to get the base64 image data
      const res = await fetch(`/api/creative-studio/content?id=${item.id}`)
      if (!res.ok) throw new Error('Failed to fetch image')
      const data = await res.json()
      const fullItem = data.content?.[0]
      if (fullItem?.generatedImageUrl) {
        onSelect(fullItem.generatedImageUrl, item.id)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to select image:', error)
    } finally {
      setSelecting(null)
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
          <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto scrollbar-elegant py-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                disabled={!!selecting}
                className={cn(
                  'relative aspect-square rounded-sm overflow-hidden border-2 border-transparent',
                  'hover:border-lime-500 hover:shadow-md transition-all cursor-pointer group',
                  selecting === item.id && 'ring-2 ring-lime-500',
                  selecting && selecting !== item.id && 'opacity-50'
                )}
              >
                <img
                  src={imageUrl(item.id)}
                  alt={item.headline || 'Generated content'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {selecting === item.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
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
