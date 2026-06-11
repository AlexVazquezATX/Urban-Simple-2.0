'use client'

import { Download, RefreshCw, Bookmark, Loader2, ImageIcon, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PreviewPanelProps {
  imageBase64?: string | null
  aspectRatio?: string
  isGenerating?: boolean
  onRegenerate?: () => void
  onSave?: () => void
  onDownload?: () => void
  onSendToBrandedPosts?: () => void
  isSaving?: boolean
  disabled?: boolean
  mode?: string
}

export function PreviewPanel({
  imageBase64,
  aspectRatio = '1:1',
  isGenerating = false,
  onRegenerate,
  onSave,
  onDownload,
  onSendToBrandedPosts,
  isSaving = false,
  disabled = false,
  mode,
}: PreviewPanelProps) {
  // Convert aspect ratio string to padding-bottom percentage
  const getAspectRatioPadding = (ratio: string): string => {
    const [w, h] = ratio.split(':').map(Number)
    if (!w || !h) return '100%' // Default to square
    return `${(h / w) * 100}%`
  }

  const handleDownload = () => {
    if (!imageBase64) return

    // Create a link element and trigger download
    const link = document.createElement('a')
    link.href = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`
    link.download = `studio-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    onDownload?.()
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
      {/* Preview Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <p className="kicker text-muted-foreground">Preview</p>
        {aspectRatio && (
          <Badge variant="neutral" className="font-mono tabular-nums">
            {aspectRatio}
          </Badge>
        )}
      </div>

      {/* Preview Area */}
      <div className="p-4">
        <div
          className="relative w-full overflow-hidden rounded-[12px] bg-secondary"
          style={{ paddingBottom: getAspectRatioPadding(aspectRatio) }}
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="mb-3 size-10 animate-spin text-gold-600 dark:text-gold-400" />
              <p className="text-sm font-medium text-foreground">Generating...</p>
              <p className="mt-1 text-xs text-muted-foreground">This may take 20-30 seconds</p>
            </div>
          ) : imageBase64 ? (
            <img
              src={
                imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/png;base64,${imageBase64}`
              }
              alt="Generated"
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="mb-3 grid size-16 place-items-center rounded-[12px] bg-background">
                <ImageIcon className="size-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground">Your generated image will appear here</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Upload a photo and generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {imageBase64 && (
        <div className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onSave}
              disabled={disabled || isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-[9px] bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Bookmark className="size-4" />}
              Save to gallery
            </button>
            <button
              onClick={handleDownload}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-[9px] border border-input bg-transparent py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60 disabled:pointer-events-none disabled:opacity-50"
            >
              <Download className="size-4" />
              Download
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onRegenerate}
              disabled={disabled || isGenerating}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <RefreshCw className="size-4" /> Regenerate
            </button>

            {/* Send to Branded Posts - only in food_photo mode */}
            {mode === 'food_photo' && onSendToBrandedPosts && (
              <button
                onClick={onSendToBrandedPosts}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 transition-colors hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300 disabled:pointer-events-none disabled:opacity-50"
              >
                <Wand2 className="size-4" /> Turn into branded post
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PreviewPanel
