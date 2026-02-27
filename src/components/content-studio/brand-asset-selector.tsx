'use client'

import { useState, useEffect } from 'react'
import { ImageIcon, Check, X, Package, Users, Shirt, Boxes, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { BRAND_ASSET_CATEGORIES } from '@/lib/config/content-studio'

interface BrandAsset {
  id: string
  name: string
  imageUrl: string
  category: string
  usageCount: number
}

interface BrandAssetSelectorProps {
  isOpen: boolean
  onClose: () => void
  selectedAssetIds: string[]
  onSelect: (ids: string[]) => void
  maxSelection?: number
}

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  logo: Layers,
  product: Package,
  crew: Users,
  apparel: Shirt,
  object: Boxes,
  general: ImageIcon,
}

export function BrandAssetSelector({
  isOpen,
  onClose,
  selectedAssetIds,
  onSelect,
  maxSelection = 3,
}: BrandAssetSelectorProps) {
  const [assets, setAssets] = useState<BrandAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('all')
  const [localSelected, setLocalSelected] = useState<string[]>(selectedAssetIds)

  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedAssetIds)
      loadAssets()
    }
  }, [isOpen, selectedAssetIds])

  async function loadAssets() {
    try {
      setLoading(true)
      const catParam = filterCategory !== 'all' ? `?category=${filterCategory}` : ''
      const res = await fetch(`/api/creative-studio/assets${catParam}`)
      const data = await res.json()
      setAssets(data.assets || [])
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) loadAssets()
  }, [filterCategory])

  function toggleAsset(id: string) {
    setLocalSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= maxSelection) return prev
      return [...prev, id]
    })
  }

  function handleConfirm() {
    onSelect(localSelected)
    onClose()
  }

  const filteredAssets =
    filterCategory === 'all'
      ? assets
      : assets.filter((a) => a.category === filterCategory)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Select Brand Assets
            <span className="text-sm font-normal text-warm-500 ml-2">
              ({localSelected.length}/{maxSelection})
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap pb-2 border-b border-warm-200">
          <button
            onClick={() => setFilterCategory('all')}
            className={cn(
              'px-2.5 py-1 rounded-sm text-xs font-medium transition-colors',
              filterCategory === 'all'
                ? 'bg-warm-900 text-white'
                : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
            )}
          >
            All
          </button>
          {BRAND_ASSET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={cn(
                'px-2.5 py-1 rounded-sm text-xs font-medium transition-colors',
                filterCategory === cat.id
                  ? 'bg-warm-900 text-white'
                  : 'bg-warm-100 text-warm-600 hover:bg-warm-200'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto scrollbar-elegant py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-warm-300 border-t-lime-500 rounded-full animate-spin" />
            </div>
          ) : filteredAssets.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = localSelected.includes(asset.id)
                const isDisabled = !isSelected && localSelected.length >= maxSelection
                return (
                  <button
                    key={asset.id}
                    onClick={() => toggleAsset(asset.id)}
                    disabled={isDisabled}
                    className={cn(
                      'relative rounded-sm border overflow-hidden transition-all text-left',
                      isSelected
                        ? 'border-lime-500 ring-2 ring-lime-500/30'
                        : isDisabled
                        ? 'border-warm-200 opacity-40 cursor-not-allowed'
                        : 'border-warm-200 hover:border-warm-300'
                    )}
                  >
                    <div className="aspect-square bg-warm-100">
                      <img
                        src={asset.imageUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-lime-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    <div className="p-2">
                      <p className="text-xs font-medium text-warm-800 truncate">{asset.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="w-10 h-10 text-warm-300 mx-auto mb-2" />
              <p className="text-sm text-warm-500">
                {filterCategory !== 'all' ? 'No assets in this category' : 'No brand assets uploaded yet'}
              </p>
              <a
                href="/studio/assets"
                className="text-sm text-lime-600 hover:text-lime-700 underline mt-1 inline-block"
              >
                Upload assets
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-warm-200">
          {/* Selected preview strip */}
          <div className="flex gap-1.5">
            {localSelected.map((id) => {
              const asset = assets.find((a) => a.id === id)
              if (!asset) return null
              return (
                <div key={id} className="relative w-8 h-8 rounded-sm overflow-hidden border border-warm-200">
                  <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => toggleAsset(id)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-sm" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="lime" size="sm" className="rounded-sm" onClick={handleConfirm}>
              Confirm ({localSelected.length})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
