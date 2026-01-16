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
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600',
    border: 'border-orange-100 hover:border-orange-200',
  },
  POP_CULTURE: {
    label: 'Trending',
    icon: TrendingUp,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-600',
    border: 'border-purple-100 hover:border-purple-200',
  },
  SEASONAL: {
    label: 'Seasonal',
    icon: Calendar,
    gradient: 'from-teal-500 to-cyan-500',
    bgGradient: 'from-teal-50 to-cyan-50',
    iconBg: 'bg-teal-500/10',
    iconColor: 'text-teal-600',
    border: 'border-teal-100 hover:border-teal-200',
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
      className={`group relative w-full text-left rounded-2xl border bg-gradient-to-br ${config.bgGradient} ${config.border} p-5 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]`}
    >
      {/* Category Badge */}
      <div className="flex items-center justify-between mb-3">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-white text-xs font-medium`}
        >
          <Icon className="w-3 h-3" />
          {config.label}
        </div>

        {isExpiringSoon && (
          <div className="flex items-center gap-1 text-amber-600 text-xs">
            <Clock className="w-3 h-3" />
            Expiring
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-charcoal-900 mb-2 line-clamp-2 group-hover:text-charcoal-700">
        {topic.title}
      </h3>

      {/* Summary */}
      <p className="text-sm text-charcoal-600 line-clamp-2 mb-4">
        {topic.summary}
      </p>

      {/* Hashtags Preview */}
      {topic.relatedHashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {topic.relatedHashtags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full bg-white/70 text-charcoal-500 text-xs"
            >
              #{tag}
            </span>
          ))}
          {topic.relatedHashtags.length > 3 && (
            <span className="px-2 py-0.5 text-charcoal-400 text-xs">
              +{topic.relatedHashtags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        {topic.sourceName && (
          <span className="text-xs text-charcoal-400">via {topic.sourceName}</span>
        )}
        <div className="flex items-center gap-1 text-charcoal-400 group-hover:text-charcoal-600 transition-colors ml-auto">
          <span className="text-xs font-medium">Create Post</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Relevance indicator */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center`}
        >
          <span className="text-xs font-bold text-charcoal-700">
            {Math.round(topic.relevanceScore * 100)}
          </span>
        </div>
      </div>
    </button>
  )
}
