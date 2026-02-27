'use client'

import { Download, RefreshCw, Save, Loader2, ImageIcon, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PreviewPanelProps {
  imageBase64?: string | null
  aspectRatio?: string
  isGenerating?: boolean
  onRegenerate?: () => void
  onSave?: () => void
  isSaving?: boolean
  disabled?: boolean
}

export function ContentPreviewPanel({
  imageBase64,
  aspectRatio = '1:1',
  isGenerating = false,
  onRegenerate,
  onSave,
  isSaving = false,
  disabled = false,
}: PreviewPanelProps) {
  const getAspectRatioPadding = (ratio: string): string => {
    const [w, h] = ratio.split(':').map(Number)
    if (!w || !h) return '100%'
    return `${(h / w) * 100}%`
  }

  const handleDownload = () => {
    if (!imageBase64) return
    const link = document.createElement('a')
    link.href = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`
    link.download = `creative-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-white rounded-sm border border-warm-200 overflow-hidden sticky top-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-warm-200 flex items-center justify-between">
        <h2 className="text-sm font-medium text-warm-900">Preview</h2>
        {imageBase64 && aspectRatio && (
          <span className="text-xs text-warm-500 bg-warm-100 px-2 py-0.5 rounded-sm">
            {aspectRatio}
          </span>
        )}
      </div>

      {/* Image Area */}
      <div className="p-4">
        <div
          className="relative w-full bg-warm-100 rounded-sm overflow-hidden"
          style={{ paddingBottom: getAspectRatioPadding(aspectRatio) }}
        >
          {isGenerating ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-lime-600 animate-spin" />
                <Sparkles className="w-4 h-4 text-lime-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-warm-700 mt-4">Creating your image...</p>
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
              <p className="text-sm text-warm-500">Your creation will appear here</p>
              <p className="text-xs text-warm-400 mt-1">Write a prompt and hit Generate</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {imageBase64 && (
        <div className="px-4 pb-4">
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
        </div>
      )}
    </div>
  )
}
