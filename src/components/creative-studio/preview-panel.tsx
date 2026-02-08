'use client'

import { useState } from 'react'
import { Download, RefreshCw, Save, Loader2, ImageIcon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
    <div className="bg-white rounded-sm border border-warm-200 overflow-hidden">
      {/* Preview Header */}
      <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
        <h2 className="text-sm font-medium text-warm-900">Preview</h2>
        {aspectRatio && (
          <span className="text-xs text-warm-500 bg-warm-100 px-2 py-0.5 rounded-sm">
            {aspectRatio}
          </span>
        )}
      </div>

      {/* Preview Area */}
      <div className="p-4">
        <div
          className="relative w-full bg-warm-100 rounded-sm overflow-hidden"
          style={{ paddingBottom: getAspectRatioPadding(aspectRatio) }}
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-lime-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-warm-700">Generating...</p>
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
              <div className="w-16 h-16 rounded-sm bg-warm-200 flex items-center justify-center mb-3">
                <ImageIcon className="w-7 h-7 text-warm-400" />
              </div>
              <p className="text-sm text-warm-500">Your generated image will appear here</p>
              <p className="text-xs text-warm-400 mt-1">Upload a photo and generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {imageBase64 && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-sm"
              onClick={onRegenerate}
              disabled={disabled || isGenerating}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Regenerate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-sm"
              onClick={handleDownload}
              disabled={disabled}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download
            </Button>
            <Button
              variant="lime"
              size="sm"
              className="flex-1 rounded-sm"
              onClick={onSave}
              disabled={disabled || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 mr-1.5" />
              )}
              Save
            </Button>
          </div>

          {/* Send to Branded Posts - only in food_photo mode */}
          {mode === 'food_photo' && onSendToBrandedPosts && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-sm border-plum-200 text-plum-700 hover:bg-plum-50 hover:border-plum-300"
              onClick={onSendToBrandedPosts}
              disabled={disabled}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Send to Branded Posts
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default PreviewPanel
