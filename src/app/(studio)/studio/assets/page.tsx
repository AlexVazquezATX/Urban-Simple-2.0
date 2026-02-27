'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  ImageIcon,
  X,
  Filter,
  Package,
  Users,
  Shirt,
  Boxes,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { BRAND_ASSET_CATEGORIES } from '@/lib/config/content-studio'

interface BrandAsset {
  id: string
  name: string
  description?: string | null
  imageUrl: string
  category: string
  tags: string[]
  usageCount: number
  createdAt: string
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  logo: Layers,
  product: Package,
  crew: Users,
  apparel: Shirt,
  object: Boxes,
  general: ImageIcon,
}

export default function StudioAssetsPage() {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('general')
  const [uploadTags, setUploadTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAssets()
  }, [filterCategory])

  async function loadAssets() {
    try {
      setLoading(true)
      const catParam = filterCategory !== 'all' ? `?category=${filterCategory}` : ''
      const res = await fetch(`/api/creative-studio/assets${catParam}`)
      const data = await res.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to load assets:', error)
      toast.error('Failed to load assets')
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB')
      return
    }

    setUploadFile(file)
    setUploadPreview(URL.createObjectURL(file))
    if (!uploadName) {
      setUploadName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    }
  }

  async function handleUpload() {
    if (!uploadFile || !uploadName.trim()) {
      toast.error('Please select a file and enter a name')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('name', uploadName.trim())
      formData.append('category', uploadCategory)
      if (uploadTags.trim()) {
        formData.append('tags', uploadTags.trim())
      }

      const res = await fetch('/api/creative-studio/assets', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }

      toast.success('Asset uploaded!')
      resetUploadForm()
      setUploadOpen(false)
      loadAssets()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset? This cannot be undone.')) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/creative-studio/assets?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setAssets((prev) => prev.filter((a) => a.id !== id))
      toast.success('Asset deleted')
    } catch {
      toast.error('Failed to delete asset')
    } finally {
      setDeleting(null)
    }
  }

  function resetUploadForm() {
    setUploadFile(null)
    setUploadPreview(null)
    setUploadName('')
    setUploadCategory('general')
    setUploadTags('')
    if (fileInputRef.current) fileInputRef.current.value = ''
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
                  Brand Assets
                </h1>
                <p className="text-sm text-warm-500">
                  Upload logos, products, crew photos, and objects to use in your creatives
                </p>
              </div>
            </div>

            <Button
              variant="lime"
              size="sm"
              className="rounded-sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Category Filters */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-warm-500" />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={cn(
                'px-3 py-1.5 rounded-sm text-sm font-medium transition-colors',
                filterCategory === 'all'
                  ? 'bg-warm-900 text-white'
                  : 'bg-white border border-warm-200 text-warm-700 hover:border-warm-300'
              )}
            >
              All
            </button>
            {BRAND_ASSET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-sm text-sm font-medium transition-colors',
                  filterCategory === cat.id
                    ? 'bg-warm-900 text-white'
                    : 'bg-white border border-warm-200 text-warm-700 hover:border-warm-300'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
          </div>
        ) : assets.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {assets.map((asset) => {
              const CategoryIcon = CATEGORY_ICONS[asset.category] || ImageIcon
              return (
                <div key={asset.id} className="group">
                  <div className="rounded-sm border border-warm-200 overflow-hidden bg-white hover:border-lime-400 hover:shadow-md transition-all">
                    <div className="aspect-square bg-warm-100 relative">
                      <img
                        src={asset.imageUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleDelete(asset.id)}
                          disabled={deleting === asset.id}
                          className="p-2 bg-red-500 hover:bg-red-600 rounded-sm text-white transition-colors"
                        >
                          {deleting === asset.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center gap-1.5">
                        <CategoryIcon className="w-3.5 h-3.5 text-warm-400" />
                        <p className="text-sm text-warm-900 font-medium truncate">
                          {asset.name}
                        </p>
                      </div>
                      <p className="text-xs text-warm-500 mt-0.5">
                        Used {asset.usageCount} {asset.usageCount === 1 ? 'time' : 'times'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-7 h-7 text-warm-400" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">
              {filterCategory !== 'all' ? 'No assets in this category' : 'No brand assets yet'}
            </h3>
            <p className="text-sm text-warm-500 mb-4">
              Upload your logos, products, crew photos, and merch to use in your creatives.
            </p>
            <Button
              variant="lime"
              size="sm"
              className="rounded-sm"
              onClick={() => setUploadOpen(true)}
            >
              Upload Your First Asset
            </Button>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open)
          if (!open) resetUploadForm()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Brand Asset</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Drop Zone */}
            {uploadPreview ? (
              <div className="relative aspect-square rounded-sm overflow-hidden border border-warm-200">
                <img
                  src={uploadPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    setUploadFile(null)
                    setUploadPreview(null)
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-sm text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block aspect-video rounded-sm border-2 border-dashed border-warm-300 hover:border-lime-400 cursor-pointer transition-colors">
                <div className="h-full flex flex-col items-center justify-center">
                  <Upload className="w-8 h-8 text-warm-400 mb-2" />
                  <p className="text-sm text-warm-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-warm-400 mt-1">PNG, JPG, WebP up to 10MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">Name</label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g., BackHaus Logo Black"
                className="rounded-sm"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-sm border border-warm-200 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/30"
              >
                {BRAND_ASSET_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} — {cat.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-warm-700 mb-1">
                Tags <span className="text-warm-400 font-normal">(optional, comma-separated)</span>
              </label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g., logo, black, icon"
                className="rounded-sm"
              />
            </div>

            {/* Upload Button */}
            <Button
              variant="lime"
              className="w-full rounded-sm"
              onClick={handleUpload}
              disabled={!uploadFile || !uploadName.trim() || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Asset
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
