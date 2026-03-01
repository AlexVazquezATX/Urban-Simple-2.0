'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  Download,
  Trash2,
  Filter,
  Grid,
  List,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageLightbox } from '@/components/content-studio'
import type { LightboxImage } from '@/components/content-studio/image-lightbox'

interface CreativeImage {
  id: string
  name: string
  imageUrl?: string
  imageType: string
  aspectRatio: string
  isAiGenerated: boolean
  aiModel?: string
  tags: string[]
  category?: string
  photoCredit?: string
  createdAt: string
}

const IMAGE_TYPES = [
  { value: 'before_after', label: 'Before/After' },
  { value: 'branded_graphic', label: 'Branded Graphic' },
  { value: 'team_photo', label: 'Team Photo' },
  { value: 'promotional', label: 'Promotional' },
  { value: 'service_showcase', label: 'Service Showcase' },
  { value: 'quote_card', label: 'Quote Card' },
  { value: 'stat_graphic', label: 'Stat Graphic' },
]


export default function ImageLibraryPage() {
  const router = useRouter()
  const [images, setImages] = useState<CreativeImage[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState({ imageType: '', category: '' })

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const lightboxImages: LightboxImage[] = images.map((img) => ({
    id: img.id,
    src: getImageSrc(img),
    name: img.name,
  }))

  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadPhotoCredit, setUploadPhotoCredit] = useState('')

  useEffect(() => {
    loadImages()
  }, [filter])

  async function loadImages() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter.imageType) params.set('imageType', filter.imageType)
      if (filter.category) params.set('category', filter.category)

      const response = await fetch(`/api/creative-hub/images?${params}`)
      const data = await response.json()
      setImages(data.images || [])
    } catch (error) {
      console.error('Failed to load images:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setPendingFile(file)
    setUploadPhotoCredit('')
    setShowUploadDialog(true)

    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleUploadConfirm() {
    if (!pendingFile) return

    setUploading(true)
    setShowUploadDialog(false)

    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('folder', 'creative')

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error('Upload failed')

      const uploadData = await uploadResponse.json()

      // Save to library with photo credit
      const saveResponse = await fetch('/api/creative-hub/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingFile.name,
          imageUrl: uploadData.url,
          imageType: 'promotional',
          aspectRatio: '1:1',
          isAiGenerated: false,
          photoCredit: uploadPhotoCredit || undefined,
        }),
      })

      const savedImage = await saveResponse.json()
      setImages([savedImage, ...images])
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      setPendingFile(null)
      setUploadPhotoCredit('')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      await fetch(`/api/creative-hub/images/${id}`, {
        method: 'DELETE',
      })
      setImages(images.filter((img) => img.id !== id))
    } catch (error) {
      console.error('Failed to delete image:', error)
    }
  }

  function getImageSrc(image: CreativeImage): string {
    if (image.imageUrl) return image.imageUrl
    return `/api/creative-hub/images/${image.id}/image`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/creative-hub">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-charcoal-900">Image Library</h1>
            <p className="text-charcoal-600">Generate and manage marketing images</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload
          </Button>

          {/* Generate */}
          <Link href="/creative-hub/generate">
            <Button className="bg-gradient-to-br from-ocean-500 to-ocean-600">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate with AI
            </Button>
          </Link>

          {/* Upload Dialog with Photo Credit */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {pendingFile && (
                  <div className="text-sm text-charcoal-600">
                    <span className="font-medium">File:</span> {pendingFile.name}
                  </div>
                )}
                <div>
                  <Label>Photo Credit (Optional)</Label>
                  <Input
                    value={uploadPhotoCredit}
                    onChange={(e) => setUploadPhotoCredit(e.target.value)}
                    placeholder="e.g., Photo: Austin Monthly, Credit: @photographer"
                    className="mt-2"
                  />
                  <p className="text-xs text-charcoal-500 mt-1">
                    Add attribution for sourced images
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowUploadDialog(false)
                      setPendingFile(null)
                      setUploadPhotoCredit('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUploadConfirm}
                    disabled={uploading}
                    className="flex-1 bg-gradient-to-br from-ocean-500 to-ocean-600"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-charcoal-400" />
            <Select
              value={filter.imageType}
              onValueChange={(value) =>
                setFilter({ ...filter, imageType: value === 'all' ? '' : value })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {IMAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Image Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-ocean-600" />
        </div>
      ) : images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto text-charcoal-300 mb-4" />
            <h3 className="text-lg font-semibold text-charcoal-900 mb-2">
              No images yet
            </h3>
            <p className="text-charcoal-600 mb-4">
              Generate AI images or upload your own
            </p>
            <Link href="/creative-hub/generate">
              <Button>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Your First Image
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group overflow-hidden cursor-pointer rounded-lg border bg-white shadow-sm hover:shadow-md transition-shadow"
              onClick={() => openLightbox(index)}
            >
              <div className="aspect-square relative">
                <img
                  src={getImageSrc(image)}
                  alt={image.name}
                  className="w-full h-full object-cover"
                />
                {image.isAiGenerated && (
                  <Badge className="absolute top-2 right-2 bg-ocean-500">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      const link = document.createElement('a')
                      link.href = getImageSrc(image)
                      link.download = image.name
                      link.click()
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(image.id)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-warm-900 truncate">{image.name}</p>
                <p className="text-xs text-warm-500 capitalize">
                  {image.imageType.replace('_', ' ')} • {image.aspectRatio}
                </p>
                {image.photoCredit && (
                  <p className="text-xs text-warm-400 italic mt-1 truncate">
                    {image.photoCredit}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {images.map((image) => (
            <Card key={image.id} className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={getImageSrc(image)}
                    alt={image.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{image.name}</h4>
                  <p className="text-sm text-charcoal-500 capitalize">
                    {image.imageType.replace('_', ' ')} • {image.aspectRatio}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {image.isAiGenerated && (
                      <Badge variant="outline" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                    {image.photoCredit && (
                      <span className="text-xs text-charcoal-400 italic">
                        {image.photoCredit}
                      </span>
                    )}
                    <span className="text-xs text-charcoal-400">
                      {new Date(image.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a')
                      link.href = getImageSrc(image)
                      link.download = image.name
                      link.click()
                    }}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(image.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
        onViewDetails={(id) => {
          setLightboxOpen(false)
          router.push(`/creative-hub/images/${id}`)
        }}
      />
    </div>
  )
}
