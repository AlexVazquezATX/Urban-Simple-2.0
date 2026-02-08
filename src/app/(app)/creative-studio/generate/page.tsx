'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronRight, ImageIcon, X, Stamp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  DishPhotoUpload,
  ModeSelector,
  OutputFormatSelector,
  PreviewPanel,
  BrandedPostForm,
  ImageSourcePicker,
  UsageBar,
} from '@/components/creative-studio'
import {
  CUISINE_TYPES,
  STYLE_PREFERENCES,
  type GenerationMode,
  type OutputFormatId,
  type BrandedPostType,
  OUTPUT_FORMATS,
} from '@/lib/config/restaurant-studio'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface BrandKit {
  id: string
  restaurantName: string
  primaryColor: string
  secondaryColor?: string | null
  preferredStyle?: string | null
  logoUrl?: string | null
  iconUrl?: string | null
}

type LogoChoice = 'none' | 'logo' | 'icon'

export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read URL params for initial state (e.g., from gallery "Use in Branded Post")
  const initialUrlMode = searchParams.get('mode')
  const initialSourceImageId = searchParams.get('sourceImageId')

  // Mode state - initialize from URL if present
  const [mode, setMode] = useState<GenerationMode>(
    initialUrlMode === 'branded_post' ? 'branded_post' : 'food_photo'
  )

  // Food Photo Mode state
  const [dishPhoto, setDishPhoto] = useState<string | null>(null)
  const [dishDescription, setDishDescription] = useState('')
  const [outputFormat, setOutputFormat] = useState<OutputFormatId>('menu')
  const [cuisineType, setCuisineType] = useState('')
  const [foodStyle, setFoodStyle] = useState('')

  // Style Reference (optional - for consistent look across dishes)
  const [styleReference, setStyleReference] = useState<string | null>(null)
  const [showStyleReference, setShowStyleReference] = useState(false)

  // Branded Post Mode state
  const [postType, setPostType] = useState<BrandedPostType>('announcement')
  const [headline, setHeadline] = useState('')
  const [brandedStyle, setBrandedStyle] = useState('minimal')
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('1:1')
  const [logoChoice, setLogoChoice] = useState<LogoChoice>('none')
  const [applyBrandColors, setApplyBrandColors] = useState(true)

  // Additional prompt instructions (shared across modes)
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  // Source image state (for branded posts) - initialize from URL if present
  const [sourceImage, setSourceImage] = useState<string | null>(null)
  const [sourceImageType, setSourceImageType] = useState<'upload' | 'gallery' | 'none'>(
    initialSourceImageId ? 'gallery' : 'none'
  )

  // Brand Kit state
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [loadingBrandKit, setLoadingBrandKit] = useState(true)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedAspectRatio, setGeneratedAspectRatio] = useState<string>('1:1')

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

  // Fetch source image data on mount if sourceImageId is in URL
  useEffect(() => {
    if (initialSourceImageId) {
      fetch(`/api/creative-studio/content?id=${initialSourceImageId}`)
        .then((res) => res.json())
        .then((data) => {
          const item = data.content?.[0]
          if (item?.generatedImageUrl) {
            setSourceImage(item.generatedImageUrl)
          }
        })
        .catch(console.error)
    }
  }, [initialSourceImageId])

  // Show checkout success toast
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Subscription activated! You can now generate more content.')
    }
  }, [searchParams])

  // Load default brand kit on mount
  useEffect(() => {
    loadBrandKit()
  }, [])

  async function loadBrandKit() {
    try {
      const response = await fetch('/api/creative-studio/brand-kit?default=true')
      const data = await response.json()
      if (data.brandKit) {
        setBrandKit(data.brandKit)
      }
    } catch (error) {
      console.error('Failed to load brand kit:', error)
    } finally {
      setLoadingBrandKit(false)
    }
  }

  // Reset generation when mode changes
  useEffect(() => {
    setGeneratedImage(null)
    setAdditionalInstructions('')
    setLogoChoice('none')
    setApplyBrandColors(true)
    if (mode === 'food_photo') {
      setSourceImage(null)
      setSourceImageType('none')
    }
  }, [mode])

  const canGenerate =
    mode === 'food_photo'
      ? !!dishPhoto
      : !!headline.trim()

  async function handleGenerate() {
    if (!canGenerate) return

    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      const body =
        mode === 'food_photo'
          ? {
              mode: 'food_photo',
              dishPhotoBase64: dishPhoto,
              dishDescription,
              outputFormat,
              cuisineType: cuisineType || undefined,
              style: foodStyle || undefined,
              styleReferenceBase64: styleReference || undefined,
              additionalInstructions: additionalInstructions.trim() || undefined,
            }
          : {
              mode: 'branded_post',
              postType,
              headline,
              brandKitId: brandKit?.id,
              style: brandedStyle,
              aspectRatio,
              applyBrandColors,
              logoBase64:
                logoChoice === 'logo' ? brandKit?.logoUrl || undefined :
                logoChoice === 'icon' ? brandKit?.iconUrl || undefined :
                undefined,
              sourceImageBase64: sourceImage || undefined,
              additionalInstructions: additionalInstructions.trim() || undefined,
            }

      const response = await fetch('/api/creative-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Generation failed')
      }

      const data = await response.json()

      setGeneratedImage(data.image.imageBase64)
      setGeneratedAspectRatio(
        mode === 'food_photo'
          ? OUTPUT_FORMATS[outputFormat].aspectRatio
          : aspectRatio
      )

      toast.success('Image generated successfully!')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      toast.error(message)
      console.error('Generation error:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!generatedImage) return

    setIsSaving(true)

    try {
      const body = {
        mode,
        outputFormat: mode === 'food_photo' ? outputFormat : undefined,
        generatedImageUrl: `data:image/png;base64,${generatedImage}`,
        headline: mode === 'branded_post' ? headline : dishDescription,
        brandKitId: brandKit?.id,
        status: 'saved',
      }

      const response = await fetch('/api/creative-studio/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to save')
      }

      toast.success('Saved to gallery!')
      router.push('/creative-studio/gallery')
    } catch (error) {
      toast.error('Failed to save image')
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  function handleSendToBrandedPosts() {
    if (!generatedImage) return

    // Capture the image before clearing it
    const imageData = generatedImage.startsWith('data:')
      ? generatedImage
      : `data:image/png;base64,${generatedImage}`

    // Switch to branded post mode and use the generated image as source
    setGeneratedImage(null)
    setSourceImageType('gallery')
    setSourceImage(imageData)
    setMode('branded_post')
  }

  return (
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/creative-studio"
              className="p-2 hover:bg-warm-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-warm-600" />
            </Link>
            <div>
              <h1 className="text-lg font-display font-medium text-warm-900">
                Create Content
              </h1>
              <p className="text-sm text-warm-500">
                {mode === 'food_photo'
                  ? 'Transform your dish photos'
                  : 'Generate branded graphics'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Bar */}
      <UsageBar />

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Form */}
          <div className="space-y-5">
            {/* Mode Selector */}
            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <Label className="text-warm-700 mb-3 block">Generation Mode</Label>
              <ModeSelector
                value={mode}
                onChange={setMode}
                disabled={isGenerating}
              />
            </div>

            {/* Food Photo Mode Form */}
            {mode === 'food_photo' && (
              <>
                {/* Photo Upload */}
                <div className="bg-white rounded-sm border border-warm-200 p-4">
                  <Label className="text-warm-700 mb-3 block">Dish Photo</Label>
                  <DishPhotoUpload
                    value={dishPhoto}
                    onImageSelect={setDishPhoto}
                    disabled={isGenerating}
                    className="aspect-[4/3]"
                  />
                </div>

                {/* Output Format */}
                <div className="bg-white rounded-sm border border-warm-200 p-4">
                  <Label className="text-warm-700 mb-3 block">Output Format</Label>
                  <OutputFormatSelector
                    value={outputFormat}
                    onChange={setOutputFormat}
                    disabled={isGenerating}
                  />
                </div>

                {/* Optional Details */}
                <div className="bg-white rounded-sm border border-warm-200 p-4 space-y-4">
                  <div>
                    <Label htmlFor="description" className="text-warm-700 mb-2 block">
                      Dish Description (optional)
                    </Label>
                    <Input
                      id="description"
                      value={dishDescription}
                      onChange={(e) => setDishDescription(e.target.value)}
                      placeholder="e.g., Grilled salmon with lemon butter sauce"
                      disabled={isGenerating}
                      className="rounded-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cuisine" className="text-warm-700 mb-2 block">
                      Cuisine Type (optional)
                    </Label>
                    <select
                      id="cuisine"
                      value={cuisineType}
                      onChange={(e) => setCuisineType(e.target.value)}
                      disabled={isGenerating}
                      className="w-full px-3 py-2 rounded-sm border border-warm-300 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                    >
                      <option value="">Select cuisine...</option>
                      {CUISINE_TYPES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="style" className="text-warm-700 mb-2 block">
                      Style (optional)
                    </Label>
                    <select
                      id="style"
                      value={foodStyle}
                      onChange={(e) => setFoodStyle(e.target.value)}
                      disabled={isGenerating}
                      className="w-full px-3 py-2 rounded-sm border border-warm-300 bg-white text-warm-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500"
                    >
                      <option value="">Select style...</option>
                      {STYLE_PREFERENCES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Style Reference (Collapsible) */}
                <div className="bg-white rounded-sm border border-warm-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowStyleReference(!showStyleReference)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-warm-50 transition-colors"
                    disabled={isGenerating}
                  >
                    <div>
                      <span className="text-sm font-medium text-warm-700">Style Reference</span>
                      <p className="text-xs text-warm-500 mt-0.5">
                        Match the look of another dish photo (optional)
                      </p>
                    </div>
                    {showStyleReference ? (
                      <ChevronDown className="w-4 h-4 text-warm-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-warm-500" />
                    )}
                  </button>

                  {showStyleReference && (
                    <div className="px-4 pb-4 border-t border-warm-100">
                      <p className="text-xs text-warm-500 mt-3 mb-3">
                        Upload a previously generated image to match its plates, background, and styling.
                      </p>

                      {styleReference ? (
                        <div className="relative aspect-video rounded-sm overflow-hidden bg-warm-100">
                          <img
                            src={styleReference}
                            alt="Style reference"
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => setStyleReference(null)}
                            className="absolute top-2 right-2 p-1.5 bg-warm-900/80 hover:bg-warm-900 rounded-sm text-white transition-colors"
                            title="Remove reference"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="block cursor-pointer">
                          <div className="aspect-video rounded-sm border-2 border-dashed border-warm-300 hover:border-lime-400 bg-warm-50 flex flex-col items-center justify-center transition-colors">
                            <ImageIcon className="w-8 h-8 text-warm-400 mb-2" />
                            <span className="text-sm text-warm-600">Upload reference image</span>
                            <span className="text-xs text-warm-400 mt-1">JPG, PNG</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                const reader = new FileReader()
                                reader.onload = (ev) => {
                                  setStyleReference(ev.target?.result as string)
                                }
                                reader.readAsDataURL(file)
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Branded Post Mode Form */}
            {mode === 'branded_post' && (
              <>
              {/* Source Image Picker */}
              <div className="bg-white rounded-sm border border-warm-200 p-4">
                <Label className="text-warm-700 mb-3 block">Source Image</Label>
                <ImageSourcePicker
                  value={sourceImage}
                  onChange={setSourceImage}
                  sourceType={sourceImageType}
                  onSourceTypeChange={setSourceImageType}
                  disabled={isGenerating}
                />
              </div>

              <div className="bg-white rounded-sm border border-warm-200 p-4">
                <BrandedPostForm
                  postType={postType}
                  onPostTypeChange={setPostType}
                  headline={headline}
                  onHeadlineChange={setHeadline}
                  style={brandedStyle}
                  onStyleChange={setBrandedStyle}
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  brandKit={brandKit}
                  applyBrandColors={applyBrandColors}
                  onApplyBrandColorsChange={setApplyBrandColors}
                  disabled={isGenerating}
                />
              </div>

              {/* Logo Picker - only show if brand kit has at least one logo */}
              {brandKit && (brandKit.logoUrl || brandKit.iconUrl) && (
                <div className="bg-white rounded-sm border border-warm-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Stamp className="w-4 h-4 text-warm-500" />
                    <Label className="text-warm-700">Include Logo</Label>
                  </div>
                  <div className="flex gap-2">
                    {/* No Logo */}
                    <button
                      onClick={() => setLogoChoice('none')}
                      disabled={isGenerating}
                      className={cn(
                        'flex-1 p-2.5 rounded-sm border text-center transition-all',
                        logoChoice === 'none'
                          ? 'border-plum-500 bg-plum-50 ring-1 ring-plum-500'
                          : 'border-warm-200 hover:border-warm-300 bg-white',
                        isGenerating && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="w-10 h-10 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-1.5">
                        <X className="w-4 h-4 text-warm-400" />
                      </div>
                      <p className={cn(
                        'text-xs font-medium',
                        logoChoice === 'none' ? 'text-plum-700' : 'text-warm-600'
                      )}>
                        No Logo
                      </p>
                    </button>

                    {/* Full Logo */}
                    {brandKit.logoUrl && (
                      <button
                        onClick={() => setLogoChoice('logo')}
                        disabled={isGenerating}
                        className={cn(
                          'flex-1 p-2.5 rounded-sm border text-center transition-all',
                          logoChoice === 'logo'
                            ? 'border-plum-500 bg-plum-50 ring-1 ring-plum-500'
                            : 'border-warm-200 hover:border-warm-300 bg-white',
                          isGenerating && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="w-10 h-10 rounded-sm bg-warm-50 border border-warm-100 flex items-center justify-center mx-auto mb-1.5 overflow-hidden">
                          <img
                            src={brandKit.logoUrl}
                            alt="Logo"
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                        <p className={cn(
                          'text-xs font-medium',
                          logoChoice === 'logo' ? 'text-plum-700' : 'text-warm-600'
                        )}>
                          Full Logo
                        </p>
                      </button>
                    )}

                    {/* Icon / Mark */}
                    {brandKit.iconUrl && (
                      <button
                        onClick={() => setLogoChoice('icon')}
                        disabled={isGenerating}
                        className={cn(
                          'flex-1 p-2.5 rounded-sm border text-center transition-all',
                          logoChoice === 'icon'
                            ? 'border-plum-500 bg-plum-50 ring-1 ring-plum-500'
                            : 'border-warm-200 hover:border-warm-300 bg-white',
                          isGenerating && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="w-10 h-10 rounded-sm bg-warm-50 border border-warm-100 flex items-center justify-center mx-auto mb-1.5 overflow-hidden">
                          <img
                            src={brandKit.iconUrl}
                            alt="Icon"
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                        <p className={cn(
                          'text-xs font-medium',
                          logoChoice === 'icon' ? 'text-plum-700' : 'text-warm-600'
                        )}>
                          Icon
                        </p>
                      </button>
                    )}
                  </div>
                </div>
              )}
              </>
            )}

            {/* Additional Instructions (both modes) */}
            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <Label htmlFor="instructions" className="text-warm-700 mb-2 block">
                Additional Directions (optional)
              </Label>
              <textarea
                id="instructions"
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                placeholder={
                  mode === 'food_photo'
                    ? 'e.g., Add a bottle of sake and shot glasses next to the dish, warm candlelight ambiance'
                    : 'e.g., Use bold red text, add confetti elements, make it feel festive and celebratory'
                }
                disabled={isGenerating}
                rows={3}
                className="w-full px-3 py-2 rounded-sm border border-warm-300 bg-white text-warm-900 text-sm placeholder:text-warm-400 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 resize-none disabled:opacity-50"
              />
              <p className="text-xs text-warm-500 mt-1.5">
                Guide the AI with specific details about what you want in the final image
              </p>
            </div>

            {/* Generate Button */}
            <Button
              variant="lime"
              size="lg"
              className="w-full rounded-sm"
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </div>

          {/* Right Column - Preview */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <PreviewPanel
              imageBase64={generatedImage}
              aspectRatio={generatedAspectRatio}
              isGenerating={isGenerating}
              onRegenerate={handleGenerate}
              onSave={handleSave}
              onSendToBrandedPosts={handleSendToBrandedPosts}
              isSaving={isSaving}
              disabled={isGenerating}
              mode={mode}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
