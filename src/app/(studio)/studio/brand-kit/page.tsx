'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Palette,
  Check,
  ImageIcon,
  Upload,
  X,
  Plus,
  Trash2,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CUISINE_TYPES, STYLE_PREFERENCES } from '@/lib/config/restaurant-studio'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ensureWebCompatible, isHeicFile } from '@/lib/image-utils'

interface BrandKit {
  id: string
  restaurantName: string
  primaryColor: string
  secondaryColor?: string | null
  accentColor?: string | null
  cuisineType?: string | null
  preferredStyle?: string | null
  logoUrl?: string | null
  iconUrl?: string | null
  isDefault: boolean
}

const COLOR_PALETTES = [
  { primary: '#1a1a1a', secondary: '#f5f5f5', name: 'Classic' },
  { primary: '#8B4513', secondary: '#F5DEB3', name: 'Rustic' },
  { primary: '#2E8B57', secondary: '#F0FFF0', name: 'Fresh' },
  { primary: '#DC143C', secondary: '#FFF5F5', name: 'Bold' },
  { primary: '#4169E1', secondary: '#F0F8FF', name: 'Modern' },
  { primary: '#FF6B35', secondary: '#FFF8F5', name: 'Vibrant' },
]

export default function StudioBrandKitPage() {
  const [brandKits, setBrandKits] = useState<BrandKit[]>([])
  const [selectedKit, setSelectedKit] = useState<BrandKit | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [restaurantName, setRestaurantName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1a1a1a')
  const [secondaryColor, setSecondaryColor] = useState('#f5f5f5')
  const [cuisineType, setCuisineType] = useState('')
  const [preferredStyle, setPreferredStyle] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)

  useEffect(() => {
    loadBrandKits()
  }, [])

  async function loadBrandKits() {
    try {
      const response = await fetch('/api/creative-studio/brand-kit')
      const data = await response.json()
      const kits = data.brandKits || []
      setBrandKits(kits)

      // Auto-select the default kit, or first kit
      const defaultKit = kits.find((k: BrandKit) => k.isDefault) || kits[0]
      if (defaultKit) {
        selectKit(defaultKit)
      }
    } catch (error) {
      console.error('Failed to load brand kits:', error)
      toast.error('Failed to load brand kits.')
    } finally {
      setLoading(false)
    }
  }

  function selectKit(kit: BrandKit) {
    setSelectedKit(kit)
    setIsNew(false)
    setRestaurantName(kit.restaurantName)
    setPrimaryColor(kit.primaryColor)
    setSecondaryColor(kit.secondaryColor || '#f5f5f5')
    setCuisineType(kit.cuisineType || '')
    setPreferredStyle(kit.preferredStyle || '')
    setLogoUrl(kit.logoUrl || null)
    setIconUrl(kit.iconUrl || null)
  }

  function startNewKit() {
    setSelectedKit(null)
    setIsNew(true)
    setRestaurantName('')
    setPrimaryColor('#1a1a1a')
    setSecondaryColor('#f5f5f5')
    setCuisineType('')
    setPreferredStyle('')
    setLogoUrl(null)
    setIconUrl(null)
  }

  async function handleSave() {
    if (!restaurantName.trim()) {
      toast.error('Please enter your restaurant name')
      return
    }

    setSaving(true)

    try {
      const method = isNew ? 'POST' : 'PUT'
      const body = isNew
        ? {
            restaurantName,
            primaryColor,
            secondaryColor,
            logoUrl: logoUrl || null,
            iconUrl: iconUrl || null,
            cuisineType: cuisineType || null,
            preferredStyle: preferredStyle || null,
            isDefault: brandKits.length === 0,
          }
        : {
            id: selectedKit!.id,
            restaurantName,
            primaryColor,
            secondaryColor,
            logoUrl: logoUrl || null,
            iconUrl: iconUrl || null,
            cuisineType: cuisineType || null,
            preferredStyle: preferredStyle || null,
          }

      const response = await fetch('/api/creative-studio/brand-kit', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      const data = await response.json()
      toast.success(isNew ? 'Brand kit created!' : 'Brand kit saved!')

      // Refresh the list
      await loadBrandKits()

      // Select the saved kit
      if (data.brandKit) {
        selectKit(data.brandKit)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save brand kit'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!selectedKit) return
    if (!confirm(`Delete "${selectedKit.restaurantName}" brand kit? This cannot be undone.`)) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/creative-studio/brand-kit?id=${selectedKit.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success('Brand kit deleted')
      await loadBrandKits()
    } catch {
      toast.error('Failed to delete brand kit')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSetDefault() {
    if (!selectedKit || selectedKit.isDefault) return

    setSaving(true)
    try {
      const response = await fetch('/api/creative-studio/brand-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedKit.id, isDefault: true }),
      })

      if (!response.ok) throw new Error('Failed to update')

      toast.success(`"${selectedKit.restaurantName}" is now the default brand kit`)
      await loadBrandKits()
    } catch {
      toast.error('Failed to set default')
    } finally {
      setSaving(false)
    }
  }

  function applyPalette(palette: { primary: string; secondary: string }) {
    setPrimaryColor(palette.primary)
    setSecondaryColor(palette.secondary)
  }

  function compressImage(file: File, maxDim: number = 600): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        // Use PNG for transparency support (logos), compressed quality
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/') && !isHeicFile(file)) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    try {
      const compatible = await ensureWebCompatible(file)
      const dataUrl = await compressImage(compatible)
      setter(dataUrl)
    } catch {
      toast.error('Failed to process image')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-warm-400" />
      </div>
    )
  }

  const showEditor = isNew || selectedKit

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-4">
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
                  Brand Kits
                </h1>
                <p className="text-sm text-warm-500">
                  Manage your restaurant branding
                </p>
              </div>
            </div>

            <Button
              variant="lime"
              size="sm"
              className="rounded-sm"
              onClick={startNewKit}
              disabled={saving}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Kit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
        {/* Brand Kit List */}
        {brandKits.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {brandKits.map((kit) => (
                <button
                  key={kit.id}
                  onClick={() => selectKit(kit)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-sm border transition-all',
                    selectedKit?.id === kit.id && !isNew
                      ? 'border-lime-500 bg-lime-50 ring-1 ring-lime-500'
                      : 'border-warm-200 hover:border-warm-300 bg-white'
                  )}
                >
                  <div
                    className="w-6 h-6 rounded-sm shrink-0"
                    style={{ backgroundColor: kit.primaryColor }}
                  />
                  <span className={cn(
                    'text-sm font-medium',
                    selectedKit?.id === kit.id && !isNew ? 'text-lime-700' : 'text-warm-900'
                  )}>
                    {kit.restaurantName}
                  </span>
                  {kit.isDefault && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warm-50 text-warm-500 border-warm-200">
                      Default
                    </Badge>
                  )}
                </button>
              ))}

              {isNew && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-sm border border-lime-500 bg-lime-50 ring-1 ring-lime-500">
                  <Plus className="w-4 h-4 text-lime-600" />
                  <span className="text-sm font-medium text-lime-700">New Brand Kit</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Editor */}
        {showEditor ? (
          <div className="space-y-6">
            {/* Kit actions bar */}
            {selectedKit && !isNew && (
              <div className="flex items-center gap-2">
                {!selectedKit.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-sm text-warm-600"
                    onClick={handleSetDefault}
                    disabled={saving}
                  >
                    <Star className="w-3.5 h-3.5 mr-1.5" />
                    Set as Default
                  </Button>
                )}
                {brandKits.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-sm text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {deleting ? '' : 'Delete'}
                  </Button>
                )}
              </div>
            )}

            {/* Restaurant Name */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <Label htmlFor="name" className="text-warm-700 mb-2 block">
                Restaurant Name
              </Label>
              <Input
                id="name"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="Your Restaurant Name"
                className="rounded-sm"
              />
            </div>

            {/* Logos & Icons */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="w-4 h-4 text-warm-500" />
                <Label className="text-warm-700">Logos & Icons</Label>
              </div>
              <p className="text-xs text-warm-500 mb-4">
                Upload your logo and icon to automatically include them in branded posts
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-warm-500 mb-2 block">Full Logo</Label>
                  {logoUrl ? (
                    <div className="relative group aspect-3/2 rounded-sm border border-warm-200 bg-warm-50 overflow-hidden">
                      <img src={logoUrl} alt="Restaurant logo" className="w-full h-full object-contain p-2" />
                      <button
                        onClick={() => setLogoUrl(null)}
                        className="absolute top-1.5 right-1.5 p-1 bg-warm-900/70 hover:bg-warm-900 rounded-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="aspect-3/2 rounded-sm border-2 border-dashed border-warm-300 hover:border-lime-400 bg-warm-50 flex flex-col items-center justify-center transition-colors">
                        <Upload className="w-5 h-5 text-warm-400 mb-1.5" />
                        <span className="text-xs text-warm-500">Upload logo</span>
                        <span className="text-[10px] text-warm-400 mt-0.5">PNG, JPG — max 5MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setLogoUrl)}
                      />
                    </label>
                  )}
                  <p className="text-[10px] text-warm-400 mt-1">Main logo with text</p>
                </div>

                <div>
                  <Label className="text-xs text-warm-500 mb-2 block">Icon / Mark</Label>
                  {iconUrl ? (
                    <div className="relative group aspect-3/2 rounded-sm border border-warm-200 bg-warm-50 overflow-hidden">
                      <img src={iconUrl} alt="Restaurant icon" className="w-full h-full object-contain p-2" />
                      <button
                        onClick={() => setIconUrl(null)}
                        className="absolute top-1.5 right-1.5 p-1 bg-warm-900/70 hover:bg-warm-900 rounded-sm text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="block cursor-pointer">
                      <div className="aspect-3/2 rounded-sm border-2 border-dashed border-warm-300 hover:border-lime-400 bg-warm-50 flex flex-col items-center justify-center transition-colors">
                        <Upload className="w-5 h-5 text-warm-400 mb-1.5" />
                        <span className="text-xs text-warm-500">Upload icon</span>
                        <span className="text-[10px] text-warm-400 mt-0.5">PNG, JPG — max 5MB</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e, setIconUrl)}
                      />
                    </label>
                  )}
                  <p className="text-[10px] text-warm-400 mt-1">Smaller mark or symbol</p>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-warm-500" />
                <Label className="text-warm-700">Brand Colors</Label>
              </div>

              <div className="mb-4">
                <p className="text-xs text-warm-500 mb-2">Quick palettes:</p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.name}
                      onClick={() => applyPalette(palette)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-sm border transition-colors',
                        primaryColor === palette.primary && secondaryColor === palette.secondary
                          ? 'border-lime-500 bg-lime-50'
                          : 'border-warm-200 hover:border-warm-300'
                      )}
                    >
                      <div className="flex">
                        <div className="w-5 h-5 rounded-l-sm" style={{ backgroundColor: palette.primary }} />
                        <div className="w-5 h-5 rounded-r-sm" style={{ backgroundColor: palette.secondary }} />
                      </div>
                      <span className="text-xs text-warm-700">{palette.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primary" className="text-xs text-warm-500 mb-1.5 block">
                    Primary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="primary"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded-sm border border-warm-200 cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="rounded-sm font-mono text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondary" className="text-xs text-warm-500 mb-1.5 block">
                    Secondary Color
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      id="secondary"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded-sm border border-warm-200 cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="rounded-sm font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-sm border border-warm-200">
                <p className="text-xs text-warm-500 mb-2">Preview:</p>
                <div
                  className="h-20 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-lg font-medium" style={{ color: secondaryColor }}>
                    {restaurantName || 'Your Restaurant'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cuisine Type */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <Label htmlFor="cuisine" className="text-warm-700 mb-2 block">
                Cuisine Type (optional)
              </Label>
              <select
                id="cuisine"
                value={cuisineType}
                onChange={(e) => setCuisineType(e.target.value)}
                className="w-full px-3 py-2 rounded-sm border border-warm-300 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
              >
                <option value="">Select cuisine...</option>
                {CUISINE_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-warm-500 mt-1">
                Helps AI generate more contextually appropriate content
              </p>
            </div>

            {/* Preferred Style */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <Label className="text-warm-700 mb-3 block">
                Preferred Style (optional)
              </Label>
              <div className="space-y-2">
                {STYLE_PREFERENCES.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setPreferredStyle(style.value)}
                    className={cn(
                      'w-full p-3 rounded-sm border transition-all text-left flex items-center justify-between',
                      preferredStyle === style.value
                        ? 'border-lime-500 bg-lime-50'
                        : 'border-warm-200 hover:border-warm-300 bg-white'
                    )}
                  >
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        preferredStyle === style.value ? 'text-lime-700' : 'text-warm-900'
                      )}>
                        {style.label}
                      </p>
                      <p className="text-xs text-warm-500">{style.description}</p>
                    </div>
                    {preferredStyle === style.value && (
                      <Check className="w-4 h-4 text-lime-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <Button
              variant="lime"
              size="lg"
              className="w-full rounded-sm"
              onClick={handleSave}
              disabled={saving || !restaurantName.trim()}
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isNew ? 'Create Brand Kit' : 'Save Brand Kit'}
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Empty state — no kits yet */
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-4">
              <Palette className="w-7 h-7 text-warm-400" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">
              No brand kits yet
            </h3>
            <p className="text-sm text-warm-500 mb-4">
              Create your first brand kit to use in branded posts.
            </p>
            <Button variant="lime" size="sm" className="rounded-sm" onClick={startNewKit}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Brand Kit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
