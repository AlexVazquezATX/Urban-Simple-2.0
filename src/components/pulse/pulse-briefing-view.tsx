'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  RefreshCw,
  Settings,
  Calendar,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Quote,
  Brain,
  Plus,
  Sun,
  Sunrise,
  Moon,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PulseBriefing, PulseBriefingItem, PulseTopic } from '@prisma/client'

interface BriefingWithItems extends PulseBriefing {
  items: (PulseBriefingItem & {
    topic: Pick<PulseTopic, 'id' | 'name' | 'category'> | null
  })[]
}

interface PulseBriefingViewProps {
  briefing: BriefingWithItems | null
  topicsCount: number
  userName: string
}

// Parse gradient from imagePrompt field
function parseGradient(imagePrompt: string | null, category: string | null): string {
  if (imagePrompt && imagePrompt.includes('|')) {
    return imagePrompt.split('|')[0]
  }
  // Fallback gradients by category
  const fallbacks: Record<string, string> = {
    tech: 'from-blue-600 via-indigo-600 to-purple-700',
    business: 'from-emerald-600 via-teal-600 to-cyan-700',
    local: 'from-orange-500 via-amber-500 to-yellow-600',
    industry: 'from-rose-600 via-pink-600 to-fuchsia-700',
    personal: 'from-violet-600 via-purple-600 to-indigo-700',
    general: 'from-slate-600 via-gray-600 to-zinc-700',
  }
  return fallbacks[category || 'general'] || fallbacks.general
}

