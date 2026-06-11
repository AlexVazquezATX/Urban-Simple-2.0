'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DollarSign, AlertTriangle, MessageSquare, Calendar, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface AttentionItem {
  id: string
  type: 'overdue_invoice' | 'quality_issue' | 'prospect_reply' | 'unassigned_shift'
  title: string
  subtitle: string
  urgency: 'high' | 'medium' | 'low'
  actionUrl: string
  createdAt: string
}

const typeConfig = {
  overdue_invoice: { icon: DollarSign, label: 'Invoice', color: 'text-gold-600 dark:text-gold-400' },
  quality_issue: { icon: AlertTriangle, label: 'Quality', color: 'text-coral-600 dark:text-coral-300' },
  prospect_reply: { icon: MessageSquare, label: 'Reply', color: 'text-teal-600 dark:text-teal-300' },
  unassigned_shift: { icon: Calendar, label: 'Shift', color: 'text-muted-foreground' },
}

const urgencyVariant: Record<AttentionItem['urgency'], 'coral' | 'gold' | 'neutral'> = {
  high: 'coral',
  medium: 'gold',
  low: 'neutral',
}

export function NeedsAttentionQueue() {
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

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set(prev).add(id))
  }

  return (
    <Card className="gap-4">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle>Needs Attention</CardTitle>
          {!loading && (
            <Badge variant={visibleItems.length === 0 ? 'green' : 'neutral'}>
              {visibleItems.length === 0 ? 'All clear' : `${visibleItems.length} items`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" />
            Loading...
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Inbox zero — nice work"
            description="Nothing needs your attention right now."
            className="py-6"
          />
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto">
            {visibleItems.map((item) => {
              const config = typeConfig[item.type]
              const Icon = config.icon

              return (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 rounded-[12px] border border-border p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className={cn('mt-0.5 shrink-0', config.color)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.subtitle}</p>
                      </div>
                      <Badge variant={urgencyVariant[item.urgency]} className="shrink-0">
                        {item.urgency}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                        <Link href={item.actionUrl}>View</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                        onClick={() => handleDismiss(item.id)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
