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
import { PageHeader } from '@/components/layout/page-header'
import { EmptyState } from '@/components/ui/empty-state'
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
  Plus,
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

  const currentBriefing = localBriefing

  // No briefing state
  if (!currentBriefing) {
    return (
      <div className="py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <PageHeader
            kicker="PULSE · DAILY BRIEFING"
            title={`Good ${getTimeOfDay()}, ${userName}`}
            subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}
            actions={
              <>
                <Link href="/pulse/archive">
                  <Button variant="outline">
                    <Calendar className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </Link>
                <Link href="/pulse/topics">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Topics
                  </Button>
                </Link>
              </>
            }
          />

          {/* Empty State */}
          <Card className="overflow-hidden">
            <CardContent className="py-16">
              <EmptyState
                icon={Sparkles}
                title="Your daily briefing awaits"
                description={
                  topicsCount === 0
                    ? 'Add a few topics and Pulse will curate a personal briefing for you every morning.'
                    : `Pulse will curate fresh insights across your ${topicsCount} active topic${topicsCount !== 1 ? 's' : ''}.`
                }
                action={
                  topicsCount === 0 ? (
                    <Link href="/pulse/topics">
                      <Button variant="gold" size="lg" className="px-8">
                        <Plus className="h-5 w-5 mr-2" />
                        Add Topics
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="gold"
                      size="lg"
                      className="px-8"
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
                  )
                }
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
  }

  // Generating state
  if (currentBriefing.status === 'generating') {
    return (
      <div className="py-8 md:py-12">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <div>
              <h1 className="font-display text-2xl font-semibold text-foreground">Generating Your Briefing...</h1>
              <p className="text-muted-foreground">This may take a minute</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
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
    )
  }

  // Failed state
  if (currentBriefing.status === 'failed') {
    return (
      <div className="py-8 md:py-12">
        <Card className="mx-auto max-w-2xl border-coral-600/30 bg-coral-600/10 dark:border-coral-300/25 dark:bg-coral-300/12">
          <CardContent className="py-16 text-center space-y-6">
            <h2 className="font-display text-xl font-semibold text-coral-600 dark:text-coral-300">
              Generation Failed
            </h2>
            <p className="text-muted-foreground">
              {currentBriefing.errorMessage || 'Something went wrong while generating your briefing.'}
            </p>
            <Button variant="outline" size="lg" onClick={() => handleGenerate(true)} disabled={generating}>
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
    <div className="py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8"
      >
        <PageHeader
          kicker={`PULSE · ${format(new Date(currentBriefing.date), 'EEEE, MMMM d')}`}
          title={currentBriefing.title || format(new Date(currentBriefing.date), 'EEEE, MMMM d')}
          subtitle="Your personalized daily briefing"
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={generating}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', generating && 'animate-spin')} />
                Refresh
              </Button>
              <Link href="/pulse/archive">
                <Button variant="ghost">
                  <Calendar className="h-4 w-4 mr-2" />
                  Archive
                </Button>
              </Link>
              <Link href="/pulse/topics">
                <Button variant="ghost">
                  <Settings className="h-4 w-4 mr-2" />
                  Topics
                </Button>
              </Link>
            </>
          }
        />

        {/* Greeting & Summary */}
        {(currentBriefing.greeting || currentBriefing.summary) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="py-4 px-6">
                {currentBriefing.greeting && (
                  <p className="font-display text-lg font-medium text-foreground mb-4">
                    {currentBriefing.greeting}
                  </p>
                )}
                {currentBriefing.summary && (
                  <div>
                    <button
                      onClick={() => setExpandedSummary(!expandedSummary)}
                      className="kicker flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
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
                          className="text-muted-foreground mt-3 leading-relaxed"
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
            <Card className="border-gold-600/30 bg-gold-600/10 dark:border-gold-400/25 dark:bg-gold-400/12">
              <CardContent className="py-3 px-6">
                <div className="flex items-center gap-3">
                  <Quote className="h-4 w-4 text-gold-600 dark:text-gold-400 shrink-0" />
                  <p className="italic text-sm text-foreground/80 font-display">
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
            <h2 className="font-display text-lg font-semibold text-foreground">Today's Insights</h2>
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
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-gold-600 dark:text-gold-400" />
              <h2 className="font-display text-lg font-semibold text-foreground">Business Snapshot</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {businessItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.05 }}
                >
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {item.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
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
          <p className="text-center text-sm text-muted-foreground pt-8 font-mono tabular-nums">
            Generated {format(new Date(currentBriefing.generatedAt), 'h:mm a')} using {currentBriefing.aiModel || 'Gemini'}
            {currentBriefing.generationTime && (
              <> in {(currentBriefing.generationTime / 1000).toFixed(1)}s</>
            )}
          </p>
        )}
      </motion.div>
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
        <Card className="overflow-hidden group cursor-pointer transition-colors hover:border-primary/40 h-full flex flex-col">
          {/* Image/Gradient Header */}
          <div className={`relative h-48 bg-gradient-to-br ${gradient} overflow-hidden`}>
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
              className="absolute top-3 right-3 p-2 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-colors"
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
                <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs">
                  {item.topic.name}
                </Badge>
              </div>
            )}
          </div>

          {/* Content */}
          <CardContent className="p-5 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              {item.sentiment === 'positive' && (
                <Badge variant="green">Positive</Badge>
              )}
              {item.sentiment === 'negative' && (
                <Badge variant="coral">Negative</Badge>
              )}
            </div>

            <h3 className="font-display font-medium text-lg leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {item.title}
            </h3>

            <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">
              {item.summary}
            </p>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                {item.sourceName || 'AI Curated'}
              </span>
              <span className="text-xs text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
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
