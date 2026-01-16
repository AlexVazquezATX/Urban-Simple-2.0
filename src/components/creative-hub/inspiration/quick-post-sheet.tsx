'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  X,
  Linkedin,
  Instagram,
  Facebook,
  Twitter,
  Loader2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Hash,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InspirationCategory } from '@prisma/client'

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
  sourceUrl?: string
  sourceName?: string
  postIdeas: object[]
  suggestedHooks: string[]
  relatedHashtags: string[]
}

interface QuickPostSheetProps {
  topic: Topic | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PLATFORM_CONFIG = {
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  facebook: {
    icon: Facebook,
    label: 'Facebook',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  twitter: {
    icon: Twitter,
    label: 'Twitter/X',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
}

export function QuickPostSheet({ topic, open, onOpenChange }: QuickPostSheetProps) {
  const router = useRouter()
  const [ideas, setIdeas] = useState<PostIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<PostIdea | null>(null)

  useEffect(() => {
    if (open && topic) {
      loadIdeas()
    }
  }, [open, topic])

  async function loadIdeas() {
    if (!topic) return

    // Check if topic already has cached ideas
    if (topic.postIdeas && topic.postIdeas.length > 0) {
      setIdeas(topic.postIdeas as PostIdea[])
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `/api/creative-hub/inspiration/topics/${topic.id}/quick-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )
      const data = await response.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Failed to load ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  async function regenerateIdeas() {
    if (!topic) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/creative-hub/inspiration/topics/${topic.id}/quick-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ regenerate: true }),
        }
      )
      const data = await response.json()
      setIdeas(data.ideas || [])
    } catch (error) {
      console.error('Failed to regenerate ideas:', error)
    } finally {
      setLoading(false)
    }
  }

  function useIdea(idea: PostIdea) {
    // Navigate to create page with topic and idea pre-loaded
    const params = new URLSearchParams({
      topicId: topic?.id || '',
      platform: idea.platform,
      headline: idea.headline,
      hook: idea.hook,
    })
    router.push(`/creative-hub/create?${params.toString()}`)
    onOpenChange(false)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={() => onOpenChange(false)}
      />

      {/* Sheet */}
      <div className="fixed right-0 top-0 bottom-0 w-[520px] bg-white shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-charcoal-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-ocean-500" />
                <span className="text-xs font-medium text-ocean-600 uppercase tracking-wide">
                  Quick Post Ideas
                </span>
              </div>
              <h2 className="text-lg font-semibold text-charcoal-900 line-clamp-2">
                {topic?.title}
              </h2>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-charcoal-100 hover:bg-charcoal-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-charcoal-500" />
            </button>
          </div>

          {/* Topic Summary */}
          <p className="text-sm text-charcoal-600 mt-2">{topic?.summary}</p>

          {/* Source Link */}
          {topic?.sourceUrl && (
            <a
              href={topic.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ocean-600 hover:text-ocean-700 mt-2"
            >
              <ExternalLink className="w-3 h-3" />
              {topic.sourceName || 'View Source'}
            </a>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-ocean-500 animate-spin mb-4" />
              <p className="text-charcoal-600">Generating post ideas...</p>
            </div>
          ) : ideas.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-charcoal-900">
                  {ideas.length} Post Ideas
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerateIdeas}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              </div>

              {ideas.map((idea, index) => {
                const platformConfig = PLATFORM_CONFIG[idea.platform]
                const Icon = platformConfig?.icon || Instagram

                return (
                  <div
                    key={index}
                    className={`rounded-xl border ${
                      selectedIdea === idea
                        ? 'border-ocean-300 bg-ocean-50/50'
                        : 'border-charcoal-100 hover:border-charcoal-200'
                    } p-4 transition-all cursor-pointer`}
                    onClick={() => setSelectedIdea(idea)}
                  >
                    {/* Platform Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${platformConfig?.bg} ${platformConfig?.color} text-xs font-medium`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {platformConfig?.label}
                      </div>
                    </div>

                    {/* Angle */}
                    <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-1">
                      Angle
                    </p>
                    <p className="text-sm text-charcoal-700 mb-3">{idea.angle}</p>

                    {/* Hook */}
                    <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-1">
                      Opening Hook
                    </p>
                    <p className="text-charcoal-900 font-medium mb-3">
                      &ldquo;{idea.hook}&rdquo;
                    </p>

                    {/* Hashtags */}
                    {idea.hashtags && idea.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {idea.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-0.5 rounded-full bg-charcoal-100 text-charcoal-600 text-xs"
                          >
                            <Hash className="w-3 h-3 mr-0.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Use Button */}
                    <Button
                      className="w-full mt-4 bg-charcoal-900 hover:bg-charcoal-800 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        useIdea(idea)
                      }}
                    >
                      Use This Idea
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-charcoal-100 flex items-center justify-center mb-4">
                <Sparkles className="w-7 h-7 text-charcoal-400" />
              </div>
              <p className="text-charcoal-600 mb-4">
                No ideas generated yet. Click below to create some!
              </p>
              <Button onClick={loadIdeas}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Ideas
              </Button>
            </div>
          )}
        </div>

        {/* Suggested Hooks Section */}
        {topic?.suggestedHooks && topic.suggestedHooks.length > 0 && (
          <div className="p-5 border-t border-charcoal-100 bg-charcoal-50">
            <p className="text-xs text-charcoal-500 uppercase tracking-wide mb-2">
              More Hook Ideas
            </p>
            <div className="space-y-2">
              {topic.suggestedHooks.map((hook, index) => (
                <p key={index} className="text-sm text-charcoal-700">
                  &ldquo;{hook}&rdquo;
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
