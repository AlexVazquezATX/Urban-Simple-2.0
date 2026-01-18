'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  ChevronDown,
  Loader2,
  Zap,
  Settings2,
  Heart,
  Megaphone,
  Building2,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  ExternalLink,
  Hash,
  ArrowRight,
  ImageIcon,
  CheckSquare,
  Square,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { InspirationCategory, InspirationStatus } from '@prisma/client'

// Content mode types
type ContentModeId = 'community' | 'hybrid' | 'promotional'

const CONTENT_MODES = {
  community: {
    id: 'community',
    name: 'Community',
    description: 'Pure Austin content - no business pitch',
    icon: Heart,
    color: 'from-rose-500 to-pink-500',
    detail: 'NO cleaning mentions, NO CTAs, NO sales pitch. Just celebrating Austin.',
  },
  hybrid: {
    id: 'hybrid',
    name: 'Soft Brand',
    description: 'Community-focused with subtle presence',
    icon: Building2,
    color: 'from-amber-500 to-orange-500',
    detail: 'May mention hospitality industry, but no hard sell.',
  },
  promotional: {
    id: 'promotional',
    name: 'Promotional',
    description: 'Standard marketing with CTAs',
    icon: Megaphone,
    color: 'from-blue-500 to-indigo-500',
    detail: 'Service highlights, cleaning angles, and calls-to-action.',
  },
} as const

interface PostIdea {
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter'
  angle: string
  headline: string
  hook: string
  hashtags: string[]
}

interface Topic {
  id: string
  title: string
  summary: string
  context?: string
  category: InspirationCategory
  subcategory?: string
  sourceUrl?: string
  sourceName?: string
  postIdeas: PostIdea[]
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

const PLATFORM_CONFIG = {
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    activeBg: 'bg-pink-500',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    activeBg: 'bg-blue-500',
  },
  facebook: {
    icon: Facebook,
    label: 'Facebook',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    activeBg: 'bg-indigo-500',
  },
  twitter: {
    icon: Twitter,
    label: 'X',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    activeBg: 'bg-sky-500',
  },
}

type CategoryFilter = 'ALL' | InspirationCategory
type PlatformKey = keyof typeof PLATFORM_CONFIG

