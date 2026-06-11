'use client'

import { MapPin, TrendingUp, Calendar, ArrowUpRight, Clock } from 'lucide-react'
import type { InspirationCategory } from '@prisma/client'

interface Topic {
  id: string
  title: string
  summary: string
  category: InspirationCategory
  subcategory?: string
  sourceName?: string
  relevanceScore: number
  trendingScore?: number
  expiresAt?: string
  relatedHashtags: string[]
}

interface TopicCardProps {
  topic: Topic
  onClick: () => void
}

const CATEGORY_CONFIG = {
  AUSTIN_LOCAL: {
    label: 'Austin',
    icon: MapPin,
    chip: 'text-gold-600 bg-gold-600/10 border-gold-600/30 dark:text-gold-400 dark:bg-gold-400/12 dark:border-gold-400/25',
    hoverBorder: 'hover:border-gold-600/30 dark:hover:border-gold-400/25',
  },
  POP_CULTURE: {
    label: 'Trending',
    icon: TrendingUp,
    chip: 'text-coral-600 bg-coral-600/10 border-coral-600/30 dark:text-coral-300 dark:bg-coral-300/12 dark:border-coral-300/25',
    hoverBorder: 'hover:border-coral-600/30 dark:hover:border-coral-300/25',
  },
  SEASONAL: {
    label: 'Seasonal',
    icon: Calendar,
    chip: 'text-teal-600 bg-teal-600/10 border-teal-600/30 dark:text-teal-300 dark:bg-teal-300/12 dark:border-teal-300/25',
    hoverBorder: 'hover:border-teal-600/30 dark:hover:border-teal-300/25',
  },
}

export function TopicCard({ topic, onClick }: TopicCardProps) {
  const config = CATEGORY_CONFIG[topic.category]
  const Icon = config.icon

  // Calculate if topic is expiring soon (within 24 hours)
  const isExpiringSoon =
    topic.expiresAt &&
    new Date(topic.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000

  return (
    <button
      onClick={onClick}
      className={`group relative w-full text-left rounded-[14px] border border-border bg-card p-5 transition-all duration-200 hover:shadow-md ${config.hoverBorder}`}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.chip}`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </div>

        {isExpiringSoon && (
          <div className="flex items-center gap-1 text-coral-600 dark:text-coral-300 text-xs">
            <Clock className="w-3 h-3" />
            Expiring
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
        {topic.title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
        {topic.summary}
      </p>

      {/* Hashtags Preview */}
      {topic.relatedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {topic.relatedHashtags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground text-xs"
            >
              #{tag}
            </span>
          ))}
          {topic.relatedHashtags.length > 3 && (
            <span className="px-2 py-0.5 text-muted-foreground text-xs">
              +{topic.relatedHashtags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {topic.sourceName && (
          <span className="text-xs text-muted-foreground">via {topic.sourceName}</span>
        )}
        <div className="flex items-center gap-1 text-muted-foreground group-hover:text-foreground transition-colors ml-auto">
          <span className="text-xs font-medium">Create Post</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Relevance indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className={`w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center`}
        >
          <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
            {Math.round(topic.relevanceScore * 100)}
          </span>
        </div>
      </div>
    </button>
  )
}
