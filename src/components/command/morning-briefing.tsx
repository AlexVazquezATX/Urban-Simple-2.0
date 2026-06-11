'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface BriefingItem {
  id: string
  title: string
  summary: string
  category: string | null
  topic: { id: string; name: string; category: string } | null
}

interface MorningBriefingProps {
  briefing: {
    id: string
    summary: string | null
    items: BriefingItem[]
  } | null
  topicsCount: number
  userName: string
}

const bannerClass =
  'rounded-[14px] border border-gold-600/30 bg-gradient-to-br from-gold-600/10 to-transparent dark:border-gold-400/25 dark:from-gold-400/12'

export function MorningBriefing({ briefing, topicsCount, userName }: MorningBriefingProps) {
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

  if (!localBriefing) {
    return (
      <div className={cn(bannerClass, 'flex items-center justify-between gap-4 px-5 py-4')}>
        <div className="flex items-center gap-3">
          <Sparkles className="size-5 shrink-0 text-gold-600 dark:text-gold-400" />
          <div>
            <p className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
              No briefing yet today, {userName}
            </p>
            <p className="text-xs text-muted-foreground">Generate your AI morning briefing</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="gap-1.5"
        >
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {generating ? 'Generating...' : 'Generate'}
        </Button>
      </div>
    )
  }

  return (
    <div className={bannerClass}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Sparkles className="size-4 shrink-0 text-gold-600 dark:text-gold-400" />
          <span className="font-display text-[15px] font-bold tracking-[-0.2px] text-foreground">
            Today&apos;s briefing
          </span>
          <Badge variant="gold" className="font-mono tabular-nums">
            {localBriefing.items.length} items
          </Badge>
          {localBriefing.summary && !expanded && (
            <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
              {localBriefing.summary}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 px-5 pb-5">
          {localBriefing.summary && (
            <p className="text-sm italic text-muted-foreground">{localBriefing.summary}</p>
          )}
          <div className="space-y-2">
            {localBriefing.items.slice(0, 5).map((item) => {
              const cat = item.topic?.category || item.category || 'general'
              return (
                <div
                  key={item.id}
                  className="flex gap-3 rounded-[10px] border border-border bg-card p-3"
                >
                  <Badge variant="neutral" className="mt-0.5 shrink-0">
                    {item.topic?.name || cat}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.summary}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