export function PulseBriefingView({
  briefing,
  topicsCount,
  userName,
}: PulseBriefingViewProps) {
  const [generating, setGenerating] = useState(false)
  const [expandedSummary, setExpandedSummary] = useState(true)
  const [localBriefing, setLocalBriefing] = useState(briefing)
  const router = useRouter()

  const handleGenerate = async (forceRegenerate = false) => {
    if (topicsCount === 0) {
      toast.error('Please add at least one topic first')
      router.push('/pulse/topics')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/admin/pulse/briefings/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate briefing')
      }

      setLocalBriefing(data.briefing)

      const itemCount = data.generation?.itemsGenerated || 0
      const errors = data.generation?.errors || []

      if (errors.length > 0) {
        console.error('Generation errors:', errors)
        toast.warning(
          `Briefing generated with ${itemCount} items, but ${errors.length} error(s) occurred.`
        )
      } else {
        toast.success(`Briefing generated! ${itemCount} items created.`)
      }

      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setGenerating(false)
    }
  }

  const getTimeIcon = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return <Sunrise className="h-6 w-6 text-orange-400" />
    if (hour >= 12 && hour < 18) return <Sun className="h-6 w-6 text-yellow-400" />
    return <Moon className="h-6 w-6 text-blue-400" />
  }

  const currentBriefing = localBriefing

  // No briefing state
  if (!currentBriefing) {
    return (
      <div className="min-h-screen bg-warm-50">
        <div className="container mx-auto py-12 px-4 max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-12"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {getTimeIcon()}
                <div>
                  <h1 className="text-2xl md:text-3xl font-display font-medium tracking-tight text-warm-900">
                    Good {getTimeOfDay()}, {userName}
                  </h1>
                  <p className="text-warm-500 text-base">
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/pulse/archive">
                  <Button variant="outline" className="rounded-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </Link>
                <Link href="/pulse/topics">
                  <Button variant="outline" className="rounded-sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Topics
                  </Button>
                </Link>
              </div>
            </div>

            {/* Empty State */}
            <Card className="rounded-sm border-warm-200 bg-white overflow-hidden">
              <CardContent className="py-20">
                <div className="text-center space-y-8 max-w-lg mx-auto">
                  <div className="relative mx-auto w-24 h-24">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0"
                    >
                      <Sparkles className="h-24 w-24 text-warm-200" />
                    </motion.div>
                    <Brain className="h-14 w-14 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-ocean-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-medium text-warm-900">
                      Your Daily Briefing Awaits
                    </h2>
                    <p className="text-warm-500 mt-3 text-base">
                      {topicsCount === 0
                        ? 'Add some topics to get personalized content delivered to you each day.'
                        : 'Generate your personalized briefing with AI-curated insights on your topics.'}
                    </p>
                  </div>
                  <div className="flex justify-center gap-4">
                    {topicsCount === 0 ? (
                      <Link href="/pulse/topics">
                        <Button variant="lime" size="lg" className="rounded-sm px-8">
                          <Plus className="h-5 w-5 mr-2" />
                          Add Topics
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="lime"
                        size="lg"
                        className="rounded-sm px-8"
                        onClick={() => handleGenerate()}
                        disabled={generating}
                      >
                        {generating ? (
                          <>
                            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 mr-2" />
                            Generate Briefing
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {topicsCount > 0 && (
                    <p className="text-sm text-warm-400">
                      {topicsCount} active topic{topicsCount !== 1 ? 's' : ''} configured
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    )
  }

  // Generating state
  if (currentBriefing.status === 'generating') {
    return (
      <div className="min-h-screen bg-warm-50">
        <div className="container mx-auto py-12 px-4 max-w-7xl">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <RefreshCw className="h-6 w-6 animate-spin text-ocean-600" />
              <div>
                <h1 className="text-2xl font-display font-medium text-warm-900">Generating Your Briefing...</h1>
                <p className="text-warm-500">This may take a minute</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden rounded-sm border-warm-200">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Failed state
  if (currentBriefing.status === 'failed') {
    return (
      <div className="min-h-screen bg-warm-50">
        <div className="container mx-auto py-12 px-4 max-w-7xl">
          <Card className="rounded-sm border-red-200 bg-red-50 max-w-2xl mx-auto">
            <CardContent className="py-16 text-center space-y-6">
              <h2 className="text-xl font-display font-medium text-red-700">
                Generation Failed
              </h2>
              <p className="text-warm-600">
                {currentBriefing.errorMessage || 'Something went wrong while generating your briefing.'}
              </p>
              <Button variant="outline" size="lg" className="rounded-sm" onClick={() => handleGenerate(true)} disabled={generating}>
                {generating ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Try Again
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Success - show briefing
  const businessItems = currentBriefing.items.filter(
    (item) => item.itemType === 'business_kpi'
  )
  const contentItems = currentBriefing.items.filter(
    (item) => item.itemType !== 'business_kpi'
  )

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="container mx-auto py-8 md:py-12 px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {getTimeIcon()}
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-medium tracking-tight text-warm-900">
                  {currentBriefing.title || format(new Date(currentBriefing.date), 'EEEE, MMMM d')}
                </h1>
                <p className="text-warm-500">
                  Your personalized daily briefing
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-sm"
                onClick={() => handleGenerate(true)}
                disabled={generating}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', generating && 'animate-spin')} />
                Refresh
              </Button>
              <Link href="/pulse/archive">
                <Button variant="outline" className="rounded-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </Link>
              <Link href="/pulse/topics">
                <Button variant="outline" className="rounded-sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Topics
                </Button>
              </Link>
            </div>
          </div>

          {/* Greeting & Summary */}
          {(currentBriefing.greeting || currentBriefing.summary) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="rounded-sm border-warm-200 bg-white">
                <CardContent className="py-4 px-6">
                  {currentBriefing.greeting && (
                    <p className="text-lg font-display font-medium text-warm-800 mb-4">
                      {currentBriefing.greeting}
                    </p>
                  )}
                  {currentBriefing.summary && (
                    <div>
                      <button
                        onClick={() => setExpandedSummary(!expandedSummary)}
                        className="flex items-center gap-2 text-sm text-warm-500 hover:text-warm-700 transition-colors"
                      >
                        {expandedSummary ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        Executive Summary
                      </button>
                      <AnimatePresence>
                        {expandedSummary && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-warm-600 mt-3 leading-relaxed"
                          >
                            {currentBriefing.summary}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Inspiration Quote */}
          {currentBriefing.inspirationQuote && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card className="rounded-sm border-lime-200 bg-lime-50/50">
                <CardContent className="py-3 px-6">
                  <div className="flex items-center gap-3">
                    <Quote className="h-4 w-4 text-lime-600 shrink-0" />
                    <p className="italic text-sm text-warm-600 font-display">
                      {currentBriefing.inspirationQuote}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Content Items - Magazine Grid */}
          {contentItems.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-display font-medium text-warm-900">Today's Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contentItems.map((item, index) => (
                  <InsightCard
                    key={item.id}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Business Insights - at bottom */}
          {businessItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-4"
            >
              <Separator className="my-4 bg-warm-200" />
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-lime-600" />
                <h2 className="text-lg font-display font-medium text-warm-900">Business Snapshot</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {businessItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 + index * 0.05 }}
                  >
                    <Card className="h-full rounded-sm border-warm-200 hover:border-ocean-400 transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium text-warm-900">
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-warm-600 leading-relaxed">
                          {item.summary}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Footer */}
          {currentBriefing.generatedAt && (
            <p className="text-center text-sm text-warm-400 pt-8">
              Generated {format(new Date(currentBriefing.generatedAt), 'h:mm a')} using {currentBriefing.aiModel || 'Gemini'}
              {currentBriefing.generationTime && (
                <> in {(currentBriefing.generationTime / 1000).toFixed(1)}s</>
              )}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function InsightCard({
  item,
  index,
}: {
  item: PulseBriefingItem & {
    topic: Pick<PulseTopic, 'id' | 'name' | 'category'> | null
  }
  index: number
}) {
  const [bookmarked, setBookmarked] = useState(item.isBookmarked)
  const gradient = parseGradient(item.imagePrompt, item.category)

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setBookmarked(!bookmarked)
    try {
      await fetch(`/api/admin/pulse/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBookmarked: !bookmarked }),
      })
    } catch (error) {
      setBookmarked(bookmarked)
      toast.error('Failed to update bookmark')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.05 }}
    >
      <Link href={`/pulse/item/${item.id}`}>
        <Card className="overflow-hidden group cursor-pointer rounded-sm border-warm-200 hover:border-ocean-400 transition-colors h-full flex flex-col">
          {/* Image/Gradient Header */}
          <div className={`relative h-48 bg-gradient-to-br ${gradient} rounded-t-sm overflow-hidden`}>
            {item.imageBase64 ? (
              <img
                src={`data:image/png;base64,${item.imageBase64}`}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="h-16 w-16 text-white/30" />
              </div>
            )}

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Bookmark button */}
            <button
              onClick={handleBookmark}
              className="absolute top-3 right-3 p-2 rounded-sm bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </button>

            {/* Topic badge */}
            {item.topic && (
              <div className="absolute bottom-3 left-3">
                <Badge className="rounded-sm bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs">
                  {item.topic.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              {item.sentiment === 'positive' && (
                <Badge variant="secondary" className="rounded-sm text-xs bg-lime-50 text-lime-700 border-lime-200">
                  Positive
                </Badge>
              )}
              {item.sentiment === 'negative' && (
                <Badge variant="secondary" className="rounded-sm text-xs bg-red-50 text-red-600 border-red-200">
                  Negative
                </Badge>
              )}
            </div>

            <h3 className="font-display font-medium text-lg leading-tight line-clamp-2 text-warm-900 group-hover:text-ocean-600 transition-colors">
              {item.title}
            </h3>

            <p className="text-sm text-warm-500 mt-3 line-clamp-3 flex-1">
              {item.summary}
            </p>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-warm-100">
              <span className="text-xs text-warm-400">
                {item.sourceName || 'AI Curated'}
              </span>
              <span className="text-xs text-ocean-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                Read more
                <ArrowRight className="h-3 w-3" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

function getTimeOfDay(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  return 'evening'
}
