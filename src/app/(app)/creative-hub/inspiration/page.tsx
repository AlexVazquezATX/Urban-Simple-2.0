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
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import type { InspirationCategory, InspirationStatus } from '@prisma/client'

// Content mode types
type ContentModeId = 'community' | 'hybrid' | 'promotional'

const CONTENT_MODES = {
  community: {
    id: 'community',
    name: 'Community',
    description: 'Pure Austin content - no business pitch',
    icon: Heart,
    color: 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400',
    detail: 'NO cleaning mentions, NO CTAs, NO sales pitch. Just celebrating Austin.',
  },
  hybrid: {
    id: 'hybrid',
    name: 'Soft Brand',
    description: 'Community-focused with subtle presence',
    icon: Building2,
    color: 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400',
    detail: 'May mention hospitality industry, but no hard sell.',
  },
  promotional: {
    id: 'promotional',
    name: 'Promotional',
    description: 'Standard marketing with CTAs',
    icon: Megaphone,
    color: 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400',
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
    tile: 'bg-gold-600/10 text-gold-600 dark:bg-gold-400/12 dark:text-gold-400',
    badge: 'gold' as const,
  },
  POP_CULTURE: {
    label: 'Pop Culture',
    icon: TrendingUp,
    tile: 'bg-coral-600/10 text-coral-600 dark:bg-coral-300/12 dark:text-coral-300',
    badge: 'coral' as const,
  },
  SEASONAL: {
    label: 'Seasonal',
    icon: Calendar,
    tile: 'bg-teal-600/10 text-teal-600 dark:bg-teal-300/12 dark:text-teal-300',
    badge: 'teal' as const,
  },
}

const PLATFORM_TAB_STYLES = {
  active:
    'bg-gold-600/10 border border-gold-600/30 text-gold-600 dark:bg-gold-400/12 dark:border-gold-400/25 dark:text-gold-400',
  hasIdea:
    'bg-teal-600/10 border border-teal-600/30 text-teal-600 dark:bg-teal-300/12 dark:border-teal-300/25 dark:text-teal-300',
  idle: 'bg-secondary border border-transparent text-muted-foreground/70',
}

