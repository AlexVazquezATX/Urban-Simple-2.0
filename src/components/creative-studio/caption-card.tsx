'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check, RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CaptionCardProps {
  loading: boolean
  caption: string
  hashtags: string[]
  error?: string | null
  onRegenerate: () => void
  disabled?: boolean
}

/**
 * Caption Writer card — shown under the preview after a generation.
 * Displays a ready-to-post caption + hashtags with one-tap copy.
 */
export function CaptionCard({
  loading,
  caption,
  hashtags,
  error,
  onRegenerate,
  disabled,
}: CaptionCardProps) {
  const [copied, setCopied] = useState(false)

  const hashtagLine = hashtags.map((h) => `#${h}`).join(' ')
  const fullText = hashtagLine ? `${caption}\n\n${hashtagLine}` : caption

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard can fail in some browsers/contexts; silently ignore.
    }
  }

  return (
    <div className="rounded-2xl bg-white border border-cream-300/70 shadow-soft p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-honey-100 border border-honey-200 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-honey-700" />
        </div>
        <p className="text-sm font-semibold text-charcoal-900">
          {loading ? 'Writing caption…' : 'Caption ready'}
        </p>
        <span className="text-[9px] uppercase tracking-wide font-bold text-honey-700 bg-honey-100 border border-honey-200 rounded-full px-1.5 py-px">
          New
        </span>

        <div className="ml-auto flex items-center gap-3">
          {!loading && (caption || error) && (
            <button
              onClick={onRegenerate}
              disabled={disabled}
              className="text-xs text-warm-500 hover:text-charcoal-800 inline-flex items-center gap-1 transition-colors disabled:opacity-50"
              title="Rewrite"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {!loading && caption && (
            <button
              onClick={handleCopy}
              className="text-xs text-bronze-700 font-medium inline-flex items-center gap-1 hover:text-bronze-800 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-warm-500 py-1">
          <Loader2 className="w-4 h-4 animate-spin text-bronze-500" />
          Crafting a ready-to-post caption…
        </div>
      ) : error ? (
        <div className="text-sm text-warm-500">
          Couldn&apos;t write a caption.{' '}
          <button onClick={onRegenerate} className="text-bronze-700 font-medium hover:text-bronze-800">
            Try again
          </button>
        </div>
      ) : caption ? (
        <>
          <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-line">{caption}</p>
          {hashtagLine && <p className={cn('text-xs text-bronze-600 mt-2 break-words')}>{hashtagLine}</p>}
        </>
      ) : null}
    </div>
  )
}

export default CaptionCard
