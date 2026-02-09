'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Download,
  Trash2,
  Loader2,
  ImageIcon,
  Camera,
  Sparkles,
  Wand2,
  Filter,
  Maximize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ContentItem {
  id: string
  mode: string
  outputFormat?: string | null
  generatedImageUrl?: string | null
  headline?: string | null
  bodyText?: string | null
  status: string
  aiModel?: string | null
  createdAt: string
  brandKit?: {
    id: string
    restaurantName: string
    primaryColor: string
  } | null
}

type FilterMode = 'all' | 'food_photo' | 'branded_post'

export default function StudioGalleryPage() {
  return (
    <Suspense>
      <StudioGalleryContent />
    </Suspense>
  )
}

function StudioGalleryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const viewId = searchParams.get('view')

  useEffect(() => {
    loadContent()
  }, [filterMode])

  useEffect(() => {
    if (viewId && content.length > 0) {
      const item = content.find((c) => c.id === viewId)
      if (item) {
        setSelectedItem(item)
      }
    }
  }, [viewId, content])

  async function loadContent() {
    try {
      setLoading(true)
      const modeParam = filterMode !== 'all' ? `&mode=${filterMode}` : ''
      const response = await fetch(
        `/api/creative-studio/content?limit=50${modeParam}`
      )
      const data = await response.json()
      setContent(data.content || [])
    } catch (error) {
      console.error('Failed to load content:', error)
      toast.error('Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this image? This cannot be undone.')) return

    setDeleting(id)
    try {
      const response = await fetch(`/api/creative-studio/content?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete')
      }

      setContent((prev) => prev.filter((c) => c.id !== id))
      setSelectedItem(null)
      toast.success('Image deleted')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete image')
    } finally {
      setDeleting(null)
    }
  }

  function handleDownload(item: ContentItem) {
    if (!item.generatedImageUrl) return

    const link = document.createElement('a')
    link.href = item.generatedImageUrl
    link.download = `studio-${item.mode}-${item.id.slice(0, 8)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/studio"
                className="p-2 hover:bg-warm-100 rounded-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-warm-600" />
              </Link>
              <div>
                <h1 className="text-lg font-display font-medium text-warm-900">
                  Gallery
                </h1>
                <p className="text-sm text-warm-500">
                  {content.length} {content.length === 1 ? 'image' : 'images'} saved
                </p>
              </div>
            </div>

            <Link href="/studio/generate">
              <Button variant="lime" size="sm" className="rounded-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Create New
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-warm-500" />
          <div className="flex gap-2">
            {(['all', 'food_photo', 'branded_post'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-sm text-sm font-medium transition-colors',
                  filterMode === mode
                    ? 'bg-warm-900 text-white'
                    : 'bg-white border border-warm-200 text-warm-700 hover:border-warm-300'
                )}
              >
                {mode === 'all' ? 'All' : mode === 'food_photo' ? 'Food Photos' : 'Branded Posts'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
          </div>
        ) : content.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {content.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="group cursor-pointer"
              >
                <div className="rounded-sm border border-warm-200 overflow-hidden bg-white hover:border-lime-400 hover:shadow-md transition-all">
                  <div className="aspect-square bg-warm-100 relative">
                    {item.generatedImageUrl ? (
                      <img
                        src={item.generatedImageUrl}
                        alt={item.headline || 'Generated image'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-warm-300" />
                      </div>
                    )}

                    <Badge
                      className={`absolute top-2 left-2 text-[10px] px-1.5 py-0 rounded-sm ${
                        item.mode === 'food_photo'
                          ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      {item.mode === 'food_photo' ? (
                        <Camera className="w-3 h-3 mr-1" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      {item.mode === 'food_photo' ? 'Food' : 'Branded'}
                    </Badge>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <span className="text-white text-sm font-medium">View</span>
                      {item.generatedImageUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/studio/generate?mode=branded_post&sourceImageId=${item.id}`)
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white/90 hover:bg-white rounded-sm text-xs font-medium text-plum-700 transition-colors"
                        >
                          <Wand2 className="w-3 h-3" />
                          Use in Branded Post
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-sm text-warm-900 font-medium truncate">
                      {item.headline || item.outputFormat || 'Untitled'}
                    </p>
                    <p className="text-xs text-warm-500 mt-0.5">
                      {new Date(item.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-7 h-7 text-warm-400" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">
              No images yet
            </h3>
            <p className="text-sm text-warm-500 mb-4">
              {filterMode !== 'all'
                ? `No ${filterMode === 'food_photo' ? 'food photos' : 'branded posts'} saved yet.`
                : 'Start creating to build your gallery.'}
            </p>
            <Link href="/studio/generate">
              <Button variant="lime" size="sm" className="rounded-sm">
                Create Your First Image
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setLightboxOpen(false) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.mode === 'food_photo' ? (
                <Camera className="w-4 h-4 text-amber-600" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-600" />
              )}
              {selectedItem?.headline || selectedItem?.outputFormat || 'Generated Image'}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="rounded-sm overflow-hidden bg-warm-100 relative group">
                {selectedItem.generatedImageUrl ? (
                  <>
                    <img
                      src={selectedItem.generatedImageUrl}
                      alt={selectedItem.headline || 'Generated image'}
                      className="w-full h-auto max-h-[60vh] object-contain cursor-pointer"
                      onClick={() => setLightboxOpen(true)}
                    />
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="View full size"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <div className="aspect-square flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-warm-300" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-warm-500">Type</p>
                  <p className="font-medium text-warm-900">
                    {selectedItem.mode === 'food_photo' ? 'Food Photography' : 'Branded Post'}
                  </p>
                </div>
                {selectedItem.outputFormat && (
                  <div>
                    <p className="text-warm-500">Format</p>
                    <p className="font-medium text-warm-900">{selectedItem.outputFormat}</p>
                  </div>
                )}
                <div>
                  <p className="text-warm-500">Created</p>
                  <p className="font-medium text-warm-900">
                    {new Date(selectedItem.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {selectedItem.aiModel && (
                  <div>
                    <p className="text-warm-500">Model</p>
                    <p className="font-medium text-warm-900">{selectedItem.aiModel}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-sm"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(selectedItem.id)}
                    disabled={deleting === selectedItem.id}
                  >
                    {deleting === selectedItem.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {selectedItem.generatedImageUrl && (
                  <Button
                    variant="outline"
                    className="w-full rounded-sm border-plum-200 text-plum-700 hover:bg-plum-50 hover:border-plum-300"
                    onClick={() => {
                      setSelectedItem(null)
                      router.push(`/studio/generate?mode=branded_post&sourceImageId=${selectedItem.id}`)
                    }}
                  >
                    <Wand2 className="w-4 h-4 mr-1.5" />
                    Use in Branded Post
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen Lightbox */}
      {lightboxOpen && selectedItem?.generatedImageUrl && (
        <div
          className="fixed inset-0 z-100 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-sm text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={selectedItem.generatedImageUrl}
            alt={selectedItem.headline || 'Generated image'}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
