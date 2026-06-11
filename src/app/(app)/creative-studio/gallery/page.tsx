'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Download,
  Trash2,
  Loader2,
  ImageIcon,
  Camera,
  Sparkles,
  Wand2,
  X,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface ContentItem {
  id: string
  mode: string
  outputFormat?: string | null
  hasImage?: boolean
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

function imageUrl(id: string) {
  return `/api/creative-studio/content/image?id=${id}`
}

type FilterMode = 'all' | 'food_photo' | 'branded_post'

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  )
}

function GalleryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Check for view parameter
  const viewId = searchParams.get('view')

  useEffect(() => {
    loadContent()
  }, [filterMode])

  // Open detail modal if viewId is present
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
    if (!item.hasImage) return

    const link = document.createElement('a')
    link.href = imageUrl(item.id)
    link.download = `studio-${item.mode}-${item.id.slice(0, 8)}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <PageHeader
        backHref="/creative-studio"
        kicker="STUDIO · BACKHAUS"
        title="Gallery"
        subtitle={
          <>
            <span className="font-mono tabular-nums">{content.length}</span>{' '}
            {content.length === 1 ? 'image' : 'images'} saved
          </>
        }
        actions={
          <Link href="/creative-studio/generate">
            <Button variant="gold" size="sm">
              <Sparkles className="size-3.5" />
              Create New
            </Button>
          </Link>
        }
      />

      {/* Filters - underline count tabs */}
      <Tabs
        value={filterMode}
        onValueChange={(value) => setFilterMode(value as FilterMode)}
        className="mb-5"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="food_photo">Food Photos</TabsTrigger>
          <TabsTrigger value="branded_post">Branded Posts</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : content.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {content.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group cursor-pointer"
            >
              <div className="overflow-hidden rounded-[14px] border border-border bg-card transition-all hover:border-gold-600/30 hover:shadow-soft dark:hover:border-gold-400/25">
                {/* Image */}
                <div className="relative aspect-square bg-secondary">
                  {item.hasImage ? (
                    <img
                      src={imageUrl(item.id)}
                      alt={item.headline || 'Generated image'}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="size-10 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Mode chip - neutral; the photography provides the color */}
                  <Badge variant="neutral" className="absolute left-2 top-2">
                    {item.mode === 'food_photo' ? (
                      <Camera className="size-3" />
                    ) : (
                      <Sparkles className="size-3" />
                    )}
                    {item.mode === 'food_photo' ? 'Food' : 'Branded'}
                  </Badge>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 opacity-0 transition-colors group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="text-sm font-medium text-white">View</span>
                    {item.hasImage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/creative-studio/generate?mode=branded_post&sourceImageId=${item.id}`)
                        }}
                        className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-900 transition-colors hover:bg-white"
                      >
                        <Wand2 className="size-3" />
                        Use in Branded Post
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.headline || item.outputFormat || 'Untitled'}
                  </p>
                  <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
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
        <div className="rounded-[14px] border border-border bg-card">
          <EmptyState
            icon={ImageIcon}
            title="Your gallery is waiting for its first image"
            description={
              filterMode !== 'all'
                ? `No ${filterMode === 'food_photo' ? 'food photos' : 'branded posts'} saved yet.`
                : 'Start creating to build your gallery.'
            }
            action={
              <Link href="/creative-studio/generate">
                <Button variant="outline" size="sm">
                  Create Your First Image
                </Button>
              </Link>
            }
          />
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => { setSelectedItem(null); setLightboxOpen(false) }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedItem?.mode === 'food_photo' ? (
                <Camera className="size-4 text-gold-600 dark:text-gold-400" />
              ) : (
                <Sparkles className="size-4 text-gold-600 dark:text-gold-400" />
              )}
              {selectedItem?.headline || selectedItem?.outputFormat || 'Generated Image'}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Image */}
              <div className="group relative overflow-hidden rounded-[12px] bg-secondary">
                {selectedItem.hasImage ? (
                  <>
                    <img
                      src={imageUrl(selectedItem.id)}
                      alt={selectedItem.headline || 'Generated image'}
                      className="h-auto max-h-[60vh] w-full cursor-pointer object-contain"
                      onClick={() => setLightboxOpen(true)}
                    />
                    <button
                      onClick={() => setLightboxOpen(true)}
                      className="absolute right-2 top-2 rounded-full bg-ink-950/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-ink-950/80 group-hover:opacity-100"
                      title="View full size"
                    >
                      <Maximize2 className="size-4" />
                    </button>
                  </>
                ) : (
                  <div className="flex aspect-square items-center justify-center">
                    <ImageIcon className="size-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium text-foreground">
                    {selectedItem.mode === 'food_photo' ? 'Food Photography' : 'Branded Post'}
                  </p>
                </div>
                {selectedItem.outputFormat && (
                  <div>
                    <p className="text-muted-foreground">Format</p>
                    <p className="font-medium text-foreground">{selectedItem.outputFormat}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-mono text-[13px] font-medium tabular-nums text-foreground">
                    {new Date(selectedItem.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                {selectedItem.aiModel && (
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-mono text-[13px] font-medium text-foreground">{selectedItem.aiModel}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleDownload(selectedItem)}
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={deleting === selectedItem.id}
                        aria-label="Delete image"
                      >
                        {deleting === selectedItem.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this image?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes it from your gallery permanently. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-white hover:bg-destructive/90"
                          onClick={() => handleDelete(selectedItem.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {selectedItem.hasImage && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedItem(null)
                      router.push(`/creative-studio/generate?mode=branded_post&sourceImageId=${selectedItem.id}`)
                    }}
                  >
                    <Wand2 className="size-4" />
                    Use in Branded Post
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-screen Lightbox */}
      {lightboxOpen && selectedItem?.hasImage && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <img
            src={imageUrl(selectedItem.id)}
            alt={selectedItem.headline || 'Generated image'}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
