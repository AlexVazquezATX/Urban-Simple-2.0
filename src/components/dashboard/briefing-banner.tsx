'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface BriefingItem {
  id: string
  title: string
  summary: string
  category: string | null
  topic: { id: string; name: string; category: string } | null
}

interface BriefingBannerProps {
  briefing: {
    id: string
    summary: string | null
    items: BriefingItem[]
  } | null
  topicsCount: number
  userName: string
}

/**
 * Gold-tinted briefing banner — spark tile, bold title + count chip, and a
 * single-line digest. "Read briefing" expands the full item list in place.
 */
export function BriefingBanner({ briefing, topicsCount }: BriefingBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [localBriefing, setLocalBriefing] = useState(briefing)

  const handleGenerate = async () => {
    if (topicsCount === 0) {
      toast.error('Add topics in Settings > Pulse first')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/admin/pulse/briefings/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate: false }),
      })

      if (res.ok) {
        const data = await res.json()
        setLocalBriefing(data.briefing)
        setExpanded(true)
        toast.success('Briefing generated')
      } else {
        toast.error('Failed to generate briefing')
      }
    } catch {
      toast.error('Failed to generate briefing')
    } finally {
      setGenerating(false)
    }
  }

  const bannerClass =
    'rounded-[14px] border border-gold-600/30 bg-card bg-gradient-to-r from-gold-600/10 to-transparent to-55% shadow-soft dark:border-gold-400/25 dark:from-gold-400/12 dark:shadow-none'

  if (!localBriefing) {
    return (
      <div className={bannerClass}>
        <div className="flex items-center gap-[18px] px-5 py-4">
          <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
            <Sparkles className="size-[17px] text-gold-600 dark:text-gold-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-bold text-foreground">No briefing yet today</div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              Generate your AI morning briefing from your Pulse topics.
            </div>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    )
  }

  const digest =
    localBriefing.summary ||
    localBriefing.items.slice(0, 2).map(item => item.title).join(' · ') ||
    'Your briefing is ready.'

  return (
    <div className={bannerClass}>
      <div className="flex items-center gap-[18px] px-5 py-4">
        <div className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-gold-600/10 dark:bg-gold-400/12">
          <Sparkles className="size-[17px] text-gold-600 dark:text-gold-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold text-foreground">Today&apos;s briefing</span>
            <Badge variant="gold">{localBriefing.items.length} items</Badge>
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{digest}</div>
        </div>
        <Button variant="outline" className="shrink-0" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Close' : 'Read briefing'}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-gold-600/20 px-5 py-4 dark:border-gold-400/20">
          {localBriefing.summary && (
            <p className="text-sm italic text-muted-foreground">{localBriefing.summary}</p>
          )}
          {localBriefing.items.slice(0, 5).map(item => (
            <div key={item.id} className="flex gap-3 rounded-[10px] bg-secondary/50 p-2.5">
              <Badge variant="neutral" className="mt-0.5 shrink-0">
                {item.topic?.name || item.category || 'general'}
              </Badge>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
