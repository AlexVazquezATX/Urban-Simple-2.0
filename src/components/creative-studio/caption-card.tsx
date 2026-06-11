'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check, RefreshCw, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
    <div className="rounded-[14px] border border-border bg-card p-4 shadow-soft dark:shadow-none">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="grid size-7 place-items-center rounded-[8px] border border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
          <Sparkles className="size-3.5 text-gold-600 dark:text-gold-400" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {loading ? 'Writing caption…' : 'Caption ready'}
        </p>
        <Badge variant="gold" className="px-1.5 py-px text-[9px] uppercase">
          New
        </Badge>

        <div className="ml-auto flex items-center gap-3">
          {!loading && (caption || error) && (
            <button
              onClick={onRegenerate}
              disabled={disabled}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              title="Rewrite"
            >
              <RefreshCw className="size-3.5" />
            </button>
          )}
          {!loading && caption && (
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs font-medium text-gold-600 transition-colors hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-gold-600 dark:text-gold-400" />
          Crafting a ready-to-post caption…
        </div>
      ) : error ? (
        <div className="text-sm text-muted-foreground">
          Couldn&apos;t write a caption.{' '}
          <button
            onClick={onRegenerate}
            className="font-medium text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300"
          >
            Try again
          </button>
        </div>
      ) : caption ? (
        <>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{caption}</p>
          {hashtagLine && (
            <p className={cn('mt-2 break-words text-xs text-gold-600 dark:text-gold-400')}>
              {hashtagLine}
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}

export default CaptionCard