export default function DailyInspirationPage() {
  const router = useRouter()
  const [briefing, setBriefing] = useState<Briefing | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>('instagram')
  const [contentMode, setContentMode] = useState<ContentModeId>('community')
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [pendingExpanded, setPendingExpanded] = useState(true)
  const [pendingLimit, setPendingLimit] = useState(5)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [ideas, setIdeas] = useState<PostIdea[]>([])

  // Multi-select state for batch creation
  const [selectedTopicIds, setSelectedTopicIds] = useState<Set<string>>(new Set())
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Define loadTopicIdeas before useEffect that uses it
  const loadTopicIdeas = useCallback(async (topic: Topic) => {
    // Check if topic already has cached ideas
    if (topic.postIdeas && topic.postIdeas.length > 0) {
      setIdeas(topic.postIdeas as PostIdea[])
      return
    }

    try {
      setLoadingIdeas(true)
      const response = await fetch(
        `/api/creative-hub/inspiration/topics/${topic.id}/quick-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentMode }),
        }
      )
      const data = await response.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Failed to load ideas:', error)
      setIdeas([])
    } finally {
      setLoadingIdeas(false)
    }
  }, [contentMode])

  useEffect(() => {
    loadBriefing()
  }, [])

  // Load ideas when topic changes
  useEffect(() => {
    if (selectedTopic) {
      loadTopicIdeas(selectedTopic)
    }
  }, [selectedTopic, loadTopicIdeas])

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentMode }),
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

  async function regenerateIdeas() {
    if (!selectedTopic) return

    try {
      setLoadingIdeas(true)
      const response = await fetch(
        `/api/creative-hub/inspiration/topics/${selectedTopic.id}/quick-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regenerate: true, contentMode }),
        }
      )
      const data = await response.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Failed to regenerate ideas:', error)
    } finally {
      setLoadingIdeas(false)
    }
  }

  async function handleApprove(topicId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
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

  async function handleReject(topicId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
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
    setIdeas([])
  }

  function handleCreatePost(idea: PostIdea) {
    if (!selectedTopic) return

    // Store the complete idea data in sessionStorage for the create page
    const createData = {
      topicId: selectedTopic.id,
      topicTitle: selectedTopic.title,
      topicSummary: selectedTopic.summary,
      platform: idea.platform,
      headline: idea.headline,
      hook: idea.hook,
      angle: idea.angle,
      hashtags: idea.hashtags,
      contentMode,
    }
    sessionStorage.setItem('createFromInspiration', JSON.stringify(createData))

    router.push('/creative-hub/create')
  }

  function toggleTopicSelection(topicId: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setSelectedTopicIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(topicId)) {
        newSet.delete(topicId)
      } else {
        newSet.add(topicId)
      }
      return newSet
    })
  }

  function handleBatchCreate() {
    if (selectedTopicIds.size === 0) return

    // Get the selected topics in order
    const selectedTopics = approvedTopics.filter((t) => selectedTopicIds.has(t.id))

    // Build batch queue - each topic gets the first available idea
    const batchQueue = selectedTopics.map((topic) => {
      // Use cached post ideas or a placeholder
      const firstIdea = topic.postIdeas?.[0] as PostIdea | undefined

      return {
        topicId: topic.id,
        topicTitle: topic.title,
        topicSummary: topic.summary,
        platform: firstIdea?.platform || 'instagram',
        headline: firstIdea?.headline || '',
        hook: firstIdea?.hook || '',
        angle: firstIdea?.angle || '',
        hashtags: firstIdea?.hashtags || topic.relatedHashtags || [],
        contentMode,
      }
    })

    // Store the batch queue
    sessionStorage.setItem('createBatchQueue', JSON.stringify(batchQueue))
    sessionStorage.setItem('createBatchIndex', '0')

    // Store the first item as the current item
    sessionStorage.setItem('createFromInspiration', JSON.stringify(batchQueue[0]))

    // Clear selection and navigate
    setSelectedTopicIds(new Set())
    setIsSelectionMode(false)
    router.push('/creative-hub/create')
  }

  function clearSelection() {
    setSelectedTopicIds(new Set())
    setIsSelectionMode(false)
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

  // Get current idea for selected platform
  const currentIdea = ideas.find((i) => i.platform === selectedPlatform) || ideas[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-5 h-5 animate-spin text-ocean-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-charcoal-50">
      <div className="flex h-screen">
        {/* LEFT COLUMN - Topics List */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-charcoal-200 bg-white">
          {/* Header */}
          <div className="p-6 border-b border-charcoal-100">
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

              <div className="flex items-center gap-2">
                {/* Content Mode Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  className="border-charcoal-200"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  {CONTENT_MODES[contentMode].name}
                </Button>

                <Button
                  onClick={generateTopics}
                  disabled={generating}
                  size="sm"
                  className="bg-charcoal-900 hover:bg-charcoal-800 text-white"
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Content Mode Selector */}
            {showModeSelector && (
              <div className="mt-4 rounded-xl border border-charcoal-200 bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-charcoal-900">Content Mode</h3>
                  <button
                    onClick={() => setShowModeSelector(false)}
                    className="w-6 h-6 rounded-full hover:bg-charcoal-100 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(CONTENT_MODES) as ContentModeId[]).map((modeId) => {
                    const mode = CONTENT_MODES[modeId]
                    const Icon = mode.icon
                    const isSelected = contentMode === modeId

                    return (
                      <button
                        key={modeId}
                        onClick={() => {
                          setContentMode(modeId)
                          setShowModeSelector(false)
                        }}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? 'border-charcoal-900 bg-charcoal-50'
                            : 'border-charcoal-100 hover:border-charcoal-200'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg bg-gradient-to-br ${mode.color} flex items-center justify-center mb-2`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <p className="font-medium text-sm text-charcoal-900">{mode.name}</p>
                        <p className="text-xs text-charcoal-500 mt-0.5">{mode.description}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Category Tabs */}
            <div className="flex items-center gap-2 mt-4">
              {(['ALL', 'AUSTIN_LOCAL', 'POP_CULTURE', 'SEASONAL'] as const).map((cat) => {
                const isActive = selectedCategory === cat
                const config = cat === 'ALL' ? null : CATEGORY_CONFIG[cat]
                const Icon = config?.icon || Sparkles

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-charcoal-900 text-white'
                        : 'bg-charcoal-50 text-charcoal-600 hover:bg-charcoal-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
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
          </div>

          {/* Topics Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Error State */}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-orange-600" />
                </div>
                <h2 className="text-lg font-semibold text-charcoal-900 mb-2">
                  No topics yet for today
                </h2>
                <p className="text-charcoal-500 mb-6 max-w-sm mx-auto text-sm">
                  Click Refresh to discover trending Austin news, pop culture moments,
                  and seasonal content ideas.
                </p>
                <Button
                  onClick={generateTopics}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Discover Topics
                </Button>
              </div>
            )}

            {/* Generating State */}
            {generating && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-100 to-ocean-200 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-7 h-7 text-ocean-600 animate-spin" />
                </div>
                <h2 className="text-lg font-semibold text-charcoal-900 mb-2">
                  Discovering topics...
                </h2>
                <p className="text-charcoal-500 max-w-sm mx-auto text-sm">
                  AI is searching Austin news, trending topics, and seasonal events.
                </p>
              </div>
            )}

            {/* Pending Approval Section */}
            {pendingTopics.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
                <button
                  onClick={() => setPendingExpanded(!pendingExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-medium text-charcoal-900 text-sm">
                      {pendingTopics.length} topics need your review
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-charcoal-500 transition-transform ${
                      pendingExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {pendingExpanded && (
                  <div className="divide-y divide-amber-100">
                    {pendingTopics.slice(0, pendingLimit).map((topic) => {
                      const config = CATEGORY_CONFIG[topic.category]
                      const Icon = config.icon

                      return (
                        <div
                          key={topic.id}
                          onClick={() => handleTopicClick(topic)}
                          className={`px-4 py-3 flex items-center gap-3 hover:bg-amber-50 transition-colors cursor-pointer ${
                            selectedTopic?.id === topic.id ? 'bg-amber-100' : ''
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-charcoal-900 text-sm truncate">
                              {topic.title}
                            </p>
                            <p className="text-xs text-charcoal-500 truncate">
                              {topic.summary}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleApprove(topic.id, e)}
                              className="w-7 h-7 rounded-full bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleReject(topic.id, e)}
                              className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-charcoal-400" />
                          </div>
                        </div>
                      )
                    })}

                    {pendingTopics.length > pendingLimit && (
                      <button
                        onClick={() => setPendingLimit((prev) => prev + 10)}
                        className="w-full px-4 py-2 text-sm text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        Show {Math.min(10, pendingTopics.length - pendingLimit)} more
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Approved Topics Grid */}
            {approvedTopics.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-charcoal-900">
                    Ready to Create
                  </h2>
                  <div className="flex items-center gap-2">
                    {isSelectionMode && selectedTopicIds.size > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearSelection}
                        className="text-xs text-charcoal-500"
                      >
                        Clear ({selectedTopicIds.size})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isSelectionMode ? 'default' : 'outline'}
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode)
                        if (isSelectionMode) {
                          setSelectedTopicIds(new Set())
                        }
                      }}
                      className={isSelectionMode ? 'bg-ocean-600 hover:bg-ocean-700' : ''}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1.5" />
                      {isSelectionMode ? 'Done' : 'Select Multiple'}
                    </Button>
                  </div>
                </div>

                {/* Batch Create Bar */}
                {isSelectionMode && selectedTopicIds.size >= 2 && (
                  <div className="mb-3 px-4 py-3 bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <CheckSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {selectedTopicIds.size} topics selected
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleBatchCreate}
                      className="bg-white text-ocean-700 hover:bg-ocean-50"
                    >
                      Create All
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {approvedTopics.map((topic) => {
                    const config = CATEGORY_CONFIG[topic.category]
                    const Icon = config.icon
                    const isSelected = selectedTopic?.id === topic.id
                    const isChecked = selectedTopicIds.has(topic.id)

                    return (
                      <div
                        key={topic.id}
                        onClick={() => {
                          if (isSelectionMode) {
                            toggleTopicSelection(topic.id)
                          } else {
                            handleTopicClick(topic)
                          }
                        }}
                        className={`relative text-left rounded-xl border-2 p-4 transition-all cursor-pointer ${
                          isChecked
                            ? 'border-ocean-500 bg-ocean-50 ring-2 ring-ocean-200'
                            : isSelected
                            ? 'border-ocean-500 bg-ocean-50'
                            : 'border-charcoal-100 hover:border-charcoal-200 bg-white'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                          <button
                            onClick={(e) => toggleTopicSelection(topic.id, e)}
                            className={`absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-ocean-500 text-white'
                                : 'bg-charcoal-100 text-charcoal-400 hover:bg-charcoal-200'
                            }`}
                          >
                            {isChecked ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Square className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        <Badge
                          className={`${config.bg} ${config.text} border-0 mb-2`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <h3 className="font-semibold text-charcoal-900 text-sm line-clamp-2 mb-1 pr-6">
                          {topic.title}
                        </h3>
                        <p className="text-xs text-charcoal-500 line-clamp-2">
                          {topic.summary}
                        </p>
                        {topic.relatedHashtags && topic.relatedHashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {topic.relatedHashtags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs text-charcoal-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {topic.sourceName && (
                          <p className="text-xs text-charcoal-400 mt-2">
                            via {topic.sourceName}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Preview Panel */}
        <div className="w-[420px] flex flex-col bg-charcoal-50">
          {selectedTopic ? (
            <>
              {/* Topic Header */}
              <div className="p-5 bg-white border-b border-charcoal-100">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-ocean-500" />
                  <span className="text-xs font-medium text-ocean-600 uppercase tracking-wide">
                    Selected Topic
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-charcoal-900 line-clamp-2">
                  {selectedTopic.title}
                </h2>
                <p className="text-sm text-charcoal-600 mt-2">
                  {selectedTopic.summary}
                </p>
                {selectedTopic.sourceUrl && (
                  <a
                    href={selectedTopic.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-ocean-600 hover:text-ocean-700 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {selectedTopic.sourceName || 'View Source'}
                  </a>
                )}
              </div>

              {/* Platform Tabs */}
              <div className="px-5 pt-4 pb-2 bg-white border-b border-charcoal-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-charcoal-900">Post Ideas</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={regenerateIdeas}
                    disabled={loadingIdeas}
                    className="text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${loadingIdeas ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
                <div className="flex gap-1">
                  {(Object.keys(PLATFORM_CONFIG) as PlatformKey[]).map((platform) => {
                    const config = PLATFORM_CONFIG[platform]
                    const Icon = config.icon
                    const isActive = selectedPlatform === platform
                    const hasIdea = ideas.some((i) => i.platform === platform)

                    return (
                      <button
                        key={platform}
                        onClick={() => setSelectedPlatform(platform)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? `${config.activeBg} text-white`
                            : hasIdea
                            ? `${config.bg} ${config.color}`
                            : 'bg-charcoal-100 text-charcoal-400'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {config.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Idea Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {loadingIdeas ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-ocean-500 animate-spin mb-3" />
                    <p className="text-sm text-charcoal-600">Generating ideas...</p>
                  </div>
                ) : currentIdea ? (
                  <div className="space-y-4">
                    {/* Angle */}
                    <div>
                      <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-1">
                        Angle
                      </p>
                      <p className="text-sm text-charcoal-700">{currentIdea.angle}</p>
                    </div>

                    {/* Hook / Caption Preview */}
                    <div className="rounded-xl bg-white border border-charcoal-200 p-4">
                      <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-2">
                        Opening Hook
                      </p>
                      <p className="text-charcoal-900 font-medium leading-relaxed">
                        {currentIdea.hook}
                      </p>
                    </div>

                    {/* Headline */}
                    {currentIdea.headline && (
                      <div>
                        <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-1">
                          Headline
                        </p>
                        <p className="text-sm font-semibold text-charcoal-900">
                          {currentIdea.headline}
                        </p>
                      </div>
                    )}

                    {/* Hashtags */}
                    {currentIdea.hashtags && currentIdea.hashtags.length > 0 && (
                      <div>
                        <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-2">
                          Suggested Hashtags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {currentIdea.hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full bg-charcoal-100 text-charcoal-600 text-xs"
                            >
                              <Hash className="w-3 h-3 mr-0.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Preview Placeholder */}
                    <div className="rounded-xl bg-charcoal-100 aspect-square flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                        <p className="text-xs text-charcoal-400">
                          Image will be generated in the editor
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-charcoal-100 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-charcoal-400" />
                    </div>
                    <p className="text-sm text-charcoal-600 mb-3">
                      No {PLATFORM_CONFIG[selectedPlatform].label} idea yet
                    </p>
                    <Button size="sm" onClick={regenerateIdeas}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Ideas
                    </Button>
                  </div>
                )}
              </div>

              {/* Create Button */}
              {currentIdea && (
                <div className="p-5 bg-white border-t border-charcoal-100">
                  <Button
                    className="w-full bg-ocean-600 hover:bg-ocean-700 text-white"
                    onClick={() => handleCreatePost(currentIdea)}
                  >
                    Create This Post
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            // No topic selected state
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-charcoal-100 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-charcoal-300" />
                </div>
                <h3 className="font-semibold text-charcoal-900 mb-2">
                  Select a Topic
                </h3>
                <p className="text-sm text-charcoal-500 max-w-xs">
                  Click on any topic from the list to see post ideas and start creating content.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
