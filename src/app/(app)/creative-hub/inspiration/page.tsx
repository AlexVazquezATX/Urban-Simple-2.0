'use client'

import { useState, useEffect } from 'react'
import {
  Sun,
  Moon,
  RefreshCw,
  Sparkles,
  MapPin,
  TrendingUp,
  Calendar,
  Check,
  X,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopicCard } from '@/components/creative-hub/inspiration/topic-card'
import { QuickPostSheet } from '@/components/creative-hub/inspiration/quick-post-sheet'
import type { InspirationCategory, InspirationStatus } from '@prisma/client'

interface Topic {
  id: string
  title: string
  summary: string
  context?: string
  category: InspirationCategory
  subcategory?: string
  sourceUrl?: string
  sourceName?: string
  postIdeas: object[]
  suggestedHooks: string[]
  relatedHashtags: string[]
  relevanceScore: number
  trendingScore?: number
  status: InspirationStatus
  expiresAt?: string
}

interface Briefing {
  id: string
  forDate: string
  status: string
  headline?: string
  greeting?: string
  summary?: string
  totalDiscovered: number
  totalApproved: number
}

const CATEGORY_CONFIG = {
  AUSTIN_LOCAL: {
    label: 'Austin Local',
    icon: MapPin,
    gradient: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  POP_CULTURE: {
    label: 'Pop Culture',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  SEASONAL: {
    label: 'Seasonal',
    icon: Calendar,
    gradient: 'from-teal-500 to-cyan-500',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
  },
}

type CategoryFilter = 'ALL' | InspirationCategory

export default function DailyInspirationPage() {
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    loadBriefing()
  }, [])

  async function loadBriefing() {
    try {
      setLoading(true)
      const response = await fetch('/api/creative-hub/inspiration')
      const data = await response.json()
      setBriefing(data.briefing)
      setTopics(data.topics || [])
    } catch (error) {
      console.error('Failed to load briefing:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateTopics() {
    try {
      setGenerating(true)
      setError(null)
      const response = await fetch('/api/creative-hub/inspiration', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || data.details || 'Failed to generate topics')
        return
      }

      if (data.success && data.briefing) {
        setBriefing(data.briefing)
        setTopics(data.briefing.topics || [])
      } else if (data.errors && data.errors.length > 0) {
        setError(data.errors.join(', '))
      } else if (!data.success) {
        setError('No topics were generated. The AI may not have found relevant content.')
      }
    } catch (err) {
      console.error('Failed to generate topics:', err)
      setError('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleApprove(topicId: string) {
    try {
      const response = await fetch(`/api/creative-hub/inspiration/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await response.json()

      if (data.topic) {
        setTopics((prev) =>
          prev.map((t) => (t.id === topicId ? data.topic : t))
        )
      }
    } catch (error) {
      console.error('Failed to approve topic:', error)
    }
  }

  async function handleReject(topicId: string) {
    try {
      const response = await fetch(`/api/creative-hub/inspiration/topics/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
      const data = await response.json()

      if (data.topic) {
        setTopics((prev) =>
          prev.map((t) => (t.id === topicId ? data.topic : t))
        )
      }
    } catch (error) {
      console.error('Failed to reject topic:', error)
    }
  }

  function handleTopicClick(topic: Topic) {
    setSelectedTopic(topic)
    setSheetOpen(true)
  }

  // Filter topics
  const filteredTopics = topics.filter((topic) => {
    if (selectedCategory === 'ALL') return true
    return topic.category === selectedCategory
  })

  const approvedTopics = filteredTopics.filter((t) => t.status === 'APPROVED')
  const pendingTopics = filteredTopics.filter((t) => t.status === 'PENDING')

  // Get time-based greeting
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const TimeIcon = hour < 17 ? Sun : Moon

  // Category counts
  const categoryCounts = {
    ALL: topics.length,
    AUSTIN_LOCAL: topics.filter((t) => t.category === 'AUSTIN_LOCAL').length,
    POP_CULTURE: topics.filter((t) => t.category === 'POP_CULTURE').length,
    SEASONAL: topics.filter((t) => t.category === 'SEASONAL').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 animate-spin text-ocean-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <TimeIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-charcoal-500">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-charcoal-900">
              {briefing?.headline || `${timeGreeting}!`}
            </h1>
            <p className="text-charcoal-500 mt-1">
              {briefing?.greeting ||
                (topics.length > 0
                  ? `${topics.length} topics ready to inspire your content today`
                  : 'Click refresh to discover trending topics')}
            </p>
          </div>

          <Button
            onClick={generateTopics}
            disabled={generating}
            className="bg-charcoal-900 hover:bg-charcoal-800 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Topics
              </>
            )}
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 border-b border-charcoal-100 pb-4">
          {(['ALL', 'AUSTIN_LOCAL', 'POP_CULTURE', 'SEASONAL'] as const).map((cat) => {
            const isActive = selectedCategory === cat
            const config = cat === 'ALL' ? null : CATEGORY_CONFIG[cat]
            const Icon = config?.icon || Sparkles

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-charcoal-900 text-white'
                    : 'bg-charcoal-50 text-charcoal-600 hover:bg-charcoal-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat === 'ALL' ? 'All' : config?.label}
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    isActive ? 'bg-white/20' : 'bg-charcoal-200'
                  }`}
                >
                  {categoryCounts[cat]}
                </span>
              </button>
            )
          })}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Failed to generate topics</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {topics.length === 0 && !generating && !error && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-charcoal-900 mb-2">
              No topics yet for today
            </h2>
            <p className="text-charcoal-500 mb-6 max-w-md mx-auto">
              Click &quot;Refresh Topics&quot; to discover trending Austin news, pop culture moments,
              and seasonal content ideas.
            </p>
            <Button
              onClick={generateTopics}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              Discover Today&apos;s Topics
            </Button>
          </div>
        )}

        {/* Pending Approval Section */}
        {pendingTopics.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
            <div className="px-5 py-3 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-medium text-charcoal-900">
                  {pendingTopics.length} topics need your review
                </span>
              </div>
            </div>
            <div className="divide-y divide-amber-100">
              {pendingTopics.slice(0, 5).map((topic) => {
                const config = CATEGORY_CONFIG[topic.category]
                const Icon = config.icon

                return (
                  <div
                    key={topic.id}
                    className="px-5 py-3 flex items-center gap-4 hover:bg-amber-50 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-charcoal-900 truncate">
                        {topic.title}
                      </p>
                      <p className="text-sm text-charcoal-500 truncate">
                        {topic.summary}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(topic.id)}
                        className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(topic.id)}
                        className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTopicClick(topic)}
                        className="w-8 h-8 rounded-full bg-charcoal-100 hover:bg-charcoal-200 flex items-center justify-center text-charcoal-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Approved Topics Grid */}
        {approvedTopics.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-charcoal-900 mb-4">
              Ready to Create
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {approvedTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onClick={() => handleTopicClick(topic)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Generating State */}
        {generating && (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-ocean-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-charcoal-900 mb-2">
              Discovering topics...
            </h2>
            <p className="text-charcoal-500 max-w-md mx-auto">
              AI is searching Austin news, trending topics, and seasonal events to find
              inspiring content ideas.
            </p>
          </div>
        )}
      </div>

      {/* Quick Post Sheet */}
      <QuickPostSheet
        topic={selectedTopic}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  )
}
