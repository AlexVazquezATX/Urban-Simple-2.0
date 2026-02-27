'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  ImageIcon,
  Package,
  Users,
  Shirt,
  Boxes,
  Layers,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { BRAND_ASSET_CATEGORIES } from '@/lib/config/content-studio'
import { toast } from 'sonner'

interface BrandAsset {
  id: string
  name: string
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

export default function BrandAssetsPage() {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadCategory, setUploadCategory] = useState('general')
  const [uploadTags, setUploadTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAssets()
  }, [filterCategory])

  async function loadAssets() {
    try {
      setLoading(true)
      const catParam = filterCategory !== 'all' ? `?category=${filterCategory}` : ''
      const res = await fetch(`/api/creative-hub/assets${catParam}`)
      const data = await res.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    setUploadName(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function resetUploadForm() {
    setUploadFile(null)
    setUploadPreview(null)
    setUploadName('')
    setUploadCategory('general')
    setUploadTags('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleUpload() {
    if (!uploadFile) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('name', uploadName || uploadFile.name)
      formData.append('category', uploadCategory)
      formData.append('tags', uploadTags)

      const res = await fetch('/api/creative-hub/assets', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const newAsset = await res.json()
      setAssets((prev) => [newAsset, ...prev])
      toast.success('Asset uploaded!')
      setUploadOpen(false)
      resetUploadForm()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this asset?')) return

    try {
      const res = await fetch(`/api/creative-hub/assets?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setAssets((prev) => prev.filter((a) => a.id !== id))
      toast.success('Asset deleted')
    } catch {
      toast.error('Failed to delete asset')
    }
  }

  const filteredAssets = filterCategory === 'all'
    ? assets
    : assets.filter((a) => a.category === filterCategory)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/creative-hub"
            className="text-warm-400 hover:text-warm-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-warm-900">Brand Assets</h1>
            <p className="text-xs text-warm-500">
              Upload logos, products, crew photos, and objects to use in image generation
            </p>
          </div>
        </div>
        <Button
          className="bg-gradient-to-r from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700 text-white rounded-sm"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Asset
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={cn(
            'px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
            filterCategory === 'all'
              ? 'bg-warm-900 text-white'
              : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
          )}
        >
          All ({assets.length})
        </button>
        {BRAND_ASSET_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || ImageIcon
          const count = assets.filter((a) => a.category === cat.id).length
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-medium transition-colors',
                filterCategory === cat.id
                  ? 'bg-warm-900 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              )}
            >
              <Icon className="w-3 h-3" />
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Asset grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
        </div>
      ) : filteredAssets.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="group relative rounded-sm border border-warm-200 overflow-hidden bg-white"
            >
              <div className="aspect-square bg-warm-100">
                <img
                  src={asset.imageUrl}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => handleDelete(asset.id)}
                  className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2">
                <p className="text-xs font-medium text-warm-800 truncate">{asset.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-warm-400 capitalize">{asset.category}</span>
                  {asset.usageCount > 0 && (
                    <span className="text-[10px] text-warm-400">
                      Used {asset.usageCount}x
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-warm-300 mx-auto mb-3" />
          <p className="text-sm text-warm-500 mb-2">
            {filterCategory !== 'all' ? 'No assets in this category' : 'No brand assets yet'}
          </p>
          <p className="text-xs text-warm-400 mb-4">
            Upload logos, products, and objects to use in your AI-generated images
          </p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-sm"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload Your First Asset
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!open) { setUploadOpen(false); resetUploadForm() } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Brand Asset</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* File drop zone */}
            {!uploadPreview ? (
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-warm-300 rounded-sm cursor-pointer hover:border-ocean-400 hover:bg-ocean-50/30 transition-colors">
                <Upload className="w-8 h-8 text-warm-400 mb-2" />
                <span className="text-sm text-warm-600">Click to select an image</span>
                <span className="text-xs text-warm-400 mt-1">PNG, JPG, WebP, SVG up to 10MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={uploadPreview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-sm border border-warm-200"
                />
                <button
                  onClick={resetUploadForm}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Asset name"
                className="rounded-sm mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Category</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger className="rounded-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRAND_ASSET_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder="e.g. logo, dark, square"
                className="rounded-sm mt-1"
              />
            </div>

            <Button
              className="w-full bg-gradient-to-r from-ocean-500 to-ocean-600 hover:from-ocean-600 hover:to-ocean-700 text-white rounded-sm"
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
