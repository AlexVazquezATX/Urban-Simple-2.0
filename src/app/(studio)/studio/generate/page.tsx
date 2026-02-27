'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PromptInput,
  StylePresetSelector,
  AspectRatioPicker,
  ReferenceImageUpload,
  BrandContextToggle,
  ContentPreviewPanel,
  BrandAssetSelector,
} from '@/components/content-studio'
import { UsageBar } from '@/components/creative-studio'
import { toast } from 'sonner'
import type { StylePreset, AspectRatio } from '@/lib/config/content-studio'

interface BrandKit {
  id: string
  restaurantName: string
  primaryColor: string
  secondaryColor?: string | null
}

export default function StudioGeneratePage() {
  return (
    <Suspense>
      <StudioGenerateContent />
    </Suspense>
  )
}

function StudioGenerateContent() {
  const router = useRouter()

  // Core state
  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState<StylePreset | null>(null)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [referenceImages, setReferenceImages] = useState<string[]>([])

  // Brand assets
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [selectedAssetUrls, setSelectedAssetUrls] = useState<string[]>([])
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false)

  // Brand context
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null)
  const [loadingBrandKit, setLoadingBrandKit] = useState(true)
  const [applyBrandContext, setApplyBrandContext] = useState(true)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedAspectRatio, setGeneratedAspectRatio] = useState<string>('1:1')

  // Save state
  const [isSaving, setIsSaving] = useState(false)

  // Load default brand kit
  useEffect(() => {
    fetch('/api/creative-studio/brand-kit/default')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setBrandKit(data)
      })
      .catch(console.error)
      .finally(() => setLoadingBrandKit(false))
  }, [])

  // When asset selection changes, fetch the URLs
  async function handleAssetSelect(ids: string[]) {
    setSelectedAssetIds(ids)
    if (ids.length === 0) {
      setSelectedAssetUrls([])
      return
    }
    try {
      const res = await fetch('/api/creative-studio/assets')
      const data = await res.json()
      const assets = data.assets || []
      const urls = ids
        .map((id: string) => assets.find((a: { id: string; imageUrl: string }) => a.id === id)?.imageUrl)
        .filter(Boolean) as string[]
      setSelectedAssetUrls(urls)
    } catch {
      console.error('Failed to fetch asset URLs')
    }
  }

  const canGenerate = prompt.trim().length > 0 && !isGenerating

  async function handleGenerate() {
    if (!canGenerate) return

    try {
      setIsGenerating(true)
      setGeneratedImage(null)

      const res = await fetch('/api/creative-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'content_studio',
          prompt: prompt.trim(),
          stylePreset,
          aspectRatio,
          referenceImages,
          brandAssetUrls: selectedAssetUrls,
          brandKitId: applyBrandContext ? brandKit?.id : undefined,
          applyBrandContext,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to generate image')
      }

      const data = await res.json()
      if (data.image?.imageBase64) {
        setGeneratedImage(data.image.imageBase64)
        setGeneratedAspectRatio(data.image.aspectRatio || aspectRatio)
        toast.success('Image generated!')
      } else {
        throw new Error('No image returned')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed'
      toast.error(message)
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleSave() {
    if (!generatedImage) return

    try {
      setIsSaving(true)

      const imageDataUrl = generatedImage.startsWith('data:')
        ? generatedImage
        : `data:image/png;base64,${generatedImage}`

      const res = await fetch('/api/creative-studio/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'content_studio',
          generatedImageUrl: imageDataUrl,
          aiPrompt: prompt,
          aiModel: 'gemini', // Will be replaced with actual model from generation
          headline: prompt.slice(0, 100) + (prompt.length > 100 ? '...' : ''),
          status: 'saved',
          brandKitId: applyBrandContext ? brandKit?.id : undefined,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      const data = await res.json()
      toast.success('Saved to gallery!')
      router.push(`/studio/gallery?view=${data.id}`)
    } catch (error) {
      toast.error('Failed to save to gallery')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <UsageBar />

      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/studio"
              className="text-warm-400 hover:text-warm-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-warm-900">Create</h1>
              <p className="text-xs text-warm-500">
                Generate any type of content — photorealistic, illustrated, animated, anything
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Form */}
          <div className="space-y-4">
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              disabled={isGenerating}
            />

            <StylePresetSelector
              value={stylePreset}
              onChange={setStylePreset}
              disabled={isGenerating}
            />

            <AspectRatioPicker
              value={aspectRatio}
              onChange={setAspectRatio}
              disabled={isGenerating}
            />

            <ReferenceImageUpload
              images={referenceImages}
              onChange={setReferenceImages}
              disabled={isGenerating}
            />

            {/* Brand Assets */}
            <div className="bg-white rounded-sm border border-warm-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-sm font-medium text-warm-900">Brand Assets</label>
                  <p className="text-xs text-warm-400 mt-0.5">
                    Drop in logos, products, or objects to include in the image
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-sm"
                  onClick={() => setAssetSelectorOpen(true)}
                  disabled={isGenerating}
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                  {selectedAssetIds.length > 0
                    ? `${selectedAssetIds.length} selected`
                    : 'Select Assets'}
                </Button>
              </div>
              {selectedAssetIds.length === 0 && (
                <p className="text-xs text-warm-400 italic">
                  No assets selected.{' '}
                  <a href="/studio/assets" className="text-lime-600 hover:text-lime-700 underline">
                    Upload assets
                  </a>{' '}
                  to your library first.
                </p>
              )}
            </div>

            <BrandAssetSelector
              isOpen={assetSelectorOpen}
              onClose={() => setAssetSelectorOpen(false)}
              selectedAssetIds={selectedAssetIds}
              onSelect={handleAssetSelect}
            />

            <BrandContextToggle
              brandKit={brandKit}
              enabled={applyBrandContext}
              onToggle={setApplyBrandContext}
              loading={loadingBrandKit}
            />

            {/* Generate Button */}
            <Button
              variant="lime"
              className="w-full rounded-sm h-12 text-base"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>

          {/* Right: Preview */}
          <div>
            <ContentPreviewPanel
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
