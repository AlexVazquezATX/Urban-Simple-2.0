'use client'

import { useState, useEffect } from 'react'
import {
  Save,
  Loader2,
  Palette,
  Check,
  ImageIcon,
  Upload,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/layout/page-header'
import { CUISINE_TYPES, STYLE_PREFERENCES } from '@/lib/config/restaurant-studio'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

// Predefined color palettes for restaurants (client brand data, not UI chrome)
const COLOR_PALETTES = [
  { primary: '#1a1a1a', secondary: '#f5f5f5', name: 'Classic' },
  { primary: '#8B4513', secondary: '#F5DEB3', name: 'Rustic' },
  { primary: '#2E8B57', secondary: '#F0FFF0', name: 'Fresh' },
  { primary: '#DC143C', secondary: '#FFF5F5', name: 'Bold' },
  { primary: '#4169E1', secondary: '#F0F8FF', name: 'Modern' },
  { primary: '#FF6B35', secondary: '#FFF8F5', name: 'Vibrant' },
]

export default function BrandKitPage() {
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [restaurantName, setRestaurantName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#1a1a1a')
  const [secondaryColor, setSecondaryColor] = useState('#f5f5f5')
  const [cuisineType, setCuisineType] = useState('')
  const [preferredStyle, setPreferredStyle] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [iconUrl, setIconUrl] = useState<string | null>(null)

  useEffect(() => {
    loadBrandKit()
  }, [])

  async function loadBrandKit() {
    try {
      const response = await fetch('/api/creative-studio/brand-kit?default=true')
      const data = await response.json()

      if (data.brandKit) {
        const kit = data.brandKit
        setBrandKit(kit)
        setRestaurantName(kit.restaurantName)
        setPrimaryColor(kit.primaryColor)
        setSecondaryColor(kit.secondaryColor || '#f5f5f5')
        setCuisineType(kit.cuisineType || '')
        setPreferredStyle(kit.preferredStyle || '')
        setLogoUrl(kit.logoUrl || null)
        setIconUrl(kit.iconUrl || null)
      }
    } catch (error) {
      console.error('Failed to load brand kit:', error)
      toast.error('Failed to load brand kit. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!restaurantName.trim()) {
      toast.error('Please enter your restaurant name')
      return
    }

    setSaving(true)

    try {
      const method = brandKit ? 'PUT' : 'POST'
      const body = brandKit
        ? {
            id: brandKit.id,
            restaurantName,
            primaryColor,
            secondaryColor,
            logoUrl: logoUrl || null,
            iconUrl: iconUrl || null,
            cuisineType: cuisineType || null,
            preferredStyle: preferredStyle || null,
          }
        : {
            restaurantName,
            primaryColor,
            secondaryColor,
            logoUrl: logoUrl || null,
            iconUrl: iconUrl || null,
            cuisineType: cuisineType || null,
            preferredStyle: preferredStyle || null,
            isDefault: true,
          }

      const response = await fetch('/api/creative-studio/brand-kit', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      const data = await response.json()
      setBrandKit(data.brandKit)
      toast.success('Brand kit saved!')
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save brand kit')
    } finally {
      setSaving(false)
    }
  }

  function applyPalette(palette: { primary: string; secondary: string }) {
    setPrimaryColor(palette.primary)
    setSecondaryColor(palette.secondary)
  }

  function handleImageUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // 2MB max for logos (stored as data URLs)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setter(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        backHref="/creative-studio"
        kicker="STUDIO · BACKHAUS"
        title="Brand Kit"
        subtitle="Configure your restaurant's branding"
        actions={
          <Button
            variant="gold"
            onClick={handleSave}
            disabled={saving || !restaurantName.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Save Brand Kit
              </>
            )}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Restaurant Name */}
        <div className="rounded-[14px] border border-border bg-card p-5">
          <Label htmlFor="name" className="mb-2 block">
            Restaurant Name
          </Label>
          <Input
            id="name"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Your Restaurant Name"
          />
        </div>

        {/* Logos & Icons */}
        <div className="rounded-[14px] border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <Label>Logos & Icons</Label>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Upload your logo and icon to automatically include them in branded posts
          </p>

          <div className="grid grid-cols-2 gap-4">
            {/* Full Logo */}
            <div>
              <Label className="mb-2 block">
                Full Logo
              </Label>
              {logoUrl ? (
                <div className="group relative aspect-3/2 overflow-hidden rounded-[12px] border border-border bg-secondary">
                  <img
                    src={logoUrl}
                    alt="Restaurant logo"
                    className="h-full w-full object-contain p-2"
                  />
                  <button
                    onClick={() => setLogoUrl(null)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-ink-950/70 p-1 text-white opacity-0 transition-opacity hover:bg-ink-950/90 group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="flex aspect-3/2 flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border bg-secondary/40 transition-colors hover:border-gold-600/40 dark:hover:border-gold-400/40">
                    <Upload className="mb-1.5 size-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload logo</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground/70">PNG, SVG, JPG</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setLogoUrl)}
                  />
                </label>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Main logo with text
              </p>
            </div>

            {/* Icon / Mark */}
            <div>
              <Label className="mb-2 block">
                Icon / Mark
              </Label>
              {iconUrl ? (
                <div className="group relative aspect-3/2 overflow-hidden rounded-[12px] border border-border bg-secondary">
                  <img
                    src={iconUrl}
                    alt="Restaurant icon"
                    className="h-full w-full object-contain p-2"
                  />
                  <button
                    onClick={() => setIconUrl(null)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-ink-950/70 p-1 text-white opacity-0 transition-opacity hover:bg-ink-950/90 group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="flex aspect-3/2 flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-border bg-secondary/40 transition-colors hover:border-gold-600/40 dark:hover:border-gold-400/40">
                    <Upload className="mb-1.5 size-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload icon</span>
                    <span className="mt-0.5 text-[10px] text-muted-foreground/70">PNG, SVG, JPG</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, setIconUrl)}
                  />
                </label>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">
                Smaller mark or symbol
              </p>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="rounded-[14px] border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="size-4 text-muted-foreground" />
            <Label>Brand Colors</Label>
          </div>

          {/* Color Palettes */}
          <div className="mb-4">
            <p className="mb-2 text-xs text-muted-foreground">Quick palettes:</p>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => applyPalette(palette)}
                  className={cn(
                    'flex items-center gap-2 rounded-[10px] border px-3 py-2 transition-colors',
                    primaryColor === palette.primary && secondaryColor === palette.secondary
                      ? 'border-gold-600/40 bg-gold-600/10 ring-1 ring-gold-600/30 dark:border-gold-400/30 dark:bg-gold-400/12 dark:ring-gold-400/25'
                      : 'border-border hover:border-gold-600/30 dark:hover:border-gold-400/25'
                  )}
                >
                  <div className="flex">
                    <div
                      className="size-5 rounded-l-[6px]"
                      style={{ backgroundColor: palette.primary }}
                    />
                    <div
                      className="size-5 rounded-r-[6px]"
                      style={{ backgroundColor: palette.secondary }}
                    />
                  </div>
                  <span className="text-xs text-foreground">{palette.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary" className="mb-1.5 block">
                Primary Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="primary"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="size-10 cursor-pointer rounded-[10px] border border-border"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondary" className="mb-1.5 block">
                Secondary Color
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="secondary"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="size-10 cursor-pointer rounded-[10px] border border-border"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 rounded-[12px] border border-border p-4">
            <p className="mb-2 text-xs text-muted-foreground">Preview:</p>
            <div
              className="flex h-20 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: primaryColor }}
            >
              <span
                className="font-display text-lg font-medium"
                style={{ color: secondaryColor }}
              >
                {restaurantName || 'Your Restaurant'}
              </span>
            </div>
          </div>
        </div>

        {/* Cuisine Type */}
        <div className="rounded-[14px] border border-border bg-card p-5">
          <Label htmlFor="cuisine" className="mb-2 block">
            Cuisine Type (optional)
          </Label>
          <select
            id="cuisine"
            value={cuisineType}
            onChange={(e) => setCuisineType(e.target.value)}
            className="w-full rounded-[12px] border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Select cuisine...</option>
            {CUISINE_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Helps AI generate more contextually appropriate content
          </p>
        </div>

        {/* Preferred Style */}
        <div className="rounded-[14px] border border-border bg-card p-5">
          <Label className="mb-3 block">
            Preferred Style (optional)
          </Label>
          <div className="space-y-2">
            {STYLE_PREFERENCES.map((style) => (
              <button
                key={style.value}
                onClick={() => setPreferredStyle(style.value)}
                className={cn(
                  'flex w-full items-center justify-between rounded-[12px] border p-3 text-left transition-all',
                  preferredStyle === style.value
                    ? 'border-gold-600/40 bg-gold-600/10 ring-1 ring-gold-600/30 dark:border-gold-400/30 dark:bg-gold-400/12 dark:ring-gold-400/25'
                    : 'border-border bg-card hover:border-gold-600/30 dark:hover:border-gold-400/25'
                )}
              >
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      preferredStyle === style.value
                        ? 'text-gold-600 dark:text-gold-400'
                        : 'text-foreground'
                    )}
                  >
                    {style.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{style.description}</p>
                </div>
                {preferredStyle === style.value && (
                  <Check className="size-4 shrink-0 text-gold-600 dark:text-gold-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
