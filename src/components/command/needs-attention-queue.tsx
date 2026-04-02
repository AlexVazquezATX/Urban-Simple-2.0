'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, AlertTriangle, MessageSquare, Calendar, CheckCircle, Inbox, Loader2 } from 'lucide-react'
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
  overdue_invoice: { icon: DollarSign, label: 'Invoice', color: 'text-amber-600 dark:text-amber-400' },
  quality_issue: { icon: AlertTriangle, label: 'Quality', color: 'text-red-500 dark:text-red-400' },
  prospect_reply: { icon: MessageSquare, label: 'Reply', color: 'text-ocean-600 dark:text-ocean-400' },
  unassigned_shift: { icon: Calendar, label: 'Shift', color: 'text-purple-600 dark:text-purple-400' },
}

const urgencyBadge = {
  high: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  low: 'bg-warm-50 text-warm-600 border-warm-200 dark:bg-charcoal-800 dark:text-cream-400 dark:border-charcoal-700',
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
    <Card className="rounded-sm border-warm-200 dark:border-charcoal-700 dark:bg-charcoal-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-medium text-warm-900 dark:text-cream-100">
            Needs Attention
          </CardTitle>
          {!loading && (
            <Badge variant="outline" className={cn(
              'text-xs',
              visibleItems.length === 0 ? 'border-lime-300 text-lime-700 dark:border-lime-700 dark:text-lime-400' : 'border-warm-300 text-warm-600 dark:border-charcoal-600 dark:text-cream-400'
            )}>
              {visibleItems.length === 0 ? 'All clear' : `${visibleItems.length} items`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4 text-warm-400 dark:text-cream-500">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-4 text-warm-400 dark:text-cream-500">
            <CheckCircle className="h-6 w-6 mx-auto mb-1.5 text-lime-400 dark:text-lime-500" />
            <p className="text-sm font-medium text-lime-600 dark:text-lime-400">Inbox zero</p>
            <p className="text-xs text-warm-400 dark:text-cream-500 mt-1">Nothing needs your attention right now</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {visibleItems.map((item) => {
              const config = typeConfig[item.type]
              const Icon = config.icon

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-sm border border-warm-200 dark:border-charcoal-700 hover:border-warm-300 dark:hover:border-charcoal-600 transition-colors group"
                >
                  <div className={cn('mt-0.5 shrink-0', config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-warm-800 dark:text-cream-200 truncate">{item.title}</p>
                        <p className="text-xs text-warm-500 dark:text-cream-400 mt-0.5">{item.subtitle}</p>
                      </div>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 shrink-0', urgencyBadge[item.urgency])}>
                        {item.urgency}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Link href={item.actionUrl}>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-2 text-warm-400 hover:text-warm-600 dark:text-cream-500 dark:hover:text-cream-300 opacity-0 group-hover:opacity-100 transition-opacity"
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