const PLATFORM_CONFIG = {
  instagram: {
    icon: Instagram,
    label: 'Instagram',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
  },
  facebook: {
    icon: Facebook,
    label: 'Facebook',
  },
  twitter: {
    icon: Twitter,
    label: 'X',
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
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* LEFT COLUMN - Topics List */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-border bg-card">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <PageHeader
              kicker={`CREATIVE HUB · ${new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}`}
              title={briefing?.headline || `${timeGreeting}!`}
              subtitle={
                briefing?.greeting ||
                (topics.length > 0
                  ? `${topics.length} topics ready to inspire your content today`
                  : 'Click refresh to discover trending topics')
              }
              className="mb-0"
              actions={
                <>
                  {/* Content Mode Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowModeSelector(!showModeSelector)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    {CONTENT_MODES[contentMode].name}
                  </Button>

                  <Button
                    variant="gold"
                    onClick={generateTopics}
                    disabled={generating}
                    size="sm"
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
                </>
              }
            />

            {/* Content Mode Selector */}
            {showModeSelector && (
              <div className="mt-4 rounded-[14px] border border-border bg-card p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-foreground">Content Mode</h3>
                  <button
                    onClick={() => setShowModeSelector(false)}
                    className="w-6 h-6 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground flex items-center justify-center"
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
                        className={`p-3 rounded-[12px] border-2 text-left transition-all ${
                          isSelected
                            ? 'border-gold-600/50 bg-gold-600/10 dark:border-gold-400/40 dark:bg-gold-400/12'
                            : 'border-border hover:border-gold-600/30 dark:hover:border-gold-400/25'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-[10px] ${mode.color} flex items-center justify-center mb-2`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="font-medium text-sm text-foreground">{mode.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{mode.description}</p>
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                      isActive
                        ? 'text-gold-600 bg-gold-600/10 border-gold-600/30 dark:text-gold-400 dark:bg-gold-400/12 dark:border-gold-400/25'
                        : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat === 'ALL' ? 'All' : config?.label}
                    <span
                      className={`px-1.5 py-0.5 rounded-full font-mono tabular-nums text-xs ${
                        isActive ? 'bg-gold-600/15 dark:bg-gold-400/15' : 'bg-background'
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
              <div className="px-4 py-3 bg-coral-600/10 border border-coral-600/30 dark:bg-coral-300/12 dark:border-coral-300/25 rounded-[14px]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-coral-600/15 dark:bg-coral-300/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-4 h-4 text-coral-600 dark:text-coral-300" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-coral-600 dark:text-coral-300">Failed to generate topics</p>
                    <p className="text-sm text-muted-foreground mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {topics.length === 0 && !generating && !error && (
              <EmptyState
                icon={Sparkles}
                title="No topics yet for today"
                description="Click Refresh to discover trending Austin news, pop culture moments, and seasonal content ideas."
                className="py-16"
                action={
                  <Button variant="outline" onClick={generateTopics}>
                    <Zap className="w-4 h-4 mr-2" />
                    Discover Topics
                  </Button>
                }
              />
            )}

            {/* Generating State */}
            {generating && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-[16px] bg-gold-600/10 dark:bg-gold-400/12 flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="w-7 h-7 text-gold-600 dark:text-gold-400 animate-spin" />
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground mb-2">
                  Discovering topics...
                </h2>
                <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                  AI is searching Austin news, trending topics, and seasonal events.
                </p>
              </div>
            )}

            {/* Pending Approval Section */}
            {pendingTopics.length > 0 && (
              <div className="rounded-[14px] border border-gold-600/30 bg-gold-600/5 dark:border-gold-400/25 dark:bg-gold-400/5 overflow-hidden">
                <button
                  onClick={() => setPendingExpanded(!pendingExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gold-600/10 dark:hover:bg-gold-400/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gold-600 dark:bg-gold-400 animate-pulse" />
                    <span className="font-medium text-foreground text-sm">
                      {pendingTopics.length} topics need your review
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform ${
                      pendingExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {pendingExpanded && (
                  <div className="divide-y divide-gold-600/15 dark:divide-gold-400/15">
                    {pendingTopics.slice(0, pendingLimit).map((topic) => {
                      const config = CATEGORY_CONFIG[topic.category]
                      const Icon = config.icon

                      return (
                        <div
                          key={topic.id}
                          onClick={() => handleTopicClick(topic)}
                          className={`px-4 py-3 flex items-center gap-3 hover:bg-gold-600/10 dark:hover:bg-gold-400/10 transition-colors cursor-pointer ${
                            selectedTopic?.id === topic.id ? 'bg-gold-600/15 dark:bg-gold-400/15' : ''
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-[10px] ${config.tile} flex items-center justify-center flex-shrink-0`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {topic.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {topic.summary}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => handleApprove(topic.id, e)}
                              className="w-7 h-7 rounded-full bg-green-600/12 hover:bg-green-600/20 dark:bg-green-300/12 dark:hover:bg-green-300/20 flex items-center justify-center text-green-600 dark:text-green-300 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleReject(topic.id, e)}
                              className="w-7 h-7 rounded-full bg-coral-600/10 hover:bg-coral-600/20 dark:bg-coral-300/12 dark:hover:bg-coral-300/20 flex items-center justify-center text-coral-600 dark:text-coral-300 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      )
                    })}

                    {pendingTopics.length > pendingLimit && (
                      <button
                        onClick={() => setPendingLimit((prev) => prev + 10)}
                        className="w-full px-4 py-2 text-sm text-gold-600 dark:text-gold-400 hover:bg-gold-600/10 dark:hover:bg-gold-400/10 transition-colors"
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
                  <h2 className="text-sm font-display font-semibold text-foreground">
                    Ready to Create
                  </h2>
                  <div className="flex items-center gap-2">
                    {isSelectionMode && selectedTopicIds.size > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearSelection}
                        className="text-xs"
                      >
                        Clear ({selectedTopicIds.size})
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isSelectionMode ? 'secondary' : 'outline'}
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode)
                        if (isSelectionMode) {
                          setSelectedTopicIds(new Set())
                        }
                      }}
                    >
                      <Layers className="w-3.5 h-3.5 mr-1.5" />
                      {isSelectionMode ? 'Done' : 'Select Multiple'}
                    </Button>
                  </div>
                </div>

                {/* Batch Create Bar */}
                {isSelectionMode && selectedTopicIds.size >= 2 && (
                  <div className="mb-3 px-4 py-3 bg-gold-600/10 border border-gold-600/30 dark:bg-gold-400/12 dark:border-gold-400/25 rounded-[14px] flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gold-600 dark:text-gold-400">
                      <CheckSquare className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        <span className="font-mono tabular-nums">{selectedTopicIds.size}</span> topics selected
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="gold"
                      onClick={handleBatchCreate}
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
                        className={`relative text-left rounded-[12px] border-2 p-4 transition-all cursor-pointer ${
                          isChecked
                            ? 'border-gold-600/50 bg-gold-600/10 ring-2 ring-gold-600/20 dark:border-gold-400/40 dark:bg-gold-400/12 dark:ring-gold-400/20'
                            : isSelected
                            ? 'border-gold-600/50 bg-gold-600/10 dark:border-gold-400/40 dark:bg-gold-400/12'
                            : 'border-border hover:border-gold-600/30 dark:hover:border-gold-400/25 bg-card'
                        }`}
                      >
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                          <button
                            onClick={(e) => toggleTopicSelection(topic.id, e)}
                            className={`absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isChecked
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {isChecked ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Square className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        <Badge variant={config.badge} className="mb-2">
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <h3 className="font-semibold text-foreground text-sm line-clamp-2 mb-1 pr-6">
                          {topic.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {topic.summary}
                        </p>
                        {topic.relatedHashtags && topic.relatedHashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {topic.relatedHashtags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs text-muted-foreground"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {topic.sourceName && (
                          <p className="text-xs text-muted-foreground mt-2">
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
        <div className="w-[420px] flex flex-col bg-background">
          {selectedTopic ? (
            <>
              {/* Topic Header */}
              <div className="p-5 bg-card border-b border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-gold-600 dark:text-gold-400" />
                  <span className="kicker text-primary">
                    Selected Topic
                  </span>
                </div>
                <h2 className="font-display text-lg font-semibold text-foreground line-clamp-2">
                  {selectedTopic.title}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedTopic.summary}
                </p>
                {selectedTopic.sourceUrl && (
                  <a
                    href={selectedTopic.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80 mt-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {selectedTopic.sourceName || 'View Source'}
                  </a>
                )}
              </div>

              {/* Platform Tabs */}
              <div className="px-5 pt-4 pb-2 bg-card border-b border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-foreground">Post Ideas</h3>
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-medium transition-all ${
                          isActive
                            ? PLATFORM_TAB_STYLES.active
                            : hasIdea
                            ? PLATFORM_TAB_STYLES.hasIdea
                            : PLATFORM_TAB_STYLES.idle
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
                    <Loader2 className="w-6 h-6 text-gold-600 dark:text-gold-400 animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Generating ideas...</p>
                  </div>
                ) : currentIdea ? (
                  <div className="space-y-4">
                    {/* Angle */}
                    <div>
                      <p className="kicker text-muted-foreground mb-1">
                        Angle
                      </p>
                      <p className="text-sm text-foreground">{currentIdea.angle}</p>
                    </div>

                    {/* Hook / Caption Preview */}
                    <div className="rounded-[12px] bg-card border border-border p-4">
                      <p className="kicker text-muted-foreground mb-2">
                        Opening Hook
                      </p>
                      <p className="text-foreground font-medium leading-relaxed">
                        {currentIdea.hook}
                      </p>
                    </div>

                    {/* Headline */}
                    {currentIdea.headline && (
                      <div>
                        <p className="kicker text-muted-foreground mb-1">
                          Headline
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {currentIdea.headline}
                        </p>
                      </div>
                    )}

                    {/* Hashtags */}
                    {currentIdea.hashtags && currentIdea.hashtags.length > 0 && (
                      <div>
                        <p className="kicker text-muted-foreground mb-2">
                          Suggested Hashtags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {currentIdea.hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-1 rounded-full bg-secondary border border-border text-muted-foreground text-xs font-semibold"
                            >
                              <Hash className="w-3 h-3 mr-0.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Image Preview Placeholder */}
                    <div className="rounded-[12px] bg-secondary aspect-square flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Image will be generated in the editor
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-[12px] bg-gold-600/10 dark:bg-gold-400/12 flex items-center justify-center mb-3">
                      <Sparkles className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      No {PLATFORM_CONFIG[selectedPlatform].label} idea yet
                    </p>
                    <Button size="sm" variant="outline" onClick={regenerateIdeas}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Ideas
                    </Button>
                  </div>
                )}
              </div>

              {/* Create Button */}
              {currentIdea && (
                <div className="p-5 bg-card border-t border-border">
                  <Button
                    variant="gold"
                    className="w-full"
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
              <EmptyState
                icon={Sparkles}
                title="Select a topic"
                description="Click on any topic from the list to see post ideas and start creating content."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
