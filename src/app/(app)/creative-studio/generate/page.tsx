'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  DishPhotoUpload,
  ModeSelector,
  OutputFormatSelector,
  PreviewPanel,
  BrandedPostForm,
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

interface BrandKit {
  id: string
  restaurantName: string
  primaryColor: string
  secondaryColor?: string | null
  preferredStyle?: string | null
}

export default function GeneratePage() {
  const router = useRouter()

  // Mode state
  const [mode, setMode] = useState<GenerationMode>('food_photo')

  // Food Photo Mode state
  const [dishPhoto, setDishPhoto] = useState<string | null>(null)
  const [dishDescription, setDishDescription] = useState('')
  const [outputFormat, setOutputFormat] = useState<OutputFormatId>('menu')
  const [cuisineType, setCuisineType] = useState('')
  const [foodStyle, setFoodStyle] = useState('')

  // Branded Post Mode state
  const [postType, setPostType] = useState<BrandedPostType>('announcement')
  const [headline, setHeadline] = useState('')
  const [brandedStyle, setBrandedStyle] = useState('minimal')
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '9:16' | '16:9'>('1:1')

  // Brand Kit state
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [loadingBrandKit, setLoadingBrandKit] = useState(true)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedAspectRatio, setGeneratedAspectRatio] = useState<string>('1:1')

  // Saving state
  const [isSaving, setIsSaving] = useState(false)

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
            }
          : {
              mode: 'branded_post',
              postType,
              headline,
              brandKitId: brandKit?.id,
              style: brandedStyle,
              aspectRatio,
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
              </>
            )}

            {/* Branded Post Mode Form */}
            {mode === 'branded_post' && (
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
                  disabled={isGenerating}
                />
              </div>
            )}

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
              isSaving={isSaving}
              disabled={isGenerating}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
