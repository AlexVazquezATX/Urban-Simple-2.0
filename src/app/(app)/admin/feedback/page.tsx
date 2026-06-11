'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Star,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface FeedbackItem {
  id: string
  rating: number
  category: string
  message: string
  createdAt: string
  user: { firstName: string; lastName: string; email: string }
  company: { name: string }
}

interface Stats {
  averageRating: number
  totalCount: number
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  bug: 'Bug Report',
  feature_request: 'Feature Request',
}

const CATEGORY_VARIANTS: Record<string, 'neutral' | 'teal' | 'coral'> = {
  general: 'neutral',
  bug: 'coral',
  feature_request: 'teal',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'size-4',
            star <= rating
              ? 'fill-gold-500 text-gold-500 dark:fill-gold-400 dark:text-gold-400'
              : 'text-border'
          )}
        />
      ))}
    </div>
  )
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadData()
  }, [filterCategory, page])

  async function loadData() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      params.set('page', page.toString())

      const res = await fetch(`/api/admin/feedback?${params}`)
      if (!res.ok) throw new Error('Failed to load')

      const data = await res.json()
      setFeedback(data.feedback)
      setStats(data.stats)
      setTotalPages(data.totalPages)
    } catch {
      toast.error('Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        kicker="STUDIO · BACKHAUS"
        title="Customer Feedback"
        subtitle="Review feedback from BackHaus users"
      />

      {/* KPI row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label="Total Feedback"
            icon={MessageSquare}
            value={stats.totalCount}
          />
          <StatCard
            label="Avg Rating"
            icon={Star}
            value={
              <span className="inline-flex items-center gap-2.5">
                {stats.averageRating}
                <StarRating rating={Math.round(stats.averageRating)} />
              </span>
            }
          />
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <Select
          value={filterCategory || 'all'}
          onValueChange={(value) => {
            setFilterCategory(value === 'all' ? '' : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="bug">Bug Reports</SelectItem>
            <SelectItem value="feature_request">Feature Requests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : feedback.length > 0 ? (
        <div className="space-y-3">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="rounded-[14px] border border-border bg-card p-4 shadow-soft dark:shadow-none"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <StarRating rating={item.rating} />
                    <Badge variant={CATEGORY_VARIANTS[item.category] || 'neutral'}>
                      {CATEGORY_LABELS[item.category] || item.category}
                    </Badge>
                  </div>
                  <p className="mb-3 whitespace-pre-wrap font-display text-[15px] leading-relaxed tracking-[-0.1px] text-foreground">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">
                      {item.user.firstName} {item.user.lastName}
                    </span>
                    <span>{item.user.email}</span>
                    <span>{item.company.name}</span>
                  </div>
                </div>
                <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[14px] border border-border bg-card shadow-soft dark:shadow-none">
          <EmptyState
            icon={MessageSquare}
            title="No feedback yet"
            description="When BackHaus users leave ratings and notes, they'll land here."
            className="py-16"
          />
        </div>
      )}
    </div>
  )
}
