'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Clock, Flag, MessageSquare, CalendarX, CheckCircle2, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface AttentionItem {
  id: string
  type: 'overdue_invoice' | 'quality_issue' | 'prospect_reply' | 'unassigned_shift'
  title: string
  subtitle: string
  urgency: 'high' | 'medium' | 'low'
  actionUrl: string
  createdAt: string
}

type Tone = 'coral' | 'gold' | 'teal'

const typeConfig: Record<AttentionItem['type'], { icon: LucideIcon; tone: Tone; cta: string }> = {
  quality_issue: { icon: Flag, tone: 'coral', cta: 'Review' },
  overdue_invoice: { icon: Clock, tone: 'gold', cta: 'Nudge' },
  unassigned_shift: { icon: CalendarX, tone: 'coral', cta: 'Assign' },
  prospect_reply: { icon: MessageSquare, tone: 'teal', cta: 'Reply' },
}

const toneTile: Record<Tone, string> = {
  coral: 'bg-coral-600/10 dark:bg-coral-300/12',
  gold: 'bg-gold-600/10 dark:bg-gold-400/12',
  teal: 'bg-teal-600/10 dark:bg-teal-300/12',
}

const toneText: Record<Tone, string> = {
  coral: 'text-coral-600 dark:text-coral-300',
  gold: 'text-gold-600 dark:text-gold-400',
  teal: 'text-teal-600 dark:text-teal-300',
}

const MAX_VISIBLE = 6

export function NeedsAttention() {
  const [items, setItems] = useState<AttentionItem[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/command/attention')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch attention items:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    const interval = setInterval(fetchItems, 15000)
    return () => clearInterval(interval)
  }, [fetchItems])

  const visibleItems = items.filter(item => !dismissed.has(item.id))
  const shownItems = visibleItems.slice(0, MAX_VISIBLE)
  const overflow = visibleItems.length - shownItems.length

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id))
  }

  return (
    <Card className="gap-0 py-5">
      <CardHeader className="px-5 pb-1">
        <div className="flex items-center gap-2.5">
          <Bell className="size-[15px] shrink-0 text-coral-600 dark:text-coral-300" />
          <CardTitle className="text-[16px]">Needs attention</CardTitle>
          <span className="flex-1" />
          {!loading && visibleItems.length > 0 && (
            <Badge variant="coral">{visibleItems.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5">
        {loading ? (
          <div className="flex items-center justify-center py-5 text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />
            Loading...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="flex flex-col items-center py-5 text-center">
            <CheckCircle2 className="size-5 text-green-600 dark:text-green-300" />
            <p className="mt-2 text-[13px] font-medium text-foreground">
              All clear — nothing needs you right now.
            </p>
          </div>
        ) : (
          <>
            {shownItems.map(item => {
              const config = typeConfig[item.type]
              const Icon = config.icon
              const tone: Tone = item.urgency === 'high' ? 'coral' : config.tone

              return (
                <div
                  key={item.id}
                  className="group flex items-center gap-3 border-b border-border/60 py-3 last:border-0"
                >
                  <div
                    className={cn(
                      'grid size-[30px] shrink-0 place-items-center rounded-[9px]',
                      toneTile[tone]
                    )}
                  >
                    <Icon className={cn('size-3.5', toneText[tone])} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold leading-tight text-foreground">
                      {item.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {item.subtitle}
                    </div>
                  </div>
                  <Link
                    href={item.actionUrl}
                    className={cn(
                      'shrink-0 text-xs font-semibold transition-opacity hover:opacity-80',
                      toneText[tone]
                    )}
                  >
                    {config.cta}
                  </Link>
                  <button
                    onClick={() => handleDismiss(item.id)}
                    aria-label="Dismiss"
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )
            })}
            {overflow > 0 ? (
              <div className="pt-3 text-center text-xs text-muted-foreground">
                +{overflow} more in the queue
              </div>
            ) : (
              <div className="pt-3 text-center text-xs text-muted-foreground">
                That&apos;s everything — nice and tidy.
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
