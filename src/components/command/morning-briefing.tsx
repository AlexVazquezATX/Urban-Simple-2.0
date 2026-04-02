'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

const categoryColors: Record<string, string> = {
  tech: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  business: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  local: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  industry: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800',
  personal: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
  general: 'bg-warm-50 text-warm-700 border-warm-200 dark:bg-charcoal-800 dark:text-cream-300 dark:border-charcoal-700',
}

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
      <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-ocean-400 bg-ocean-50/20 dark:bg-ocean-950/20">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-ocean-500" />
            <div>
              <p className="text-sm font-medium text-warm-800 dark:text-cream-200">No briefing yet today</p>
              <p className="text-xs text-warm-500 dark:text-cream-400">Generate your AI morning briefing</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="gap-1.5"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {generating ? 'Generating...' : 'Generate'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900 border-l-4 border-l-ocean-400">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-ocean-500" />
            <CardTitle className="text-sm font-medium text-warm-800 dark:text-cream-200">
              Today&apos;s Briefing
            </CardTitle>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-ocean-200 text-ocean-600 dark:border-ocean-700 dark:text-ocean-400">
              {localBriefing.items.length} items
            </Badge>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-warm-400 dark:text-cream-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-warm-400 dark:text-cream-500" />
          )}
        </div>
        {localBriefing.summary && !expanded && (
          <p className="text-xs text-warm-500 dark:text-cream-400 mt-1 line-clamp-1">{localBriefing.summary}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {localBriefing.summary && (
            <p className="text-sm text-warm-600 dark:text-cream-300 italic">{localBriefing.summary}</p>
          )}
          <div className="space-y-2">
            {localBriefing.items.slice(0, 5).map((item) => {
              const cat = item.topic?.category || item.category || 'general'
              return (
                <div key={item.id} className="flex gap-3 p-2 rounded-sm bg-warm-50/50 dark:bg-charcoal-800/50">
                  <Badge
                    variant="outline"
                    className={cn('text-[10px] px-1.5 py-0 shrink-0 mt-0.5', categoryColors[cat] || categoryColors.general)}
                  >
                    {item.topic?.name || cat}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-warm-800 dark:text-cream-200">{item.title}</p>
                    <p className="text-xs text-warm-500 dark:text-cream-400 line-clamp-2 mt-0.5">{item.summary}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
