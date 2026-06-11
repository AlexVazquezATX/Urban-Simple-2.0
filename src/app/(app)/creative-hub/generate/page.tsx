'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Loader2, ImageIcon, X, LayoutGrid, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/page-header'
import {
  PromptInput,
  StylePresetSelector,
  AspectRatioPicker,
  ReferenceImageUpload,
  BrandAssetSelector,
} from '@/components/content-studio'
import { ContentPreviewPanel } from '@/components/content-studio/preview-panel'
import { toast } from 'sonner'
import type { StylePreset, AspectRatio, ReferenceMode } from '@/lib/config/content-studio'

interface SelectedAsset {
  id: string
  name: string
  imageUrl: string
}

export default function CreativeHubGeneratePage() {
  return (
    <Suspense>
      <GenerateContent />
    </Suspense>
  )
}

function GenerateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Core state
  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState<StylePreset | null>(null)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1')
  const [referenceImages, setReferenceImages] = useState<string[]>([])
  const [referenceModes, setReferenceModes] = useState<ReferenceMode[]>([])

  // Brand assets
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([])
  const [assetSelectorOpen, setAssetSelectorOpen] = useState(false)

  // Load prompt from URL query param (for prompt reuse)
  useEffect(() => {
    const reusedPrompt = searchParams.get('prompt')
    if (reusedPrompt) {
      setPrompt(reusedPrompt)
    }
  }, [searchParams])

  function clearAll() {
    setPrompt('')
    setStylePreset(null)
    setAspectRatio('1:1')
    setReferenceImages([])
    setReferenceModes([])
    setSelectedAssets([])
    setGeneratedImage(null)
    setGeneratedPrompt('')
    setGeneratedModel('')
  }

  const selectedAssetIds = selectedAssets.map((a) => a.id)

  // When the asset selector confirms, fetch asset details for thumbnails
  async function handleAssetSelect(ids: string[]) {
    if (ids.length === 0) {
      setSelectedAssets([])
      return
    }
    try {
      const res = await fetch('/api/creative-hub/assets')
      const data = await res.json()
      const allAssets = data.assets || []
      const selected = ids
        .map((id: string) => allAssets.find((a: SelectedAsset) => a.id === id))
        .filter(Boolean) as SelectedAsset[]
      setSelectedAssets(selected)
    } catch {
      // Keep IDs even if fetch fails
      setSelectedAssets(ids.map((id) => ({ id, name: '', imageUrl: '' })))
    }
  }

  function removeAsset(id: string) {
    setSelectedAssets((prev) => prev.filter((a) => a.id !== id))
  }

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generatedAspectRatio, setGeneratedAspectRatio] = useState<string>('1:1')
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('')
  const [generatedModel, setGeneratedModel] = useState<string>('')

  // Save state
  const [isSaving, setIsSaving] = useState(false)

  const canGenerate = prompt.trim().length > 0 && !isGenerating

  async function handleGenerate() {
    if (!canGenerate) return

    try {
      setIsGenerating(true)
      setGeneratedImage(null)

      const res = await fetch('/api/creative-hub/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          stylePreset,
          aspectRatio,
          brandAssetIds: selectedAssetIds,
          referenceImages,
          referenceModes: referenceModes.length > 0 ? referenceModes : undefined,
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
        setGeneratedPrompt(data.prompt || prompt.trim())
        setGeneratedModel(data.image.model || '')
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

      const imageBase64 = generatedImage

      const res = await fetch('/api/creative-hub/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          imageBase64,
          name: `AI Generated - ${prompt.slice(0, 60)}`,
          imageType: 'branded_graphic',
          aspectRatio: generatedAspectRatio,
          aiPrompt: generatedPrompt || prompt.trim(),
          aiModel: generatedModel,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to save')
      }

      toast.success('Saved to image library!')
      router.push('/creative-hub/images')
    } catch (error) {
      toast.error('Failed to save to library')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        kicker="CREATIVE HUB · GENERATE"
        title="Generate"
        subtitle="Create any type of visual — photorealistic, illustrated, animated, anything"
        backHref="/creative-hub"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={isGenerating}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Clear All
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/creative-hub/images">
                <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
                Gallery
              </Link>
            </Button>
          </>
        }
      />

      {/* Two-Column Layout */}
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
            referenceModes={referenceModes}
            onReferenceModesChange={setReferenceModes}
            disabled={isGenerating}
          />

          {/* Brand Assets */}
          <div className="bg-card rounded-[14px] border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm font-medium text-foreground">Brand Assets</label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drop in logos, products, or objects to include in the image
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssetSelectorOpen(true)}
                disabled={isGenerating}
              >
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                {selectedAssets.length > 0
                  ? `${selectedAssets.length} selected`
                  : 'Select Assets'}
              </Button>
            </div>

            {/* Selected asset thumbnails */}
            {selectedAssets.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {selectedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative group w-16 h-16 rounded-[10px] overflow-hidden border border-border"
                  >
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="absolute inset-0 bg-ink-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    <p className="absolute bottom-0 left-0 right-0 bg-ink-950/50 text-[9px] text-white px-1 py-0.5 truncate">
                      {asset.name}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No assets selected.{' '}
                <Link href="/creative-hub/assets" className="text-primary underline hover:opacity-80">
                  Upload assets
                </Link>{' '}
                to your library first.
              </p>
            )}
          </div>

          <BrandAssetSelector
            isOpen={assetSelectorOpen}
            onClose={() => setAssetSelectorOpen(false)}
            selectedAssetIds={selectedAssetIds}
            onSelect={handleAssetSelect}
            apiPath="/api/creative-hub/assets"
          />

          {/* Generate Button */}
          <Button
            variant="gold"
            className="w-full h-12 text-base"
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
  )
}
