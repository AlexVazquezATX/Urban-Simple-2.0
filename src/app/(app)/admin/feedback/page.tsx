'use client'

import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Star,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-warm-100 text-warm-700',
  bug: 'bg-red-100 text-red-700',
  feature_request: 'bg-blue-100 text-blue-700',
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-4 h-4',
            star <= rating
              ? 'fill-amber-400 text-amber-400'
              : 'text-warm-200'
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
    <div className="min-h-screen bg-warm-50">
      {/* Header */}
      <div className="border-b border-warm-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-sm">
              <MessageSquare className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h1 className="text-lg font-display font-medium text-warm-900">
                Customer Feedback
              </h1>
              <p className="text-sm text-warm-500">
                Review feedback from BackHaus users
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 text-warm-500 text-xs mb-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Total Feedback
              </div>
              <p className="text-2xl font-display font-medium text-warm-900">
                {stats.totalCount}
              </p>
            </div>

            <div className="bg-white rounded-sm border border-warm-200 p-4">
              <div className="flex items-center gap-2 text-warm-500 text-xs mb-1">
                <Star className="w-3.5 h-3.5" />
                Avg Rating
              </div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-display font-medium text-warm-900">
                  {stats.averageRating}
                </p>
                <StarRating rating={Math.round(stats.averageRating)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-warm-500" />
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
            className="px-3 py-2 text-sm rounded-sm border border-warm-300 bg-white"
          >
            <option value="">All Categories</option>
            <option value="general">General</option>
            <option value="bug">Bug Reports</option>
            <option value="feature_request">Feature Requests</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-warm-400" />
          </div>
        ) : feedback.length > 0 ? (
          <div className="space-y-3">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-sm border border-warm-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <StarRating rating={item.rating} />
                      <Badge
                        className={cn(
                          'text-xs rounded-sm',
                          CATEGORY_COLORS[item.category] || CATEGORY_COLORS.general
                        )}
                      >
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-warm-900 whitespace-pre-wrap mb-3">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-warm-500">
                      <span className="font-medium">
                        {item.user.firstName} {item.user.lastName}
                      </span>
                      <span>{item.user.email}</span>
                      <span>{item.company.name}</span>
                    </div>
                  </div>
                  <p className="text-xs text-warm-400 shrink-0">
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
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-warm-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-sm border border-warm-200">
            <div className="w-16 h-16 rounded-sm bg-warm-100 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-warm-400" />
            </div>
            <h3 className="text-sm font-medium text-warm-900 mb-1">
              No feedback yet
            </h3>
            <p className="text-sm text-warm-500">
              Feedback from BackHaus users will appear here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
