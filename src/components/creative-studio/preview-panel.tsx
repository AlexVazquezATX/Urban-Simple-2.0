'use client'

import { Download, RefreshCw, Bookmark, Loader2, ImageIcon, Wand2 } from 'lucide-react'

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
    <div className="bg-white rounded-3xl border border-cream-300 shadow-elevated overflow-hidden">
      {/* Preview Header */}
      <div className="px-5 py-3.5 border-b border-cream-200 flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.14em] text-warm-500 font-semibold">Preview</p>
        {aspectRatio && (
          <span className="text-xs font-medium text-bronze-700 bg-bronze-50 border border-bronze-100 px-2.5 py-0.5 rounded-full">
            {aspectRatio}
          </span>
        )}
      </div>

      {/* Preview Area */}
      <div className="p-4">
        <div
          className="relative w-full bg-cream-100 rounded-xl overflow-hidden"
          style={{ paddingBottom: getAspectRatioPadding(aspectRatio) }}
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-bronze-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-charcoal-800">Generating...</p>
              <p className="text-xs text-warm-500 mt-1">This may take 20-30 seconds</p>
            </div>
          ) : imageBase64 ? (
            <img
              src={
                imageBase64.startsWith('data:')
                  ? imageBase64
                  : `data:image/png;base64,${imageBase64}`
              }
              alt="Generated"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-cream-200 flex items-center justify-center mb-3">
                <ImageIcon className="w-7 h-7 text-cream-400" />
              </div>
              <p className="text-sm text-warm-500">Your generated image will appear here</p>
              <p className="text-xs text-warm-400 mt-1">Upload a photo and generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {imageBase64 && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onSave}
              disabled={disabled || isSaving}
              className="rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-cream-50 text-sm font-semibold py-2.5 inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
              Save to gallery
            </button>
            <button
              onClick={handleDownload}
              disabled={disabled}
              className="rounded-xl border border-cream-300 bg-white hover:bg-cream-50 text-charcoal-800 text-sm font-semibold py-2.5 inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onRegenerate}
              disabled={disabled || isGenerating}
              className="text-sm text-warm-600 hover:text-charcoal-900 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw className="w-4 h-4" /> Regenerate
            </button>

            {/* Send to Branded Posts - only in food_photo mode */}
            {mode === 'food_photo' && onSendToBrandedPosts && (
              <button
                onClick={onSendToBrandedPosts}
                disabled={disabled}
                className="text-sm text-bronze-700 hover:text-bronze-800 inline-flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                <Wand2 className="w-4 h-4" /> Turn into branded post
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default PreviewPanel
